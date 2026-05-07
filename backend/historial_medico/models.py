from django.db import models

class HistorialClinico(models.Model):
    diagnostico_general = models.TextField()
    observaciones       = models.TextField(blank=True, null=True)
    motivo_consulta     = models.TextField()
    fecha_creacion      = models.DateTimeField(auto_now_add=True) #creacion automatica
    cita    = models.ForeignKey(
                  'citas.Cita',
                  on_delete=models.SET_NULL, #si se borra la cita, el historial sobrevive 
                  null=True,
                  blank=True
              )
    usuario = models.ForeignKey(
                  'users.Usuario',
                  on_delete=models.PROTECT, #No deja borrar al usuario si tiene historial
                  related_name='historiales'
              )
    medico  = models.ForeignKey(
                  'medicos.Medico',
                  on_delete=models.PROTECT, #No deja borrar al medico si tiene historial
                  related_name='historiales'
              )

    def __str__(self):
        return f"Historial {self.id} - {self.cedula}"
