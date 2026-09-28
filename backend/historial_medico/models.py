from django.core.exceptions import ValidationError
from django.db import models


class HistorialClinico(models.Model):
    diagnostico_general = models.TextField()

    observaciones = models.TextField(
        blank=True,
        null=True,
    )

    motivo_consulta = models.TextField()

    fecha_creacion = models.DateTimeField(
        auto_now_add=True
    )

    version_actual = models.PositiveIntegerField(
        default=1
    )

    cita = models.ForeignKey(
        "citas.Cita",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    usuario = models.ForeignKey(
        "users.Usuario",
        on_delete=models.PROTECT,
        related_name="historiales",
    )

    medico = models.ForeignKey(
        "medicos.Medico",
        on_delete=models.PROTECT,
        related_name="historiales",
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(version_actual__gte=1),
                name="version_actual_positiva",
            ),

            models.UniqueConstraint(
                fields=["cita"],
                name="unique_historial_por_cita",
            ),
        ]

    def __str__(self):
        return f"Historial {self.id} - {self.usuario.nombre}"


class VersionHistorialClinico(models.Model):
    historial = models.ForeignKey(
        HistorialClinico,
        on_delete=models.CASCADE,
        related_name="versiones",
    )

    version = models.PositiveIntegerField()

    diagnostico_general = models.TextField()

    observaciones = models.TextField(
        blank=True,
        null=True,
    )

    motivo_consulta = models.TextField()

    motivo_cambio = models.CharField(
        max_length=500
    )

    medico_editor = models.ForeignKey(
        "medicos.Medico",
        on_delete=models.PROTECT,
        related_name="versiones_historial_editadas",
    )

    fecha_creacion = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ["version"]

        constraints = [
            models.CheckConstraint(
                check=models.Q(version__gte=1),
                name="version_historial_positiva",
            ),

            models.UniqueConstraint(
                fields=[
                    "historial",
                    "version",
                ],
                name="unique_version_por_historial",
            ),
        ]

    def __str__(self):
        return (
            f"Historial {self.historial_id} "
            f"- versión {self.version}"
        )

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError(
                "Las versiones clínicas son inmutables."
            )

        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError(
            "Las versiones clínicas no se pueden eliminar."
        )