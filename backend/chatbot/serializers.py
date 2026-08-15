from rest_framework import serializers
from .models import Chat
from .models import Mensaje

#Salida
class ChatSerializer(serializers.ModelSerializer):

    class Meta:
        model = Chat
        fields = '__all__'

class MensajesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mensaje
        fields = '__all__'
        
#Entrada     
def msg(campo, articulo='El'):
    return {
        'required': f'{articulo} {campo} es obligatorio',
        'blank':    f'{articulo} {campo} no puede estar vacío',
        'null':     f'{articulo} {campo} no puede ser nulo',
        'invalid':  f'{articulo} {campo} no tiene un formato válido',
    }

class CrearMensajeSerializer(serializers.Serializer):
    contenido = serializers.CharField(
                    allow_blank=False,
                    trim_whitespace=True,
                    error_messages=msg('contenido', 'El'))
        
