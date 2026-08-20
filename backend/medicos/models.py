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

    def __str__(self):
        return f"{self.nombre} {self.apellido}"