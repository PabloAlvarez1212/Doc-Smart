import uuid
from django.db import models
from catalogos.models import Rol

class Usuario(models.Model):
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    fecha_nacimiento = models.DateField()
    estatura = models.FloatField()
    peso = models.FloatField()
    correo = models.EmailField(unique=True)
    contraseña = models.CharField(max_length=255)
    cedula = models.CharField(max_length=20, unique=True)
    telefono = models.CharField(max_length=20)
    id_rol = models.ForeignKey(Rol, on_delete=models.PROTECT)
    token_reset = models.CharField(max_length=100, null=True, blank=True)
    token_reset_expira = models.DateTimeField(null=True, blank=True)
    ultimo_envio = models.DateTimeField(null=True, blank=True)
    foto_perfil = models.ImageField(upload_to="perfiles/pacientes/",null=True,blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False
    
    def __str__(self):
        return f"{self.nombre} {self.apellido}"



class ProcesoRegistroUsuario(models.Model):

    class Estado(models.TextChoices):
        INICIADO = "iniciado", "Iniciado"
        CORREO_VERIFICADO = "correo_verificado", "Correo verificado"
        DOCUMENTO_CARGADO = "documento_cargado", "Documento cargado"
        DOCUMENTO_VERIFICADO = "documento_verificado", "Documento verificado"
        COMPLETADO = "completado", "Completado"
        BLOQUEADO = "bloqueado", "Bloqueado"
        EXPIRADO = "expirado", "Expirado"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    # Datos declarados inicialmente por el usuario.
    nombre_declarado = models.CharField(max_length=100)
    apellido_declarado = models.CharField(max_length=100)

    fecha_nacimiento_declarada = models.DateField()

    cedula_declarada = models.CharField(
        max_length=20
    )

    correo = models.EmailField(
        db_index=True
    )

    contraseña_hash = models.CharField(
        max_length=255
    )

    telefono = models.CharField(
        max_length=20
    )

    estatura = models.FloatField()
    peso = models.FloatField()

    # Verificación del correo.
    correo_verificado = models.BooleanField(
        default=False
    )

    correo_verificado_en = models.DateTimeField(
        null=True,
        blank=True
    )

    otp_hash = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )

    otp_expira_en = models.DateTimeField(
        null=True,
        blank=True
    )

    intentos_otp = models.PositiveSmallIntegerField(
        default=0
    )

    reenvios_otp = models.PositiveSmallIntegerField(
        default=0
    )

    ultimo_envio_otp = models.DateTimeField(
        null=True,
        blank=True
    )

    # Documento.
    documento = models.ForeignKey(
        "storage_app.Archivo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="procesos_registro_usuario"
    )

    documento_verificado = models.BooleanField(
        default=False
    )

    documento_verificado_en = models.DateTimeField(
        null=True,
        blank=True
    )

    intentos_documento = models.PositiveSmallIntegerField(
        default=0
    )

    # Datos obtenidos y confirmados desde el documento.
    cedula_verificada = models.CharField(
        max_length=20,
        null=True,
        blank=True
    )

    nombre_verificado = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )

    apellido_verificado = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )

    fecha_nacimiento_verificada = models.DateField(
        null=True,
        blank=True
    )

    estado = models.CharField(
        max_length=30,
        choices=Estado.choices,
        default=Estado.INICIADO
    )

    creado_en = models.DateTimeField(
        auto_now_add=True
    )

    actualizado_en = models.DateTimeField(
        auto_now=True
    )

    expira_en = models.DateTimeField()

    completado_en = models.DateTimeField(
        null=True,
        blank=True
    )

    class Meta:
        indexes = [
            models.Index(
                fields=["correo", "estado"]
            ),
            models.Index(
                fields=["cedula_declarada", "estado"]
            ),
            models.Index(
                fields=["estado", "expira_en"]
            ),
        ]

    def __str__(self):
        return f"{self.correo} - {self.estado}"


class CambioCorreoUsuario(models.Model):

    class Estado(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        COMPLETADO = "completado", "Completado"
        BLOQUEADO = "bloqueado", "Bloqueado"
        EXPIRADO = "expirado", "Expirado"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name="cambios_correo"
    )

    nuevo_correo = models.EmailField()

    otp_hash = models.CharField(
        max_length=255
    )

    otp_expira_en = models.DateTimeField()

    intentos = models.PositiveSmallIntegerField(
        default=0
    )

    reenvios = models.PositiveSmallIntegerField(
        default=0
    )

    estado = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.PENDIENTE
    )

    creado_en = models.DateTimeField(
        auto_now_add=True
    )

    completado_en = models.DateTimeField(
        null=True,
        blank=True
    )

    class Meta:
        indexes = [
            models.Index(
                fields=["usuario", "estado"]
            ),
            models.Index(
                fields=["nuevo_correo", "estado"]
            ),
        ]

    # Create your models here.