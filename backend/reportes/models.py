from django.db import models
from django.utils import timezone
from django.core.validators import MaxLengthValidator

class Reporte(models.Model):
    class Motivo(models.TextChoices):
        INCUMPLIMIENTO = "incumplimiento", "Incumplimiento de la cita"
        TRATO = "trato_inadecuado", "Trato inadecuado"
        CONDUCTA = "conducta_profesional", "Conducta poco profesional"
        ACOSO = "acoso", "Acoso o comportamiento inapropiado"
        SEGURIDAD = "seguridad", "Problema de seguridad"
        OTRO = "otro", "Otro motivo"

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

    motivo = models.CharField(max_length=150, choices=Motivo.choices)
    otro_motivo = models.CharField(max_length=150, blank=True, default="")
    descripcion = models.TextField(validators=[MaxLengthValidator(2000)])
    evidencia = models.OneToOneField(
        "storage_app.Archivo", on_delete=models.PROTECT,
        null=True, blank=True, related_name="evidencia_reporte",
    )
    observacion_reportante = models.TextField(blank=True, default="")

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
    class Tipo(models.TextChoices):
        TEMPORAL = "temporal", "Suspensión temporal"
        INDEFINIDA = "indefinida", "Suspensión indefinida"

    tipo = models.CharField(max_length=10, choices=Tipo.choices, default=Tipo.TEMPORAL)
    aplicada_por = models.ForeignKey(
        "users.Usuario", on_delete=models.PROTECT, null=True, blank=True,
        related_name="sanciones_aplicadas",
    )
    motivo_anulacion = models.TextField(blank=True, default="")

    reporte = models.OneToOneField(
        Reporte,
        on_delete=models.PROTECT,
        related_name="sancion"
    )

    motivo = models.TextField()

    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField(null=True, blank=True)

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
                condition=(
                    models.Q(tipo="indefinida", fecha_fin__isnull=True)
                    | models.Q(tipo="temporal", fecha_fin__isnull=False,
                               fecha_fin__gt=models.F("fecha_inicio"))
                ),
                name="sancion_fechas_validas"
            )
        ]
        indexes = [models.Index(fields=["anulada_en", "fecha_fin", "fecha_inicio"])]

    @property
    def esta_activa(self):
        ahora = timezone.now()

        return (
            self.anulada_en is None
            and self.fecha_inicio <= ahora
            and (self.fecha_fin is None or ahora < self.fecha_fin)
        )

    def __str__(self):
        return f"Sanción #{self.id} - Reporte #{self.reporte_id}"
