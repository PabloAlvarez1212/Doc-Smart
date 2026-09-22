from django.db import models
from catalogos.models import Rol
from django.core.validators import MinValueValidator, MaxValueValidator

# Modelo que representa una especialidad médica (ej: Cardiología, Pediatría)
class Especialidad(models.Model):
    nombre = models.CharField(max_length=100)

    def __str__(self):
        return self.nombre

# Modelo principal que representa a un médico del sistema
class Medico(models.Model):
    
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    cedula = models.CharField(max_length=20, unique=True)        # Documento de identidad único
    fecha_nacimiento = models.DateField()
    telefono = models.CharField(max_length=20)
    correo = models.EmailField(unique=True)                       # Correo único para login
    contraseña = models.CharField(max_length=255)                 # Almacenada con hash bcrypt
    id_especialidad = models.ForeignKey(Especialidad, on_delete=models.PROTECT)  # No permite borrar especialidad en uso
    id_rol = models.ForeignKey(Rol, on_delete=models.PROTECT)    # Rol asignado (ej: doctor)
    foto_perfil = models.ImageField(upload_to='perfiles/medicos/',null=True,blank=True)
    token_reset = models.CharField(max_length=100, null=True, blank=True)        # Token para recuperar contraseña
    token_reset_expira = models.DateTimeField(null=True, blank=True)             # Expiración del token de reset
    ultimo_envio = models.DateTimeField(null=True, blank=True)   # Control de frecuencia de envío de correos
    direccion = models.CharField(max_length=255)
    ciudad = models.ForeignKey(
        'catalogos.Ciudad',
        on_delete=models.PROTECT,
        null=True,
        blank=True
    )
    duracion_consulta = models.PositiveSmallIntegerField(
        default=30,
        validators=[
            MinValueValidator(10),
            MaxValueValidator(180),
        ],
        help_text="Duración de la consulta en minutos"
    )
    # Propiedad requerida por el sistema de autenticación: indica que el médico está autenticado
    @property
    def is_authenticated(self):
        return True

    # Propiedad requerida por el sistema de autenticación: indica que no es un usuario anónimo
    @property
    def is_anonymous(self):
        return False
    
    @property
    def ultima_solicitud_validacion(self):
        return self.solicitudes_validacion.order_by(
            "-fecha_solicitud"
        ).first()
        
    @property
    def esta_aprobado(self):
        solicitud = self.ultima_solicitud_validacion

        return (
            solicitud is not None
            and solicitud.estado
            == SolicitudValidacionMedico.EstadoSolicitud.APROBADO
        )

    def __str__(self):
        return f"{self.nombre} {self.apellido}"

class SolicitudValidacionMedico(models.Model):

    class EstadoSolicitud(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        APROBADO = "aprobado", "Aprobado"
        RECHAZADO = "rechazado", "Rechazado"
        
    medico = models.ForeignKey(Medico,on_delete=models.CASCADE,related_name="solicitudes_validacion")
    estado = models.CharField(max_length=20,choices=EstadoSolicitud.choices,default=EstadoSolicitud.PENDIENTE)
    hoja_vida = models.ForeignKey("storage_app.Archivo",on_delete=models.PROTECT,related_name="solicitudes_medicas")
    motivo_rechazo = models.TextField(null=True,blank=True)
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    fecha_revision = models.DateTimeField(null=True,blank=True)
    puede_reintentar_desde = models.DateTimeField(null=True,blank=True)
    
    def __str__(self):
        return f"Solicitud {self.id} - {self.medico}"

class DisponibilidadMedico(models.Model):

    class DiaSemana(models.IntegerChoices):
        LUNES = 0, "Lunes"
        MARTES = 1, "Martes"
        MIERCOLES = 2, "Miércoles"
        JUEVES = 3, "Jueves"
        VIERNES = 4, "Viernes"
        SABADO = 5, "Sábado"
        DOMINGO = 6, "Domingo"

    medico = models.ForeignKey(
        Medico,
        on_delete=models.CASCADE,
        related_name="disponibilidades"
    )

    dia_semana = models.PositiveSmallIntegerField(
        choices=DiaSemana.choices
    )

    hora_inicio = models.TimeField()

    hora_fin = models.TimeField()

    activo = models.BooleanField(default=True)

    def __str__(self):
        return (
            f"{self.medico} - "
            f"{self.get_dia_semana_display()} "
            f"{self.hora_inicio} - {self.hora_fin}"
        )

class ExcepcionDisponibilidadMedico(models.Model):

    class TipoExcepcion(models.TextChoices):
        NO_DISPONIBLE = "NO_DISPONIBLE", "No disponible"
        HORARIO_ESPECIAL = "HORARIO_ESPECIAL", "Horario especial"

    medico = models.ForeignKey(
        Medico,
        on_delete=models.CASCADE,
        related_name="excepciones_disponibilidad"
    )

    fecha = models.DateField()

    tipo = models.CharField(
        max_length=20,
        choices=TipoExcepcion.choices
    )

    hora_inicio = models.TimeField(
        null=True,
        blank=True
    )

    hora_fin = models.TimeField(
        null=True,
        blank=True
    )

    motivo = models.CharField(
        max_length=255,
        blank=True,
        default=""
    )

    class Meta:
        ordering = [
            "fecha",
            "hora_inicio"
        ]

    def __str__(self):
        return (
            f"{self.medico} - "
            f"{self.fecha} - "
            f"{self.get_tipo_display()}"
        )

