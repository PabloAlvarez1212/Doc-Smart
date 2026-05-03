from rest_framework import serializers
from .models import Chat
from .models import Mensaje

class ChatSerializer(serializers.ModelSerializer):

    class Meta:
        model = Chat
        fields = '__all__'

class MensajesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mensaje
        fields = '__all__'
        