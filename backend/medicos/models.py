from django.db import models
from catalogos.models import Rol

class Especialidad(models.Model):
    nombre = models.CharField(max_length=100)

    def __str__(self):
        return self.nombre

class Medico(models.Model):
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    cedula = models.CharField(max_length=20, unique=True)
    fecha_nacimiento = models.DateField()
    telefono = models.CharField(max_length=20)
    correo = models.EmailField(unique=True)
    contraseña = models.CharField(max_length=255)
    id_especialidad = models.ForeignKey(Especialidad, on_delete=models.PROTECT)
    id_rol = models.ForeignKey(Rol, on_delete=models.PROTECT)
    token_reset = models.CharField(max_length=100, null=True, blank=True)
    token_reset_expira = models.DateTimeField(null=True, blank=True)
    ultimo_envio = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.nombre} {self.apellido}"

# Create your models here.
