from django.db import models
from django.contrib.auth import get_user_model
from users.models import Usuario




class Chat(models.Model):

    ESTADOS = (
        ("activo", "Activo"),
        ("archivado", "Archivado"),
        ("eliminado", "Eliminado"),
    )

    id_usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name="chats"
    )

    titulo = models.CharField(
        max_length=150,
        default="Nuevo chat"
    )

    estado = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default="activo"
    )
    estado_conversacion = models.CharField(
        max_length=100,
        default="normal"
    )

    contexto_temporal = models.JSONField(
        default=dict,
        blank=True
    )

    fecha = models.DateTimeField(auto_now_add=True)

    ultima_interaccion = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-ultima_interaccion"]

    def __str__(self):
        return self.titulo


class Mensaje(models.Model):

    TIPOS = (
        ("texto", "Texto"),
        ("voz", "Voz"),
        ("imagen", "Imagen"),
        ("archivo", "Archivo"),
        ("sistema", "Sistema"),
    )

    id_chat = models.ForeignKey(
        Chat,
        on_delete=models.CASCADE,
        related_name="mensajes"
    )

    contenido = models.TextField()

    es_bot = models.BooleanField(default=False)

    tipo = models.CharField(
        max_length=20,
        choices=TIPOS,
        default="texto"
    )

    modelo = models.CharField(
        max_length=50,
        blank=True,
        null=True
    )

    tool_ejecutada = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    tokens = models.PositiveIntegerField(default=0)

    tiempo_respuesta = models.FloatField(default=0)

    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["fecha"]

    def __str__(self):
        return f"{'Bymax' if self.es_bot else 'Usuario'} - {self.contenido[:40]}"


class SesionBymax(models.Model):

    usuario = models.OneToOneField(
        Usuario,
        on_delete=models.CASCADE,
        related_name="sesion_bymax"
    )

    estado = models.CharField(
        max_length=50,
        default="activo"
    )

    escala_animo = models.PositiveSmallIntegerField(
        null=True,
        blank=True
    )

    voz_activada = models.BooleanField(default=False)

    despertador_activo = models.BooleanField(default=False)

    idioma = models.CharField(
        max_length=10,
        default="es"
    )

    contexto_acumulado = models.TextField(
        blank=True,
        default=""
    )

    ultima_conversacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "chatbot_sesion_bymax"

    def __str__(self):
        return f"Sesión Bymax - {self.usuario}"


class ToolLog(models.Model):

    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name="tool_logs"
    )

    nombre_tool = models.CharField(max_length=100)

    parametros = models.JSONField(
        null=True,
        blank=True
    )

    respuesta = models.JSONField(
        null=True,
        blank=True
    )

    correcto = models.BooleanField(default=True)

    modelo = models.CharField(
        max_length=50,
        blank=True,
        null=True
    )

    tokens = models.PositiveIntegerField(
        default=0
    )

    latencia = models.FloatField(
        default=0
    )

    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "chatbot_tool_log"
        ordering = ["-fecha"]

    def __str__(self):
        return self.nombre_tool