from rest_framework import serializers
from .models import Medico, Especialidad,SolicitudValidacionMedico
from utils import validarContraseña, validarNumber
from datetime import date


# ── SERIALIZERS DE SALIDA (lectura) ───────────────────────────────────────────

# Serializer simple para listar especialidades
class EspecialidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Especialidad
        fields = '__all__'

class SolicitudValidacionMedicoSerializer(serializers.ModelSerializer):
    
    medico_id = serializers.IntegerField(source="medico.id",read_only=True)
    nombre = serializers.CharField(source="medico.nombre",read_only=True)
    apellido = serializers.CharField(source="medico.apellido",read_only=True)
    cedula = serializers.CharField(source="medico.cedula",read_only=True)
    especialidad_id = serializers.IntegerField(source="medico.id_especialidad.id",read_only=True)
    especialidad = serializers.CharField(source="medico.id_especialidad.nombre",read_only=True)
    ciudad_id = serializers.IntegerField(source="medico.ciudad.id",read_only=True)
    ciudad = serializers.CharField(source="medico.ciudad.nombre",read_only=True)
    departamento_id = serializers.IntegerField(source="medico.ciudad.departamento.id",read_only=True)
    departamento = serializers.CharField(source="medico.ciudad.departamento.nombre",read_only=True)
    hoja_vida_id = serializers.IntegerField(source="hoja_vida.id",read_only=True)
    hoja_vida_nombre = serializers.CharField(source="hoja_vida.nombre_original",read_only=True)

    class Meta:
        model = SolicitudValidacionMedico
        fields = [
            "id",
            "medico_id",
            "nombre",
            "apellido",
            "cedula",
            "especialidad_id",
            "especialidad",
            "ciudad_id",
            "ciudad",
            "departamento_id",
            "departamento",
            "estado",
            "fecha_solicitud",
            "hoja_vida_id",
            "hoja_vida_nombre",
        ]

class MedicosPublicosSerializer(serializers.ModelSerializer):
    especialidad = serializers.CharField(source='id_especialidad.nombre')
    departamento = serializers.SerializerMethodField()
    ciudad = serializers.SerializerMethodField()
    foto_perfil = serializers.SerializerMethodField()
    class Meta:
        model = Medico
        fields = [
            'id',
            'nombre',
            'apellido',
            'direccion',
            'especialidad',
            'departamento',
            'ciudad',
            'foto_perfil',
        ]
    def get_departamento(self, obj):
        if obj.ciudad and obj.ciudad.departamento:
            return obj.ciudad.departamento.nombre
        return None

    def get_ciudad(self, obj):
        if obj.ciudad:
            return obj.ciudad.nombre
        return None

    def get_foto_perfil(self, obj):
        if obj.foto_perfil:
            return obj.foto_perfil.url
        return None
        
class MedicoPerfilSerializer(serializers.ModelSerializer):

    rol = serializers.CharField(
        source='id_rol.nombre'
    )

    especialidad = serializers.CharField(
        source='id_especialidad.nombre'
    )

    especialidad_id = serializers.IntegerField(
        source='id_especialidad.id',
        read_only=True
    )

    ciudad = serializers.CharField(
        source='ciudad.nombre',
        allow_null=True,
        default=None
    )

    ciudad_id = serializers.IntegerField(
        source='ciudad.id',
        allow_null=True,
        read_only=True
    )

    departamento = serializers.CharField(
        source='ciudad.departamento.nombre',
        allow_null=True,
        default=None
    )

    edad = serializers.SerializerMethodField()

    foto_perfil = serializers.SerializerMethodField()

    def get_edad(self, obj):

        hoy = date.today()

        edad = hoy.year - obj.fecha_nacimiento.year

        if (
            hoy.month,
            hoy.day
        ) < (
            obj.fecha_nacimiento.month,
            obj.fecha_nacimiento.day
        ):
            edad -= 1

        return edad

    def get_foto_perfil(self, obj):

        if obj.foto_perfil:
            return obj.foto_perfil.url

        return None

    class Meta:

        model = Medico

        fields = [
            'id',
            'nombre',
            'apellido',
            'cedula',
            'fecha_nacimiento',
            'telefono',
            'correo',
            'edad',
            'rol',

            'especialidad_id',
            'especialidad',

            'ciudad_id',
            'ciudad',
            'departamento',

            'direccion',
            'foto_perfil'
        ]


# ── HELPER DE MENSAJES DE ERROR ───────────────────────────────────────────────

def msg(campo, articulo='El'):
    return {
        'required': f'{articulo} {campo} es obligatorio',
        'blank': f'{articulo} {campo} no puede estar vacío',
        'null': f'{articulo} {campo} no puede ser nulo',
        'invalid': f'{articulo} {campo} no tiene un formato válido',
        'max_length': f'{articulo} {campo} es demasiado largo',
        'min_length': f'{articulo} {campo} es demasiado corto',
    }


# ── SERIALIZERS DE ENTRADA ────────────────────────────────────────────────────

# Valida los datos necesarios para registrar un nuevo médico
class RegistrarMedicoSerializer(serializers.Serializer):

    nombre = serializers.CharField(
        max_length=100,
        allow_blank=False,
        trim_whitespace=True,
        error_messages=msg('nombre')
    )

    apellido = serializers.CharField(
        max_length=100,
        allow_blank=False,
        trim_whitespace=True,
        error_messages=msg('apellido')
    )

    cedula = serializers.CharField(
        min_length=6,
        max_length=10,
        allow_blank=False,
        trim_whitespace=True,
        error_messages={
            **msg('cédula', 'La'),
            'min_length': 'La cédula debe tener mínimo 6 dígitos',
            'max_length': 'La cédula debe tener máximo 10 dígitos'
        }
    )

    def validate_cedula(self, value):
        error = validarNumber(value)

        if error:
            raise serializers.ValidationError(error)

        return value

    fecha_nacimiento = serializers.DateField(
        error_messages={
            'required': 'La fecha de nacimiento es obligatoria',
            'invalid': 'La fecha de nacimiento no tiene un formato válido'
        }
    )

    def validate_fecha_nacimiento(self, value):
        hoy = date.today()

        if value > hoy:
            raise serializers.ValidationError("La fecha de nacimiento no puede ser futura")

        edad = hoy.year - value.year - (
            (hoy.month, hoy.day) < (value.month, value.day)
        )

        if edad < 18:
            raise serializers.ValidationError(
                "Debes ser mayor de edad para registrarte como médico"
            )

        return value
    
    hoja_vida = serializers.FileField(
        required=True,
        error_messages={
            "required": "La hoja de vida es obligatoria",
            "invalid": "La hoja de vida enviada no es un archivo válido"
        }
    )

    def validate_hoja_vida(self, value):
        max_size = 5 * 1024 * 1024

        if value.size > max_size:
            raise serializers.ValidationError(
                "La hoja de vida no puede superar los 5 MB"
            )

        if value.content_type != "application/pdf":
            raise serializers.ValidationError(
                "La hoja de vida debe estar en formato PDF"
            )

        return value

    telefono = serializers.CharField(
        max_length=20,
        trim_whitespace=True,
        error_messages=msg('teléfono')
    )

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
        }
    )

    contraseña = serializers.CharField(
        min_length=8,
        error_messages={
            **msg('contraseña', 'La'),
            'min_length': 'La contraseña debe tener mínimo 8 caracteres'
        }
    )

    def validate_contraseña(self, value):
        error = validarContraseña(value)

        if error:
            raise serializers.ValidationError(error)

        return value

    id_especialidad = serializers.IntegerField(
        error_messages={
            'required': 'La especialidad es obligatoria',
            'invalid': 'La especialidad debe ser un número válido'
        }
    )

    ciudad = serializers.IntegerField(
        error_messages={
            'required': 'La ciudad es obligatoria',
            'invalid': 'La ciudad debe ser un número válido'
        }
    )

    direccion = serializers.CharField(
        max_length=100,
        allow_blank=False,
        trim_whitespace=True,
        error_messages=msg('dirección', 'La')
    )


# Valida los datos para actualizar un médico
class EditarMedicoSerializer(serializers.Serializer):

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

    telefono = serializers.CharField(
        min_length=10,
        max_length=10,
        allow_blank=False,
        trim_whitespace=True,
        required=False,
        error_messages={
            **msg('teléfono'),
            'min_length': 'El teléfono debe tener 10 dígitos',
            'max_length': 'El teléfono debe tener 10 dígitos',
        }
    )

    def validate_telefono(self, value):
        error = validarNumber(value)

        if error:
            raise serializers.ValidationError(error)

        return value

    correo = serializers.EmailField(
        trim_whitespace=True,
        required=False,
        error_messages={
            **msg('correo'),
            'invalid': 'El correo no tiene un formato válido'
        }
    )

    fecha_nacimiento = serializers.DateField(
        required=False,
        error_messages={
            'invalid': 'La fecha de nacimiento no tiene un formato válido'
        }
    )

    id_especialidad = serializers.IntegerField(
        required=False,
        error_messages={
            'invalid': 'La especialidad debe ser un número válido'
        }
    )

    ciudad = serializers.IntegerField(
        required=False,
        error_messages={
            'invalid': 'La ciudad debe ser un número válido'
        }
    )

    direccion = serializers.CharField(
        max_length=100,
        allow_blank=False,
        trim_whitespace=True,
        required=False,
        error_messages=msg('dirección', 'La')
    )

# ── SERIALIZERS DE AUTENTICACIÓN ─────────────────────────────────────────────

# Valida credenciales de inicio de sesión de un médico
class LoginMedicoSerializer(serializers.Serializer):

    correo = serializers.EmailField(
        trim_whitespace=True,
        error_messages={
            **msg('correo'),
            'invalid': 'El correo no tiene un formato válido'
        }
    )

    contraseña = serializers.CharField(
        error_messages=msg('contraseña', 'La')
    )


# Valida el correo para solicitar un cambio de contraseña
class SolicitarCambioMedicoSerializer(serializers.Serializer):

    correo = serializers.EmailField(
        trim_whitespace=True,
        error_messages={
            **msg('correo'),
            'invalid': 'El correo no tiene un formato válido'
        }
    )


# Valida el token y la nueva contraseña
class CambiarContraseñaMedicoSerializer(serializers.Serializer):

    token = serializers.CharField(
        error_messages=msg('token')
    )

    nueva_contraseña = serializers.CharField(
        min_length=8,
        error_messages={
            **msg('contraseña', 'La'),
            'min_length': 'La contraseña debe tener al menos 8 caracteres'
        }
    )

    def validate_nueva_contraseña(self, value):
        error = validarContraseña(value)

        if error:
            raise serializers.ValidationError(error)

        return value


# ── SERIALIZERS DE ESPECIALIDADES ────────────────────────────────────────────

# Valida los datos para crear una nueva especialidad
class RegistrarEspecialidadSerializer(serializers.Serializer):

    nombre = serializers.CharField(
        max_length=100,
        allow_blank=False,
        trim_whitespace=True,
        error_messages=msg('especialidad', 'La')
    )


# Valida los datos para editar una especialidad
class EditarEspecialidadSerializer(serializers.Serializer):

    nombre = serializers.CharField(
        max_length=100,
        allow_blank=False,
        trim_whitespace=True,
        error_messages=msg('especialidad', 'La')
    )


# ── SERIALIZER DE FOTO DE PERFIL ──────────────────────────────────────────────

class FotoPerfilMedicoSerializer(serializers.Serializer):

    foto_perfil = serializers.ImageField(
        required=True,
        error_messages={
            'required': 'La foto de perfil es obligatoria',
            'invalid': 'El archivo enviado no es una imagen válida'
        }
    )

    def validate_foto_perfil(self, value):

        max_size = 5 * 1024 * 1024

        if value.size > max_size:

            raise serializers.ValidationError(
                'La imagen no puede superar los 5 MB'
            )

        return value