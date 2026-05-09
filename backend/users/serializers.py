from rest_framework import serializers
from users.models import Usuario
from medicos.models import Medico
from utils import valdarCedulaNumber,validarContraseña
#!SALIDA
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
        
class UsuarioPerfilSerializer(serializers.ModelSerializer):
    rol = serializers.CharField(source='id_rol.nombre')

    class Meta:
        model  = Usuario
        fields = [
            'id',
            'nombre',
            'apellido',
            'correo',
            'cedula',
            'telefono',
            'estatura',
            'peso',
            'fecha_nacimiento',
            'rol'
        ]
       
#! MENSAJES REUTILIZABLES

def msg(campo, articulo = 'El'):
    return {
        'required': f'{articulo} {campo} es obligatorio',
        'blank':    f'{articulo}  {campo} no puede estar vacío',
        'null':     f'{articulo}  {campo} no puede ser nulo',
        'invalid':  f'{articulo}  {campo} no tiene un formato válido',
        'max_length': f'{articulo}  {campo} es demasiado largo',
        'min_length': f'{articulo}  {campo} es demasiado corto',
    }

def msg_numero(campo, articulo = 'El'):
    return {
        'required':   f'{articulo} {campo} es obligatorio',
        'invalid':    f'{articulo} {campo} debe ser un número válido',
        'min_value':  f'{articulo}  {campo} ingresado es demasiado bajo',
        'max_value':  f'{articulo}  {campo} ingresado es demasiado alto',
    }


#!ENTRADA

class RegistrarUsuarioSerializer(serializers.Serializer):
    nombre =serializers.CharField(
            max_length=100, allow_blank=False, trim_whitespace=True,
            error_messages=msg('nombre'))
    
    apellido = serializers.CharField(
                max_length=100, allow_blank=False, trim_whitespace=True,
                error_messages=msg('apellido'))
    
    correo = serializers.EmailField(
            trim_whitespace=True,
            error_messages={
                **msg('correo'),
                'invalid': 'El correo no tiene un formato válido'
            })
    
    contraseña = serializers.CharField(
                min_length=8,
                error_messages={
                    **msg('contraseña','La'),
                    'min_length': 'La contraseña debe tener mínimo 8 dígitos'
                })
    
    def validate_contraseña(self, value):
        error = validarContraseña(value)
        if error:
            raise serializers.ValidationError(error)
        return value
    
    cedula = serializers.CharField(
            min_length=6,
            max_length=10,
            allow_blank=False,
            trim_whitespace=True,
            error_messages={
                **msg('cédula','La'),
                'min_length': 'La cédula debe tener mínimo 6 dígitos',
                'max_length': 'La cédula debe tener máximo 10 dígitos'
            }
        )
    
    def validate_cedula(self, value):
        error = valdarCedulaNumber(value)
        if error:
            raise serializers.ValidationError(error)
        return value
    
    telefono = serializers.CharField(
                max_length=20, required=True, allow_blank=True,
                trim_whitespace=True, error_messages=msg('teléfono'))
    
    fecha_nacimiento = serializers.DateField(
                        error_messages={
                            'required': 'La fecha de nacimiento es obligatoria',
                            'invalid':  'La fecha de nacimiento no tiene un formato válido'
                        })
    
    estatura = serializers.FloatField(
                min_value=0.5, max_value=2.5,
                error_messages=msg_numero('estatura','La'))
    
    peso = serializers.FloatField(
                min_value=1.0, max_value=500.0,
                error_messages=msg_numero('peso'))


class EditarUsuarioSerializer(serializers.Serializer):
    nombre = serializers.CharField(
                max_length=100, allow_blank=False, trim_whitespace=True,
                required=False, error_messages=msg('nombre'))
    
    apellido = serializers.CharField(
                max_length=100, allow_blank=False, trim_whitespace=True,
                required=False, error_messages=msg('apellido'))
    
    correo = serializers.EmailField(
                trim_whitespace=True, required=False,
                error_messages={**msg('correo'), 'invalid': 'El correo no tiene un formato válido'})
    
    telefono = serializers.CharField(
                max_length=20, allow_blank=True, trim_whitespace=True,
                required=False, error_messages=msg('teléfono'))
    
    fecha_nacimiento = serializers.DateField(
                        required=False,
                        error_messages={
                            'invalid': 'La fecha de nacimiento no tiene un formato válido'
                        })
    
    estatura = serializers.FloatField(
                min_value=0.5, max_value=2.5, required=False,
                error_messages=msg_numero('estatura','La'))    
                   
    peso = serializers.FloatField(
            min_value=1.0, max_value=500.0, required=False,
            error_messages=msg_numero('peso'))


class LoginSerializer(serializers.Serializer):
    correo = serializers.EmailField(
                trim_whitespace=True,
                error_messages={**msg('correo'), 'invalid': 'El correo no tiene un formato válido'})
    
    contraseña = serializers.CharField(
                    error_messages=msg('contraseña'))


class SolicitarCambioSerializer(serializers.Serializer):
    correo = serializers.EmailField(
                 trim_whitespace=True,
                 error_messages={**msg('correo'), 'invalid': 'El correo no tiene un formato válido'})


class CambiarContraseñaSerializer(serializers.Serializer):
    token = serializers.CharField(
                           error_messages=msg('token'))
    nueva_contraseña = serializers.CharField(
                           min_length=8,
                           error_messages={
                               **msg('contraseña'),
                               'min_length': 'La contraseña debe tener al menos 8 caracteres'
                           })
    def validate_nueva_contraseña(self, value):
        error = validarContraseña(value)
        if error:
            raise serializers.ValidationError(error)
        return value