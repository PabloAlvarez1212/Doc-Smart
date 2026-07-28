# notificaciones/services.py
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from notificaciones.models import Notificacion
from citas.models import Cita
from citas.serializers import CitaSerializer
from catalogos.models import Estado
from notificaciones.serializers import NotificacionSerializer

def enviarNotificacion(titulo, mensaje, tipo, id_usuario=None, id_medico=None):
    # Guarda la notificación en BD
    notificacion = Notificacion.objects.create(
        titulo=titulo,
        mensaje=mensaje,
        tipo=tipo,
        id_usuario_id=id_usuario,
        id_medico_id=id_medico
    )

    serializer = NotificacionSerializer(notificacion)

    # Determina el destinatario
    destinatario_id = id_usuario or id_medico

    # Envía por WebSocket al grupo del destinatario
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'notificaciones_{destinatario_id}',
        {
            'type': 'nueva_notificacion',
            'notificacion': serializer.data
        }
    )

    return notificacion

# citas/services.py
from notificaciones.services import enviarNotificacion

def confirmarCitaService(id, medico_id):
    cita = Cita.objects.filter(id=id, id_medico=medico_id).first()
    if not cita:
        return 'Cita no encontrada o no te pertenece', 404

    if cita.id_estado.nombre == 'confirmada':
        return 'La cita ya está confirmada', 400

    estado_confirmada = Estado.objects.filter(nombre='confirmada').first()
    cita.id_estado = estado_confirmada
    cita.save()

    # ← enviar notificación al paciente
    enviarNotificacion(
        titulo='Cita confirmada',
        mensaje=f'Tu cita del {cita.fecha_programada.strftime("%d/%m/%Y %H:%M")} ha sido confirmada por el Dr. {cita.id_medico.nombre} {cita.id_medico.apellido}',
        tipo='cita_confirmada',
        id_usuario=cita.id_usuario_id  # ← al paciente
    )

    serializer = CitaSerializer(cita)
    return serializer.data, 200