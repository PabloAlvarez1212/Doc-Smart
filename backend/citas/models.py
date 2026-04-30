from django.db import models

class Cita(models.Model):
    fecha_programada = models.DateTimeField()
    fecha_final = models.DateTimeField(null=True, blank=True)

    estado = models.ForeignKey('catalogos.Estado', on_delete=models.PROTECT)
    usuario = models.ForeignKey('users.Usuario', on_delete=models.CASCADE)
    medico = models.ForeignKey('medicos.Medico', on_delete=models.CASCADE)
    lugar = models.ForeignKey('catalogos.Lugar', on_delete=models.SET_NULL, null=True)

    creada_en = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"Cita {self.id} - {self.usuario} - {self.fecha_programada}"
