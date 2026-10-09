from django.db import models
from users.models import Usuario
from medicos.models import Medico
from catalogos.models import Estado, Medio
from .utils import generarCodigoCita

class Cita(models.Model):
    fecha_programada = models.DateTimeField()
    fecha_final = models.DateTimeField(null=True, blank=True)
    id_estado = models.ForeignKey(Estado,   on_delete=models.PROTECT)
    id_usuario = models.ForeignKey(Usuario,  on_delete=models.PROTECT)
    id_medico = models.ForeignKey(Medico,   on_delete=models.PROTECT) 
    fecha_cancelacion = models.DateTimeField(null=True,blank=True)
    fecha_inasistencia = models.DateTimeField(null=True, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    codigo_cita = models.CharField(max_length=12,unique=True,editable=False,default=generarCodigoCita)
    motivo_consulta = models.TextField(null=True,blank=True)

    def __str__(self):
        return f"Cita {self.id} - {self.fecha_programada}"

class RecordatorioCita(models.Model):
    fecha_programada = models.DateTimeField()
    fecha_envio_recordatorio = models.DateTimeField()
    id_cita = models.ForeignKey(Cita, on_delete=models.CASCADE)
    id_estado = models.ForeignKey(Estado, on_delete=models.PROTECT)
    id_medios = models.ForeignKey(Medio, on_delete=models.PROTECT)

    def __str__(self):
        return f"Recordatorio {self.id} - Cita {self.id_cita.id}"
