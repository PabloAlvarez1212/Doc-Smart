from django.db import models
from catalogos.models import Rol

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