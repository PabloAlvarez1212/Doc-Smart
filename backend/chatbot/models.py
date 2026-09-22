from django.db import models
from django.contrib.auth import get_user_model
from users.models import Usuario
import uuid




class Chat(models.Model):

    ESTADOS = (
        ("activo", "Activo"),
        ("archivado", "Archivado"),
        ("eliminado", "Eliminado"),
    )

    id_usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name="chats", null=True, blank=True,
    )

    id_medico = models.ForeignKey(
        "medicos.Medico", on_delete=models.CASCADE,
        related_name="chats_bymax", null=True, blank=True,
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
        constraints = [models.CheckConstraint(
            condition=(models.Q(id_usuario__isnull=False, id_medico__isnull=True)
                       | models.Q(id_usuario__isnull=True, id_medico__isnull=False)),
            name="chat_un_solo_propietario",
        )]

    def __str__(self):
        return self.titulo

    @property
    def contexto_clinico_id(self):
        return self.contexto_temporal.get("clinico", {}).get("sesion_id", "") if self.id_medico_id else ""


class Mensaje(models.Model):
    resultado = models.JSONField(null=True, blank=True)

    contexto_clinico = models.CharField(max_length=32, blank=True, default="")

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

    archivo = models.ForeignKey(
        "storage_app.Archivo",
        on_delete=models.SET_NULL,
        related_name="mensajes_chatbot",
        null=True,
        blank=True,
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
        related_name="tool_logs", null=True, blank=True,
    )

    medico = models.ForeignKey(
        "medicos.Medico", on_delete=models.CASCADE,
        related_name="tool_logs_bymax", null=True, blank=True,
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
        constraints = [models.CheckConstraint(
            condition=(models.Q(usuario__isnull=False, medico__isnull=True)
                       | models.Q(usuario__isnull=True, medico__isnull=False)),
            name="toollog_un_solo_actor",
        )]

    def __str__(self):
        return self.nombre_tool


class EstadoAnimoDiario(models.Model):
    usuario = models.ForeignKey(Usuario, null=True, blank=True, on_delete=models.CASCADE)
    medico = models.ForeignKey("medicos.Medico", null=True, blank=True, on_delete=models.CASCADE)
    rol = models.CharField(max_length=20)
    fecha = models.DateField()
    puntuacion = models.PositiveSmallIntegerField(null=True, blank=True)
    preguntado_en = models.DateTimeField(auto_now_add=True)
    respondido_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["usuario", "fecha"], name="animo_usuario_dia"),
            models.UniqueConstraint(fields=["medico", "fecha"], name="animo_medico_dia"),
            models.CheckConstraint(condition=(models.Q(usuario__isnull=False, medico__isnull=True, rol="paciente") |
                models.Q(usuario__isnull=True, medico__isnull=False, rol="medico")), name="animo_actor_rol"),
            models.CheckConstraint(condition=models.Q(puntuacion__isnull=True) | models.Q(puntuacion__gte=1, puntuacion__lte=10), name="animo_escala"),
        ]


class PermisoDiagnostico(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    permiso = models.ForeignKey("auth.Permission", on_delete=models.CASCADE)
    activo = models.BooleanField(default=False)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["usuario", "permiso"], name="permiso_diagnostico_unico")]


class SesionDiagnostico(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    sesion_hash = models.CharField(max_length=64)
    creada_en = models.DateTimeField(auto_now_add=True)
    expira_en = models.DateTimeField()
    cerrada_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        permissions = [("view_diagnostics", "Consultar diagnóstico sanitizado de Bymax")]


class ErrorBymax(models.Model):
    correlacion = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE)
    codigo = models.CharField(max_length=60)
    operacion = models.CharField(max_length=30)
    fecha = models.DateTimeField(auto_now_add=True)


class TurnoBymax(models.Model):
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE)
    clave = models.UUIDField()
    huella = models.CharField(max_length=64)
    estado = models.CharField(max_length=15, default="procesando")
    respuesta = models.JSONField(default=dict)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["chat", "clave"], name="turno_bymax_unico")]
