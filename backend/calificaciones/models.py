from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

class Calificacion(models.Model):

    id = models.AutoField(primary_key=True)
    id_cita = models.OneToOneField("citas.Cita",on_delete=models.PROTECT,related_name="calificacion")
    puntuacion = models.PositiveSmallIntegerField(validators=[MinValueValidator(1),MaxValueValidator(5)])
    comentario = models.TextField(blank=True,default="")
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "calificaciones"
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return f"Calificación {self.id} - {self.puntuacion} estrellas"
