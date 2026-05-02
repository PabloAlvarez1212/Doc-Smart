from django.db import models

class HistorialClinico(models.Model):
    diagnostico_general = models.TextField()
    observaciones = models.TextField(blank=True, null=True)
    motivo_consulta = models.TextField()
    cedula = models.CharField(max_length=20)

    cita = models.ForeignKey('citas.Cita', on_delete=models.CASCADE)
    usuario = models.ForeignKey('users.Usuario', on_delete=models.CASCADE)

    def __str__(self):
        return f"Historial {self.id} - {self.cedula}"
