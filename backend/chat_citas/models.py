from django.db import models


class Conversacion(models.Model):
    cita = models.OneToOneField('citas.Cita', on_delete=models.PROTECT,
                               related_name='conversacion')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_habilitacion_anticipada = models.DateTimeField(null=True, blank=True)
    fecha_cierre = models.DateTimeField(null=True, blank=True)
