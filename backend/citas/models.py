from django.db import models
from users.models import Usuario
from medicos.models import Medico
from catalogos.models import Estado, Medio

class Cita(models.Model):
    fecha_programada = models.DateTimeField()
    fecha_final = models.DateTimeField(null=True, blank=True)
    fecha_completada = models.DateTimeField(null=True, blank=True)
    id_estado = models.ForeignKey(Estado,   on_delete=models.PROTECT)
    id_usuario = models.ForeignKey(Usuario,  on_delete=models.PROTECT)
    id_medico = models.ForeignKey(Medico,   on_delete=models.PROTECT) 
    fecha_cancelacion = models.DateTimeField(null=True,blank=True)
    fecha_inasistencia = models.DateTimeField(null=True, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_limite_cierre = models.DateTimeField(null=True, blank=True)
    fecha_recordatorio_cierre_24h = models.DateTimeField(null=True, blank=True)
    fecha_recordatorio_cierre_48h = models.DateTimeField(null=True, blank=True)
    fecha_vencimiento = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Cita {self.id} - {self.fecha_programada}"


class DocumentoSeguimientoCita(models.Model):
    cita = models.ForeignKey(
        Cita,
        on_delete=models.CASCADE,
        related_name="documentos_seguimiento"
    )

    archivo = models.OneToOneField(
        "storage_app.archivo",
        on_delete = models.PROTECT,
        related_name="documento_seguimiento_cita",
    )

    fecha_subida = models.DateTimeField(auto_now_add = True)

    def __str__(self):
        return (
            f"Documento Cita {self.cita_id} - "
            f"{self.archivo.nombre_original}"
        )

class RecordatorioCita(models.Model):
    fecha_programada = models.DateTimeField()
    fecha_envio_recordatorio = models.DateTimeField()
    id_cita = models.ForeignKey(Cita, on_delete=models.CASCADE)
    id_estado = models.ForeignKey(Estado, on_delete=models.PROTECT)
    id_medios = models.ForeignKey(Medio, on_delete=models.PROTECT)

    def __str__(self):
        return f"Recordatorio {self.id} - Cita {self.id_cita.id}"
