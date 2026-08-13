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

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False
    
    def __str__(self):
        return f"{self.nombre} {self.apellido}"

# Create your models here.
