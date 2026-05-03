from citas.models import Cita, RecordatorioCita
from citas.serializers import CitaSerializer, RecordatorioSerializer
from catalogos.models import Estado, Lugar, Medio
from users.models import Usuario
from medicos.models import Medico


# =========================
# 🔹 CITAS
# =========================

def listarCitasService():
    citas = Cita.objects.all().order_by('-fecha_programada')
    serializer = CitaSerializer(citas, many=True)
    return serializer.data, 200


def obtenerCitaService(id):
    cita = Cita.objects.filter(id=id).first()
    if not cita:
        return 'Cita no encontrada', 404

    serializer = CitaSerializer(cita)
    return serializer.data, 200


def crearCitaService(datos):
    fecha_programada = datos.get('fecha_programada')
    id_usuario = datos.get('id_usuario')
    id_medico = datos.get('id_medico')
    id_estado = datos.get('id_estado')
    id_lugar = datos.get('id_lugar')

    # 🔹 Validaciones básicas
    if not fecha_programada or not id_usuario or not id_medico:
        return 'Faltan campos obligatorios', 400

    usuario = Usuario.objects.filter(id=id_usuario).first()
    medico = Medico.objects.filter(id=id_medico).first()

    if not usuario:
        return 'Usuario no encontrado', 404

    if not medico:
        return 'Médico no encontrado', 404

    estado = Estado.objects.filter(id=id_estado).first() if id_estado else None
    lugar = Lugar.objects.filter(id=id_lugar).first() if id_lugar else None

    # 🔥 Validación PRO: evitar citas duplicadas del médico
    existe = Cita.objects.filter(
        id_medico=medico,
        fecha_programada=fecha_programada
    ).exists()

    if existe:
        return 'El médico ya tiene una cita en esa fecha y hora', 400

    cita = Cita.objects.create(
        fecha_programada=fecha_programada,
        id_usuario=usuario,
        id_medico=medico,
        id_estado=estado,
        id_lugar=lugar
    )

    serializer = CitaSerializer(cita)
    return serializer.data, 201


def editarCitaService(id, datos):
    cita = Cita.objects.filter(id=id).first()

    if not cita:
        return 'Cita no encontrada', 404

    nueva_fecha = datos.get('fecha_programada')

    # 🔥 Validación de choque
    if nueva_fecha:
        existe = Cita.objects.filter(
            id_medico=cita.id_medico,
            fecha_programada=nueva_fecha
        ).exclude(id=cita.id).exists()

        if existe:
            return 'El médico ya tiene una cita en esa fecha', 400

        cita.fecha_programada = nueva_fecha

    cita.fecha_final = datos.get('fecha_final', cita.fecha_final)

    if datos.get('id_estado'):
        cita.id_estado = Estado.objects.filter(id=datos.get('id_estado')).first()

    if datos.get('id_lugar'):
        cita.id_lugar = Lugar.objects.filter(id=datos.get('id_lugar')).first()

    cita.save()

    serializer = CitaSerializer(cita)
    return serializer.data, 200


def eliminarCitaService(id):
    cita = Cita.objects.filter(id=id).first()

    if not cita:
        return 'Cita no encontrada', 404

    cita.delete()
    return 'Cita eliminada correctamente', 200


# =========================
# 🔹 RECORDATORIOS
# =========================

def listarRecordatoriosService():
    recordatorios = RecordatorioCita.objects.all()
    serializer = RecordatorioSerializer(recordatorios, many=True)
    return serializer.data, 200


def crearRecordatorioService(datos):
    id_cita = datos.get('id_cita')
    fecha_programada = datos.get('fecha_programada')
    fecha_envio = datos.get('fecha_envio_recordatorio')
    id_estado = datos.get('id_estado')
    id_medio = datos.get('id_medios')

    if not id_cita or not fecha_programada or not fecha_envio:
        return 'Faltan campos obligatorios', 400

    cita = Cita.objects.filter(id=id_cita).first()
    if not cita:
        return 'Cita no encontrada', 404

    estado = Estado.objects.filter(id=id_estado).first()
    medio = Medio.objects.filter(id=id_medio).first()

    recordatorio = RecordatorioCita.objects.create(
        id_cita=cita,
        fecha_programada=fecha_programada,
        fecha_envio_recordatorio=fecha_envio,
        id_estado=estado,
        id_medios=medio
    )

    serializer = RecordatorioSerializer(recordatorio)
    return serializer.data, 201


def eliminarRecordatorioService(id):
    recordatorio = RecordatorioCita.objects.filter(id=id).first()

    if not recordatorio:
        return 'Recordatorio no encontrado', 404

    recordatorio.delete()
    return 'Recordatorio eliminado correctamente', 200