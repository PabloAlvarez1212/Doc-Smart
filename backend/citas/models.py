from django.db import models
from users.models import Usuario
from medicos.models import Medico
from catalogos.models import Estado, Lugar, Medio

class Cita(models.Model):
    fecha_programada = models.DateTimeField()
    fecha_final = models.DateTimeField(null=True, blank=True)
    id_estado = models.ForeignKey(Estado,   on_delete=models.PROTECT)
    id_usuario = models.ForeignKey(Usuario,  on_delete=models.PROTECT)
    id_medico = models.ForeignKey(Medico,   on_delete=models.PROTECT) 
    id_lugar = models.ForeignKey(Lugar,    on_delete=models.PROTECT) 

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
