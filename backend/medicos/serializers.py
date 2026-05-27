from rest_framework import serializers
from .models import Medico, Especialidad
from utils import validarContraseña, validarNumber

# ── SERIALIZERS DE SALIDA (lectura) ───────────────────────────────────────────

# Serializer simple para listar especialidades
class EspecialidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Especialidad
        fields = '__all__'

# Serializer de perfil del médico: expone campos legibles con nombres relacionados
class MedicoPerfilSerializer(serializers.ModelSerializer):
    rol = serializers.CharField(source='id_rol.nombre')                      # Nombre del rol en lugar del ID
    especialidad = serializers.CharField(source='id_especialidad.nombre')    # Nombre de la especialidad
    ciudad = serializers.CharField(source='ciudad.nombre')                   # Nombre de la ciudad
    departamento = serializers.CharField(source='ciudad.departamento.nombre') # Departamento de la ciudad

    class Meta:
        model = Medico
        fields = ['id', 'nombre', 'apellido', 'correo', 'rol', 'especialidad', 'ciudad', 'departamento', 'direccion']


# ── HELPER DE MENSAJES DE ERROR ───────────────────────────────────────────────

# Genera un diccionario estándar de mensajes de error para un campo dado
def msg(campo, articulo='El'):
    return {
        'required':   f'{articulo} {campo} es obligatorio',
        'blank':      f'{articulo} {campo} no puede estar vacío',
        'null':       f'{articulo} {campo} no puede ser nulo',
        'invalid':    f'{articulo} {campo} no tiene un formato válido',
        'max_length': f'{articulo} {campo} es demasiado largo',
        'min_length': f'{articulo} {campo} es demasiado corto',
    }


# ── SERIALIZERS DE ENTRADA (escritura / validación) ───────────────────────────

# Valida los datos necesarios para registrar un nuevo médico
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

    # Valida que la cédula contenga solo números
    def validate_cedula(self, value):
        error = validarNumber(value)
        if error:
            raise serializers.ValidationError(error)
        return value

    fecha_nacimiento = serializers.DateField(
        error_messages={
            'required': 'La fecha de nacimiento es obligatoria',
            'invalid':  'La fecha de nacimiento no tiene un formato válido'
        })

    telefono = serializers.CharField(
        max_length=20, trim_whitespace=True,
        error_messages=msg('teléfono'))

    # Valida que el teléfono contenga solo números
    def validate_telefono(self, value):
        error = validarNumber(value)
        if error:
            raise serializers.ValidationError(error)
        return value

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

    # Valida que la contraseña cumpla los requisitos de seguridad
    def validate_contraseña(self, value):
        error = validarContraseña(value)
        if error:
            raise serializers.ValidationError(error)
        return value

    id_especialidad = serializers.IntegerField(
        error_messages={
            'required': 'La especialidad es obligatoria',
            'invalid':  'La especialidad debe ser un número válido'
        })

    ciudad = serializers.IntegerField(
        error_messages={
            'required': 'La ciudad es obligatoria',
            'invalid':  'La ciudad debe ser un número válido'
        })

    direccion = serializers.CharField(
        max_length=100, allow_blank=False, trim_whitespace=True,
        error_messages=msg('dirección', 'La'))


# Valida los datos para actualizar un médico existente (todos los campos son opcionales)
class EditarMedicoSerializer(serializers.Serializer):
    nombre = serializers.CharField(
        max_length=100, allow_blank=False, trim_whitespace=True,
        required=False, error_messages=msg('nombre'))

    apellido = serializers.CharField(
        max_length=100, allow_blank=False, trim_whitespace=True,
        required=False, error_messages=msg('apellido'))

    telefono = serializers.CharField(
        max_length=20, allow_blank=False, trim_whitespace=True,
        required=False, error_messages=msg('teléfono'))

    # Valida que el teléfono, si se envía, contenga solo números
    def validate_telefono(self, value):
        error = validarNumber(value)
        if error:
            raise serializers.ValidationError(error)
        return value

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

    ciudad = serializers.IntegerField(
        required=False,
        error_messages={
            'invalid': 'La ciudad debe ser un número válido'
        })

    direccion = serializers.CharField(
        max_length=100, allow_blank=False, trim_whitespace=True,
        required=False, error_messages=msg('dirección', 'La'))


# Valida credenciales de inicio de sesión de un médico
class LoginMedicoSerializer(serializers.Serializer):
    correo = serializers.EmailField(
        trim_whitespace=True,
        error_messages={
            **msg('correo'),
            'invalid': 'El correo no tiene un formato válido'
        })

    contraseña = serializers.CharField(
        error_messages=msg('contraseña', 'La'))


# Valida el correo para solicitar un cambio de contraseña
class SolicitarCambioMedicoSerializer(serializers.Serializer):
    correo = serializers.EmailField(
        trim_whitespace=True,
        error_messages={
            **msg('correo'),
            'invalid': 'El correo no tiene un formato válido'
        })


# Valida el token y la nueva contraseña para completar el cambio
class CambiarContraseñaMedicoSerializer(serializers.Serializer):
    token = serializers.CharField(
        error_messages=msg('token'))

    nueva_contraseña = serializers.CharField(
        min_length=8,
        error_messages={
            **msg('contraseña', 'La'),
            'min_length': 'La contraseña debe tener al menos 8 caracteres'
        })

    # Valida que la nueva contraseña cumpla los requisitos de seguridad
    def validate_nueva_contraseña(self, value):
        error = validarContraseña(value)
        if error:
            raise serializers.ValidationError(error)
        return value


# Valida los datos para crear una nueva especialidad
class RegistrarEspecialidadSerializer(serializers.Serializer):
    nombre = serializers.CharField(
        max_length=100, allow_blank=False, trim_whitespace=True,
        error_messages=msg('especialidad', 'La'))


# Valida los datos para editar una especialidad existente
class EditarEspecialidadSerializer(serializers.Serializer):
    nombre = serializers.CharField(
        max_length=100, allow_blank=False, trim_whitespace=True,
        error_messages=msg('especialidad', 'La'))