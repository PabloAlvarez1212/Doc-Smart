from django.db import models

class Notificacion(models.Model):
    TIPOS = [
        ('cita_confirmada',  'Cita confirmada'),
        ('cita_cancelada',   'Cita cancelada'),
        ('cita_agendada',    'Cita agendada'),
        ('historial_creado', 'Historial creado'),
        ('mensaje_nuevo',    'Mensaje nuevo'),
    ]

    titulo      = models.CharField(max_length=100)
    mensaje     = models.TextField()
    tipo        = models.CharField(max_length=50, choices=TIPOS)
    leida       = models.BooleanField(default=False)
    fecha       = models.DateTimeField(auto_now_add=True)

    # destinatario — puede ser usuario o médico
    id_usuario  = models.ForeignKey('users.Usuario', on_delete=models.CASCADE, null=True, blank=True)
    id_medico   = models.ForeignKey('medicos.Medico', on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        ordering = ['-fecha']

    def __str__(self):
        return f"{self.tipo} - {self.fecha}"