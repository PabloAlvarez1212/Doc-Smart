from rest_framework import serializers
from .models import Rol, Estado, Medio, Departamento, Ciudad


# ! SALIDA

class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = '__all__'

class EstadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estado
        fields = '__all__'

class DepartamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Departamento
        fields = '__all__'
        
class CiudadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ciudad
        fields = '__all__'

class MedioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medio
        fields = '__all__'


# ! MENSAJES REUTILIZABLES

def msg(campo, articulo='El'):
    return {
        'required':   f'{articulo} {campo} es obligatorio',
        'blank':      f'{articulo} {campo} no puede estar vacío',
        'null':       f'{articulo} {campo} no puede ser nulo',
        'invalid':    f'{articulo} {campo} no tiene un formato válido',
        'max_length': f'{articulo} {campo} es demasiado largo',
        'min_length': f'{articulo} {campo} es demasiado corto',
    }


# ! ENTRADA

class CatalogoSerializer(serializers.Serializer):
    nombre = serializers.CharField(
                max_length=50, allow_blank=False, trim_whitespace=True,
                error_messages=msg('nombre'))

    
class CiudadInputSerializer(serializers.Serializer):
    nombre = serializers.CharField(
        max_length=50, allow_blank=False, trim_whitespace=True,
        error_messages=msg('nombre'))
    departamento_id = serializers.IntegerField(
        required=True,
        error_messages=msg('departamento'))