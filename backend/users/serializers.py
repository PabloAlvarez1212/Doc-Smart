from rest_framework import serializers
from users.models import Usuario
from medicos.models import Medico

class UsuarioSerializer(serializers.ModelSerializer):
    rol = serializers.CharField(source='id_rol.nombre')
    
    class Meta:
        model = Usuario
        fields = ['id', 'nombre', 'apellido', 'correo', 'rol']

class MedicoSerializer(serializers.ModelSerializer):
    rol = serializers.CharField(source='id_rol.nombre')
    
    class Meta:
        model = Medico
        fields = ['id', 'nombre', 'apellido', 'correo', 'rol']