from django.db import models
from users.models import Usuario


class Chatbot(models.Model):

    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='chatbots'
    )

    pregunta = models.TextField()

    respuesta = models.TextField()

    fecha = models.DateTimeField(auto_now_add=True)

    estado = models.BooleanField(default=True)

    def __str__(self):
        return f"Chatbot {self.id} - {self.usuario.nombre}"