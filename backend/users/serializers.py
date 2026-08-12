from rest_framework import serializers
from users.models import Usuario
from medicos.models import Medico
from utils import validarNumber,validarContraseña,calcular_edad
import re
from datetime import date
#!SALIDA
class UsuarioSerializer(serializers.ModelSerializer):
    rol = serializers.CharField(source='id_rol.nombre')
    
    class Meta:
        model = Usuario
        fields = ['id', 'nombre', 'apellido', 'correo', 'rol','telefono','cedula']

class MedicoSerializer(serializers.ModelSerializer):
    rol = serializers.CharField(source='id_rol.nombre')
    especialidad = serializers.CharField(source='id_especialidad.nombre')    # Nombre de la especialidad
    ciudad = serializers.CharField(source='ciudad.nombre')                   # Nombre de la ciudad
    departamento = serializers.CharField(source='ciudad.departamento.nombre') # Departamento de la ciudad
    class Meta:
        model = Medico
        fields = ['id', 'nombre', 'apellido', 'correo', 'rol','telefono','especialidad', 'ciudad', 'departamento', 'direccion','cedula']
        
class UsuarioPerfilSerializer(serializers.ModelSerializer):
    rol = serializers.CharField(source='id_rol.nombre')
    edad = serializers.SerializerMethodField()
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
            'edad',
            'rol'
        ]
    def get_edad(self, obj):
        return calcular_edad(obj.fecha_nacimiento)
       
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
        error = validarNumber(value)
        if error:
            raise serializers.ValidationError(error)
        return value
    
    telefono = serializers.CharField(
                max_length=20, required=True, allow_blank=True,
                trim_whitespace=True, error_messages=msg('teléfono'))
    
    def validate_telefono(self, value):
        error = validarNumber(value)
        if error:
            raise serializers.ValidationError(error)
        return value
    
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
        max_length=100,
        allow_blank=False,
        trim_whitespace=True,
        required=False,
        error_messages=msg('nombre')
    )
    apellido = serializers.CharField(
        max_length=100,
        allow_blank=False,
        trim_whitespace=True,
        required=False,
        error_messages=msg('apellido')
    )
    correo = serializers.EmailField(
        trim_whitespace=True,
        required=False,
        error_messages={
            **msg('correo'),
            'invalid': 'El correo no tiene un formato válido'
        }
    )
    telefono = serializers.CharField(
        min_length=10,
        max_length=10,
        allow_blank=False,
        trim_whitespace=True,
        required=True,
        error_messages={
            **msg('teléfono'),
            'min_length': 'El teléfono debe tener 10 dígitos',
            'max_length': 'El teléfono debe tener 10 dígitos',
        }
    )
    fecha_nacimiento = serializers.DateField(
        required=False,
        error_messages={
            'invalid': 'La fecha de nacimiento no tiene un formato válido'
        }
    )
    estatura = serializers.FloatField(
        min_value=0.5,
        max_value=2.5,
        required=False,
        error_messages=msg_numero('estatura', 'La')
    )
    peso = serializers.FloatField(
        min_value=1.0,
        max_value=500.0,
        required=False,
        error_messages=msg_numero('peso')
    )
    def validate_nombre(self, value):
        if len(value) < 2:
            raise serializers.ValidationError(
                "El nombre debe tener al menos 2 caracteres"
            )
        if not re.fullmatch(
            r"[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]+",
            value
        ):
            raise serializers.ValidationError(
                "El nombre solo puede contener letras"
            )
        return value
    def validate_apellido(self, value):
        if len(value) < 2:
            raise serializers.ValidationError(
                "El apellido debe tener al menos 2 caracteres"
            )
        if not re.fullmatch(
            r"[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]+",
            value
        ):
            raise serializers.ValidationError(
                "El apellido solo puede contener letras"
            )
        return value

    def validate_correo(self, value):
        value = value.lower()

        request = self.context.get("request")

        if request:
            existe = Usuario.objects.filter(
                correo__iexact=value
            ).exclude(
                pk=request.user.pk
            ).exists()

            if existe:
                raise serializers.ValidationError(
                    "Este correo ya se encuentra registrado"
                )

        return value

    def validate_telefono(self, value):
        if not value.isdigit():
            raise serializers.ValidationError(
                "El teléfono solo puede contener números"
            )

        if not value.startswith("3"):
            raise serializers.ValidationError(
                "El número de celular debe comenzar por 3"
            )

        return value

    def validate_fecha_nacimiento(self, value):
        hoy = date.today()

        if value > hoy:
            raise serializers.ValidationError(
                "La fecha de nacimiento no puede estar en el futuro"
            )

        if value.year < 1900:
            raise serializers.ValidationError(
                "La fecha de nacimiento no es válida"
            )

        return value


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