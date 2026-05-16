from rest_framework import serializers
from .models import Medico, Especialidad

# ! SALIDA
class EspecialidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Especialidad
        fields = '__all__'

class MedicoSerializer(serializers.ModelSerializer):
    rol = serializers.CharField(source='id_rol.nombre')
    especialidad = serializers.CharField(source='id_especialidad.nombre')

    class Meta:
        model = Medico
        fields = ['id', 'nombre', 'apellido', 'correo', 'rol', 'especialidad']


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

class RegistrarMedicoSerializer(serializers.Serializer):
    nombre = serializers.CharField(
                max_length=100, allow_blank=False, trim_whitespace=True,
                error_messages=msg('nombre'))

    apellido = serializers.CharField(
                max_length=100, allow_blank=False, trim_whitespace=True,
                error_messages=msg('apellido'))

    cedula = serializers.CharField(
                min_length=6, max_length=10,
                allow_blank=False, trim_whitespace=True,
                error_messages={
                    **msg('cédula', 'La'),
                    'min_length': 'La cédula debe tener mínimo 6 dígitos',
                    'max_length': 'La cédula debe tener máximo 10 dígitos'
                })

    fecha_nacimiento = serializers.DateField(
                        error_messages={
                            'required': 'La fecha de nacimiento es obligatoria',
                            'invalid':  'La fecha de nacimiento no tiene un formato válido'
                        })

    telefono = serializers.CharField(
                max_length=20, required=False, allow_blank=True,
                trim_whitespace=True, error_messages=msg('teléfono'))

    correo = serializers.EmailField(
                trim_whitespace=True,
                error_messages={
                    **msg('correo'),
                    'invalid': 'El correo no tiene un formato válido'
                })

    contraseña = serializers.CharField(
                    min_length=8,
                    error_messages={
                        **msg('contraseña', 'La'),
                        'min_length': 'La contraseña debe tener mínimo 8 caracteres'
                    })

    id_especialidad = serializers.IntegerField(
                        error_messages={
                            'required': 'La especialidad es obligatoria',
                            'invalid':  'La especialidad debe ser un número válido'
                        })


class EditarMedicoSerializer(serializers.Serializer):
    nombre = serializers.CharField(
                max_length=100, allow_blank=False, trim_whitespace=True,
                required=False, error_messages=msg('nombre'))

    apellido = serializers.CharField(
                max_length=100, allow_blank=False, trim_whitespace=True,
                required=False, error_messages=msg('apellido'))

    telefono = serializers.CharField(
                max_length=20, allow_blank=True, trim_whitespace=True,
                required=False, error_messages=msg('teléfono'))

    correo = serializers.EmailField(
                trim_whitespace=True, required=False,
                error_messages={
                    **msg('correo'),
                    'invalid': 'El correo no tiene un formato válido'
                })

    fecha_nacimiento = serializers.DateField(
                        required=False,
                        error_messages={
                            'invalid': 'La fecha de nacimiento no tiene un formato válido'
                        })

    id_especialidad = serializers.IntegerField(
                        required=False,
                        error_messages={
                            'invalid': 'La especialidad debe ser un número válido'
                        })


class LoginMedicoSerializer(serializers.Serializer):
    correo = serializers.EmailField(
                trim_whitespace=True,
                error_messages={
                    **msg('correo'),
                    'invalid': 'El correo no tiene un formato válido'
                })

    contraseña = serializers.CharField(
                    error_messages=msg('contraseña', 'La'))


class SolicitarCambioMedicoSerializer(serializers.Serializer):
    correo = serializers.EmailField(
                trim_whitespace=True,
                error_messages={
                    **msg('correo'),
                    'invalid': 'El correo no tiene un formato válido'
                })


class CambiarContraseñaMedicoSerializer(serializers.Serializer):
    token = serializers.CharField(
                error_messages=msg('token'))

    nueva_contraseña = serializers.CharField(
                        min_length=8,
                        error_messages={
                            **msg('contraseña', 'La'),
                            'min_length': 'La contraseña debe tener al menos 8 caracteres'
                        })
    
class RegistrarEspecialidadSerializer(serializers.Serializer):
    nombre = serializers.CharField(
        max_length=100,
        allow_blank=False,
        trim_whitespace=True,
        error_messages=msg('especialidad', 'La')
    )