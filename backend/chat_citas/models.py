from django.db import models


class Conversacion(models.Model):
    cita = models.OneToOneField('citas.Cita', on_delete=models.PROTECT,
                               related_name='conversacion')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_habilitacion_anticipada = models.DateTimeField(null=True, blank=True)
    fecha_cierre = models.DateTimeField(null=True, blank=True)
    ultimo_leido_paciente = models.ForeignKey('Mensaje', null=True, blank=True,
        on_delete=models.PROTECT, related_name='+')
    ultimo_leido_medico = models.ForeignKey('Mensaje', null=True, blank=True,
        on_delete=models.PROTECT, related_name='+')


class Mensaje(models.Model):
    conversacion = models.ForeignKey(Conversacion, on_delete=models.PROTECT, related_name='mensajes')
    tipo = models.CharField(max_length=16, choices=[(v, v) for v in
        ('paciente', 'medico', 'nota_previa', 'sistema')])
    contenido = models.TextField(max_length=4000, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    emisor_usuario = models.ForeignKey('users.Usuario', null=True, blank=True,
        on_delete=models.PROTECT, related_name='+')
    emisor_medico = models.ForeignKey('medicos.Medico', null=True, blank=True,
        on_delete=models.PROTECT, related_name='+')
    client_message_id = models.UUIDField(null=True, blank=True)
    clave_evento = models.CharField(max_length=120, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    cupo_nota = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=['conversacion', 'id'], name='chat_historial_idx')]
        constraints = [
            models.CheckConstraint(name='chat_emisor_valido', condition=(
                models.Q(tipo__in=['paciente', 'nota_previa'], emisor_usuario__isnull=False,
                         emisor_medico__isnull=True, client_message_id__isnull=False, clave_evento__isnull=True)
                | models.Q(tipo='medico', emisor_usuario__isnull=True, emisor_medico__isnull=False,
                           client_message_id__isnull=False, clave_evento__isnull=True)
                | models.Q(tipo='sistema', emisor_usuario__isnull=True, emisor_medico__isnull=True,
                           client_message_id__isnull=True, clave_evento__isnull=False))),
            models.CheckConstraint(name='chat_slot_nota_valido', condition=(
                models.Q(tipo='nota_previa', cupo_nota=1, cupo_nota__isnull=False)
                | (~models.Q(tipo='nota_previa') & models.Q(cupo_nota__isnull=True)))),
            models.UniqueConstraint(fields=['conversacion', 'emisor_usuario', 'client_message_id'], name='chat_uuid_usuario'),
            models.UniqueConstraint(fields=['conversacion', 'emisor_medico', 'client_message_id'], name='chat_uuid_medico'),
            models.UniqueConstraint(fields=['conversacion', 'clave_evento'], name='chat_evento_unico'),
            models.UniqueConstraint(fields=['conversacion', 'cupo_nota'], name='chat_nota_unica'),
        ]


class AdjuntoConversacion(models.Model):
    conversacion = models.ForeignKey(Conversacion, on_delete=models.PROTECT, related_name='adjuntos')
    archivo = models.OneToOneField('storage_app.Archivo', on_delete=models.PROTECT, related_name='adjunto_chat')
    mensaje = models.ForeignKey(Mensaje, null=True, blank=True, on_delete=models.PROTECT, related_name='adjuntos')
