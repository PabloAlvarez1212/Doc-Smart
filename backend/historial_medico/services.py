from historial_medico.models import HistorialClinico
from historial_medico.serializers import HistorialClinicoSerializer
from citas.models import Cita


def crearHistorialService(datos, medico_id):
    # Verifica que la cita exista y pertenezca al médico logueado
    cita = Cita.objects.filter(
        id=datos['cita_id'],
        id_medico=medico_id
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
        medico_id           = medico_id
    )

    serializer = HistorialClinicoSerializer(historial)
    return serializer.data, 201


def listarHistorialesPacienteService(usuario_id):
    historiales = HistorialClinico.objects.filter(usuario_id=usuario_id)

    if not historiales.exists():
        return 'No se encontraron historiales', 404

    serializer = HistorialClinicoSerializer(historiales, many=True)
    return serializer.data, 200


def listarHistorialesMedicoService(medico_id):
    historiales = HistorialClinico.objects.filter(medico_id=medico_id)

    if not historiales.exists():
        return 'No se encontraron historiales', 404

    serializer = HistorialClinicoSerializer(historiales, many=True)
    return serializer.data, 200


def obtenerHistorialService(historial_id, solicitante_id, es_medico=False):
    historial = HistorialClinico.objects.filter(id=historial_id).first()

    if not historial:
        return 'Historial no encontrado', 404

    # Verifica que quien pide el historial sea el paciente o el médico dueño
    if es_medico and historial.medico_id != solicitante_id:
        return 'No tienes permiso para ver este historial', 403

    if not es_medico and historial.usuario_id != solicitante_id:
        return 'No tienes permiso para ver este historial', 403

    serializer = HistorialClinicoSerializer(historial)
    return serializer.data, 200


def editarHistorialService(historial_id, datos, medico_id):
    historial = HistorialClinico.objects.filter(
        id=historial_id,
        medico_id=medico_id  # solo el médico que lo creó puede editarlo
    ).first()

    if not historial:
        return 'Historial no encontrado o no tienes permiso para editarlo', 404

    historial.diagnostico_general = datos.get('diagnostico_general', historial.diagnostico_general)
    historial.motivo_consulta     = datos.get('motivo_consulta', historial.motivo_consulta)
    historial.observaciones       = datos.get('observaciones', historial.observaciones)
    historial.save()

    serializer = HistorialClinicoSerializer(historial)
    return serializer.data, 200