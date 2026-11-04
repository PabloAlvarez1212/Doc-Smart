from django.db import models
from django.utils import timezone

class Reporte(models.Model):
    class Reportante(models.TextChoices):
        PACIENTE = "paciente", "Paciente"
        MEDICO = "medico", "Medico"

    class Estado(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        EN_REVISION = "en_revision", "En revisión"
        RESUELTO = "resuelto", "Resuelto"
        DESCARTADO = "descartado", "Descartado"

    paciente = models.ForeignKey(
        "users.Usuario", on_delete = models.PROTECT,
        related_name = "reportes_paciente"
    )

    medico = models.ForeignKey(
        "medicos.Medico", on_delete = models.PROTECT,
        related_name = "reportes_medico"
    )

    cita = models.ForeignKey(
        "citas.Cita", on_delete = models.PROTECT,
        null = True, blank = True, related_name = "reportes"
    )

    reportante = models.CharField(
        max_length = 10,
        choices = Reportante.choices
    )

    motivo = models.CharField(max_length = 150)
    descripcion = models.TextField()

    estado = models.CharField(
        max_length = 15,
        choices = Estado.choices,
        default = Estado.PENDIENTE
    )

    observacion_admin = models.TextField(
        blank=True,
        default=""
    )

    revisado_por = models.ForeignKey(
        "users.Usuario",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="reportes_revisados"
    )

    fecha_creacion = models.DateTimeField(
        auto_now_add=True
    )

    fecha_revision = models.DateTimeField(
        null=True,
        blank=True
    )

    class Meta:
        ordering = ["-fecha_creacion"]
        indexes = [
            models.Index(
                fields=["estado", "fecha_creacion"]
            )
        ]

    def __str__(self):
        return f"Reporte #{self.id} - {self.estado}"


class Sancion(models.Model):

    reporte = models.OneToOneField(
        Reporte,
        on_delete=models.PROTECT,
        related_name="sancion"
    )

    motivo = models.TextField()

    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()

    fecha_creacion = models.DateTimeField(
        auto_now_add=True
    )

    anulada_en = models.DateTimeField(
        null=True,
        blank=True
    )

    anulada_por = models.ForeignKey(
        "users.Usuario",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="sanciones_anuladas"
    )

    class Meta:
        ordering = ["-fecha_creacion"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    fecha_fin__gt=models.F("fecha_inicio")
                ),
                name="sancion_fechas_validas"
            )
        ]

    @property
    def esta_activa(self):
        ahora = timezone.now()

        return (
            self.anulada_en is None
            and self.fecha_inicio <= ahora < self.fecha_fin
        )

    def __str__(self):
        return f"Sanción #{self.id} - Reporte #{self.reporte_id}"