from datetime import timedelta

from django.utils import timezone

from .access import cargarConversacionVisible, identidadActor
from .models import ConexionPresencia

LEASE_SECONDS = 60
POLL_SECONDS = 20


def grupo(identity):
    return f'chat_presencia_{identity[0]}_{identity[1]}'


def renovar(canal, conversacion_id, actor):
    conv, actor = cargarConversacionVisible(conversacion_id, actor)
    identity = identidadActor(actor)
    counterpart = ('medico', conv.cita.id_medico_id) if identity[0] == 'paciente' else ('paciente', conv.cita.id_usuario_id)
    now = timezone.now()
    ConexionPresencia.objects.update_or_create(canal=canal, defaults={
        'tipo': identity[0], 'actor_id': identity[1], 'vence': now + timedelta(seconds=LEASE_SECONDS)})
    # Expired rows never contribute to presence; polling also bounds storage growth.
    ConexionPresencia.objects.filter(vence__lte=now).delete()
    return identity, counterpart


def online(identity):
    return ConexionPresencia.objects.filter(tipo=identity[0], actor_id=identity[1], vence__gt=timezone.now()).exists()


def retirar(canal):
    ConexionPresencia.objects.filter(canal=canal).delete()


def vigente(canal):
    return ConexionPresencia.objects.filter(canal=canal, vence__gt=timezone.now()).exists()
