from rest_framework import serializers
from .models import Rol, Estado, Lugar, Medio

class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = '__all__'

class EstadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estado
        fields = '__all__'

class LugarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lugar
        fields = '__all__'
    
class MedioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medio
        fields = '__all__'