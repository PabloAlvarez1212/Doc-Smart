from django.db import models

class Rol(models.Model):
    nombre = models.CharField(max_length=50)

    def __str__(self):
        return self.nombre
    
class Estado(models.Model):
    nombre = models.CharField(max_length=50)

    def __str__(self):
        return self.nombre

class Departamento(models.Model): 
    api_id = models.IntegerField(
        unique=True,
        null=True,
        blank=True
    )
    nombre = models.CharField(max_length=100)
    def __str__(self):
        return self.nombre
    
class Ciudad(models.Model):
    api_id = models.IntegerField(
        unique=True,
        null=True,
        blank=True
    )
    nombre = models.CharField(max_length=100)
    departamento = models.ForeignKey('catalogos.Departamento', on_delete=models.CASCADE)
    def __str__(self):
        return self.nombre

class Medio(models.Model):
    nombre = models.CharField(max_length=50)

    def __str__(self):
        return self.nombre
