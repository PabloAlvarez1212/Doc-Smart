from django.db import models

from users.models import Usuario


class Archivo(models.Model):
    TIPO_CHOICES = [
        ("imagen", "Imagen"),
        ("documento", "Documento"),
        ("video", "Video"),
        ("audio", "Audio"),
        ("otro", "Otro"),
    ]

    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name="archivos",
        null=True,
        blank=True,
    )

    nombre_original = models.CharField(
        max_length=255
    )

    storage_key = models.CharField(
        max_length=255,
        unique=True,
    )

    content_type = models.CharField(
        max_length=150,
        blank=True,
        null=True,
    )

    tamano = models.BigIntegerField(
        default=0
    )

    tipo = models.CharField(
        max_length=20,
        choices=TIPO_CHOICES,
        default="otro",
    )

    categoria = models.CharField(
        max_length=100
    )

    fecha_subida = models.DateTimeField(
        auto_now_add=True
    )

    activo = models.BooleanField(
        default=True
    )

    def __str__(self):
        return self.nombre_original