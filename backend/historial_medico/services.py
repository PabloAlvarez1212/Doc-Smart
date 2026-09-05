from django.db import IntegrityError, transaction

from citas.models import Cita
from historial_medico.models import HistorialClinico, VersionHistorialClinico
from historial_medico.serializers import (
    HistorialClinicoDetalleSerializer,
    HistorialClinicoSerializer,
)
from medicos.models import Medico
from users.models import Usuario


ESTADO_CITA_COMPLETADA = 'completada'
CAMPOS_CLINICOS = (
    'diagnostico_general',
    'observaciones',
    'motivo_consulta',
)


def _cita_esta_completada(cita):
    return cita.id_estado.nombre.strip().casefold() == ESTADO_CITA_COMPLETADA


def _crear_version(historial, version, medico_editor, motivo_cambio, valores=None):
    valores = valores or {
        campo: getattr(historial, campo)
        for campo in CAMPOS_CLINICOS
    }
    return VersionHistorialClinico.objects.create(
        historial=historial,
        version=version,
        diagnostico_general=valores['diagnostico_general'],
        observaciones=valores['observaciones'],
        motivo_consulta=valores['motivo_consulta'],
        motivo_cambio=motivo_cambio,
        medico_editor=medico_editor,
    )


def crearHistorialService(datos, medico):
    if not isinstance(medico, Medico):
        return 'No tienes permiso para crear historiales', 403

    try:
        with transaction.atomic():
            cita = (
                Cita.objects.select_for_update()
                .select_related('id_estado', 'id_usuario')
                .filter(id=datos['cita_id'], id_medico=medico)
                .first()
            )

            if not cita:
                return 'Cita no encontrada', 404

            if not _cita_esta_completada(cita):
                return 'La cita debe estar completada para crear el historial', 400

            if HistorialClinico.objects.filter(cita=cita).exists():
                return 'Esta cita ya tiene un historial registrado', 400

            historial = HistorialClinico.objects.create(
                diagnostico_general=datos['diagnostico_general'],
                motivo_consulta=datos['motivo_consulta'],
                observaciones=datos.get('observaciones', ''),
                cita=cita,
                usuario=cita.id_usuario,
                medico=medico,
            )
            _crear_version(
                historial=historial,
                version=1,
                medico_editor=medico,
                motivo_cambio='Creación inicial del historial clínico',
            )
    except IntegrityError:
        return 'Esta cita ya tiene un historial registrado', 400

    serializer = HistorialClinicoDetalleSerializer(historial)
    return serializer.data, 201


def listarHistorialesPacienteService(usuario):
    if not isinstance(usuario, Usuario):
        return 'No tienes permiso para consultar estos historiales', 403

    historiales = HistorialClinico.objects.filter(usuario=usuario).select_related(
        'usuario', 'medico'
    )

    if not historiales.exists():
        return 'No se encontraron historiales', 404

    serializer = HistorialClinicoSerializer(historiales, many=True)
    return serializer.data, 200


def listarHistorialesMedicoService(medico):
    if not isinstance(medico, Medico):
        return 'No tienes permiso para consultar estos historiales', 403

    historiales = HistorialClinico.objects.filter(medico=medico).select_related(
        'usuario', 'medico'
    )

    if not historiales.exists():
        return 'No se encontraron historiales', 404

    serializer = HistorialClinicoSerializer(historiales, many=True)
    return serializer.data, 200


def obtenerHistorialService(historial_id, solicitante):
    queryset = HistorialClinico.objects.select_related(
        'usuario', 'medico'
    ).prefetch_related('versiones__medico_editor')

    if isinstance(solicitante, Medico):
        historial = queryset.filter(id=historial_id, medico=solicitante).first()
    elif isinstance(solicitante, Usuario):
        historial = queryset.filter(id=historial_id, usuario=solicitante).first()
    else:
        return 'Historial no encontrado', 404

    if not historial:
        return 'Historial no encontrado', 404

    serializer = HistorialClinicoDetalleSerializer(historial)
    return serializer.data, 200


def editarHistorialService(historial_id, datos, medico):
    if not isinstance(medico, Medico):
        return 'No tienes permiso para editar historiales', 403

    with transaction.atomic():
        historial = (
            HistorialClinico.objects.select_for_update()
            .filter(id=historial_id, medico=medico)
            .first()
        )

        if not historial:
            return 'Historial no encontrado o no tienes permiso para editarlo', 404

        if not historial.cita_id:
            return 'No se puede verificar la cita asociada al historial', 400

        cita = (
            Cita.objects.select_for_update()
            .select_related('id_estado')
            .filter(id=historial.cita_id, id_medico=medico)
            .first()
        )
        if not cita or not _cita_esta_completada(cita):
            return 'La cita debe estar completada para modificar el historial', 400

        valores_nuevos = {
            campo: datos.get(campo, getattr(historial, campo))
            for campo in CAMPOS_CLINICOS
        }
        if all(
            valores_nuevos[campo] == getattr(historial, campo)
            for campo in CAMPOS_CLINICOS
        ):
            return 'La actualización no contiene cambios clínicos', 400

        if not historial.versiones.exists():
            _crear_version(
                historial=historial,
                version=1,
                medico_editor=historial.medico,
                motivo_cambio='Versión inicial recuperada del historial existente',
            )
            historial.version_actual = 1

        siguiente_version = historial.version_actual + 1
        _crear_version(
            historial=historial,
            version=siguiente_version,
            medico_editor=medico,
            motivo_cambio=datos['motivo_cambio'],
            valores=valores_nuevos,
        )

        for campo, valor in valores_nuevos.items():
            setattr(historial, campo, valor)
        historial.version_actual = siguiente_version
        historial.save(update_fields=[*CAMPOS_CLINICOS, 'version_actual'])

    historial = (
        HistorialClinico.objects.select_related('usuario', 'medico')
        .prefetch_related('versiones__medico_editor')
        .get(id=historial.id)
    )
    serializer = HistorialClinicoDetalleSerializer(historial)
    return serializer.data, 200
