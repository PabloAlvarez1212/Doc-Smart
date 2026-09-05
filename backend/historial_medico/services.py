from historial_medico.models import HistorialClinico
from historial_medico.serializers import HistorialClinicoSerializer
from citas.models import Cita
from medicos.models import Medico
from users.models import Usuario


def crearHistorialService(datos, medico):
    if not isinstance(medico, Medico):
        return 'No tienes permiso para crear historiales', 403

    # Verifica que la cita exista y pertenezca al médico logueado
    cita = Cita.objects.filter(
        id=datos['cita_id'],
        id_medico=medico
    ).first()

    if not cita:
        return 'Cita no encontrada', 404

    # Verifica que la cita no tenga ya un historial
    if HistorialClinico.objects.filter(cita=cita).exists():
        return 'Esta cita ya tiene un historial registrado', 400

    usuario = cita.id_usuario

    # Crea el historial
    historial = HistorialClinico.objects.create(
        diagnostico_general = datos['diagnostico_general'],
        motivo_consulta     = datos['motivo_consulta'],
        observaciones       = datos.get('observaciones', ''),
        cita                = cita,
        usuario             = usuario,
        medico              = medico
    )

    serializer = HistorialClinicoSerializer(historial)
    return serializer.data, 201


def listarHistorialesPacienteService(usuario):
    if not isinstance(usuario, Usuario):
        return 'No tienes permiso para consultar estos historiales', 403

    historiales = HistorialClinico.objects.filter(usuario=usuario)

    if not historiales.exists():
        return 'No se encontraron historiales', 404

    serializer = HistorialClinicoSerializer(historiales, many=True)
    return serializer.data, 200


def listarHistorialesMedicoService(medico):
    if not isinstance(medico, Medico):
        return 'No tienes permiso para consultar estos historiales', 403

    historiales = HistorialClinico.objects.filter(medico=medico)

    if not historiales.exists():
        return 'No se encontraron historiales', 404

    serializer = HistorialClinicoSerializer(historiales, many=True)
    return serializer.data, 200


def obtenerHistorialService(historial_id, solicitante):
    if isinstance(solicitante, Medico):
        historial = HistorialClinico.objects.filter(
            id=historial_id,
            medico=solicitante,
        ).first()
    elif isinstance(solicitante, Usuario):
        historial = HistorialClinico.objects.filter(
            id=historial_id,
            usuario=solicitante,
        ).first()
    else:
        return 'Historial no encontrado', 404

    if not historial:
        return 'Historial no encontrado', 404

    serializer = HistorialClinicoSerializer(historial)
    return serializer.data, 200


def editarHistorialService(historial_id, datos, medico):
    if not isinstance(medico, Medico):
        return 'No tienes permiso para editar historiales', 403

    historial = HistorialClinico.objects.filter(
        id=historial_id,
        medico=medico  # solo el médico que lo creó puede editarlo
    ).first()

    if not historial:
        return 'Historial no encontrado o no tienes permiso para editarlo', 404

    historial.diagnostico_general = datos.get('diagnostico_general', historial.diagnostico_general)
    historial.motivo_consulta     = datos.get('motivo_consulta', historial.motivo_consulta)
    historial.observaciones       = datos.get('observaciones', historial.observaciones)
    historial.save()

    serializer = HistorialClinicoSerializer(historial)
    return serializer.data, 200
