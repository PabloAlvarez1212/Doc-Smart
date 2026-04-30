from django.db import models
from citas.models import Cita
from users.models import Usuario

class Rol(models.Model):
    nombre = models.CharField(max_length=50)

    def __str__(self):
        return self.nombre
    
class Estado(models.Model):
    nombre = models.CharField(max_length=50)

    def __str__(self):
        return self.nombre

class Lugar(models.Model):
    nombre = models.CharField(max_length=100)

    def __str__(self):
        return self.nombre

class Medio(models.Model):
    nombre = models.CharField(max_length=50)

    def __str__(self):
        return self.nombre

class HistorialClinico(models.Model):
    diagnostico_general = models.TextField()
    observaciones = models.TextField(blank=True, null=True)
    motivo_consulta = models.TextField()
    cedula = models.CharField(max_length=20)

    cita = models.ForeignKey(Cita, on_delete=models.CASCADE)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)

    def __str__(self):
        return f"Historial {self.id} - {self.cedula}"