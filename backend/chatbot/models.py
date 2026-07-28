from django.db import models
from users.models import Usuario

class Chat(models.Model):
    fecha = models.DateTimeField(auto_now_add=True)
    id_usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)

    def __str__(self):
        return f"Chat {self.id} - Usuario {self.id_usuario}"

class Mensaje(models.Model):
    fecha = models.DateTimeField(auto_now_add=True)
    contenido = models.TextField()
    es_bot = models.BooleanField(default=False)
    id_chat = models.ForeignKey(Chat, on_delete=models.CASCADE)

    def __str__(self):
        return f"Mensaje {self.id} - {'Bot' if self.es_bot else 'Usuario'}"
    
    