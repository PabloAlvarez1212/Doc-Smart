from rest_framework import serializers
from .models import Chatbot


class ChatbotSerializer(serializers.ModelSerializer):

    class Meta:
        model = Chatbot
        fields = '__all__'