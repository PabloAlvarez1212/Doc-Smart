from rest_framework import serializers
from .models import Medico, Especialidad,SolicitudValidacionMedico, DisponibilidadMedico, ExcepcionDisponibilidadMedico
from utils import validarContraseña, validarNumber
from django.utils import timezone
from datetime import date


MAX_HOJA_VIDA_SIZE = 5 * 1024 * 1024


def validar_hoja_vida_pdf(archivo):
    if archivo.size > MAX_HOJA_VIDA_SIZE:
        raise serializers.ValidationError(
            "La hoja de vida no puede superar los 5 MB"
        )

    if archivo.content_type != "application/pdf":
        raise serializers.ValidationError(
            "La hoja de vida debe estar en formato PDF"
        )

    return archivo


# ── SERIALIZERS DE SALIDA (lectura) ───────────────────────────────────────────

# Serializer simple para listar especialidades
class EspecialidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Especialidad
        fields = '__all__'

class SolicitudValidacionMedicoSerializer(serializers.ModelSerializer):
    
    medico_id = serializers.IntegerField(source="medico.id",read_only=True)
    fecha_nacimiento = serializers.DateField(source="medico.fecha_nacimiento",read_only=True) 
    nombre = serializers.CharField(source="medico.nombre",read_only=True)
    apellido = serializers.CharField(source="medico.apellido",read_only=True)
    cedula = serializers.CharField(source="medico.cedula",read_only=True)
    correo = serializers.EmailField(source="medico.correo",read_only=True)
    telefono = serializers.CharField(source="medico.telefono",read_only=True)
    direccion = serializers.CharField(source="medico.direccion",read_only=True)
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
            "fecha_nacimiento",
            "cedula",
            "correo",
            "telefono",
            "direccion",
            "especialidad_id",
            "especialidad",
            "ciudad_id",
            "ciudad",
            "departamento_id",
            "departamento",
            "estado",
            "fecha_solicitud",
            "fecha_revision",
            "motivo_rechazo",
            "hoja_vida_id",
            "hoja_vida_nombre",
        ]

class ReintentarSolicitudValidacionSerializer(
    serializers.Serializer
):
    hoja_vida = serializers.FileField(
        required=True,
        error_messages={
            "required": "La hoja de vida es obligatoria",
            "invalid": "La hoja de vida enviada no es un archivo válido",
        },
    )

    def validate_hoja_vida(self, archivo):
        return validar_hoja_vida_pdf(archivo)

class MedicosPublicosSerializer(serializers.ModelSerializer):
    especialidad = serializers.CharField(source='id_especialidad.nombre')
    departamento = serializers.SerializerMethodField()
    ciudad = serializers.SerializerMethodField()
    foto_perfil = serializers.SerializerMethodField()
    proxima_disponibilidad = (serializers.SerializerMethodField())
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
            'proxima_disponibilidad'
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

    def get_proxima_disponibilidad(self, obj):
        return getattr(
            obj,
            "proxima_disponibilidad_calculada",
            None
        )
        
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

    estado_validacion = serializers.SerializerMethodField()
    
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

    def get_estado_validacion(self, obj):
        solicitud = obj.ultima_solicitud_validacion

        if not solicitud:
            return None

        return solicitud.estado

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
            'foto_perfil',
            'estado_validacion',
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
        return validar_hoja_vida_pdf(value)

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

#Serializer de rechazo a solicitud de un medico
class RechazarSolicitudValidacionSerializer(serializers.Serializer):
    motivo_rechazo = serializers.CharField(
        required=True,
        allow_blank=False,
        trim_whitespace=True
    )

class DisponibilidadMedicoSerializer(serializers.ModelSerializer):

    dia = serializers.CharField(
        source="get_dia_semana_display",
        read_only=True
    )

    class Meta:
        model = DisponibilidadMedico
        fields = [
            "id",
            "dia_semana",
            "dia",
            "hora_inicio",
            "hora_fin",
            "activo",
        ]


class BloqueDisponibilidadSerializer(serializers.Serializer):

    dia_semana = serializers.IntegerField(
        min_value=0,
        max_value=6,
        error_messages={
            "required": "El día de la semana es obligatorio",
            "invalid": "El día de la semana debe ser un número",
            "min_value": "El día de la semana debe estar entre 0 y 6",
            "max_value": "El día de la semana debe estar entre 0 y 6",
        }
    )

    hora_inicio = serializers.TimeField(
        error_messages={
            "required": "La hora de inicio es obligatoria",
            "invalid": "La hora de inicio no tiene un formato válido",
        }
    )

    hora_fin = serializers.TimeField(
        error_messages={
            "required": "La hora de finalización es obligatoria",
            "invalid": "La hora de finalización no tiene un formato válido",
        }
    )

    activo = serializers.BooleanField(
        default=True
    )

    def validate(self, data):

        if data["hora_inicio"] >= data["hora_fin"]:
            raise serializers.ValidationError({
                "hora_fin": (
                    "La hora de finalización debe ser "
                    "posterior a la hora de inicio"
                )
            })

        return data


class ActualizarDisponibilidadMedicoSerializer(
    serializers.Serializer
):
    duracion_consulta = serializers.IntegerField(
        min_value=10,
        max_value=180,
        required=True,
        error_messages={
            "required": (
                "La duración de la consulta es obligatoria"
            ),
            "invalid": (
                "La duración de la consulta debe ser un número"
            ),
            "min_value": (
                "La duración mínima de una consulta "
                "es de 10 minutos"
            ),
            "max_value": (
                "La duración máxima de una consulta "
                "es de 180 minutos"
            ),
        }
    )

    disponibilidad = BloqueDisponibilidadSerializer(
        many=True,
        required=True
    )

    def validate_disponibilidad(self, bloques):
        bloques_por_dia = {}

        for bloque in bloques:
            dia = bloque["dia_semana"]
            bloques_por_dia.setdefault(
                dia,
                []
            ).append(bloque)

        for dia, bloques_dia in (
            bloques_por_dia.items()
        ):
            bloques_ordenados = sorted(
                bloques_dia,
                key=lambda bloque: (
                    bloque["hora_inicio"]
                )
            )

            for indice in range(
                1,
                len(bloques_ordenados)
            ):
                anterior = bloques_ordenados[
                    indice - 1
                ]
                actual = bloques_ordenados[
                    indice
                ]

                if (
                    actual["hora_inicio"]
                    < anterior["hora_fin"]
                ):
                    raise serializers.ValidationError(
                        (
                            "Existen horarios que se "
                            f"solapan en el día {dia}."
                        )
                    )

        return bloques


class ExcepcionDisponibilidadMedicoSerializer(
    serializers.ModelSerializer
):

    tipo_display = serializers.CharField(
        source="get_tipo_display",
        read_only=True
    )

    class Meta:
        model = ExcepcionDisponibilidadMedico
        fields = [
            "id",
            "fecha",
            "tipo",
            "tipo_display",
            "hora_inicio",
            "hora_fin",
            "motivo",
        ]


class GuardarExcepcionDisponibilidadSerializer(
    serializers.Serializer
):

    fecha = serializers.DateField()

    tipo = serializers.ChoiceField(
        choices=ExcepcionDisponibilidadMedico.TipoExcepcion.choices
    )

    hora_inicio = serializers.TimeField(
        required=False,
        allow_null=True
    )

    hora_fin = serializers.TimeField(
        required=False,
        allow_null=True
    )

    motivo = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=255,
        default=""
    )

    def validate_fecha(self, fecha):

        if fecha < timezone.localdate():
            raise serializers.ValidationError(
                "No puedes crear excepciones en fechas pasadas."
            )

        return fecha

    def validate(self, data):

        tipo = data.get("tipo")

        hora_inicio = data.get("hora_inicio")
        hora_fin = data.get("hora_fin")

        if (
            tipo
            == ExcepcionDisponibilidadMedico
            .TipoExcepcion.NO_DISPONIBLE
        ):

            if hora_inicio is not None or hora_fin is not None:
                raise serializers.ValidationError({
                    "hora_inicio": (
                        "Una fecha no disponible no debe "
                        "tener horas configuradas."
                    )
                })

        elif (
            tipo
            == ExcepcionDisponibilidadMedico
            .TipoExcepcion.HORARIO_ESPECIAL
        ):

            if hora_inicio is None:
                raise serializers.ValidationError({
                    "hora_inicio": (
                        "La hora de inicio es obligatoria "
                        "para un horario especial."
                    )
                })

            if hora_fin is None:
                raise serializers.ValidationError({
                    "hora_fin": (
                        "La hora de finalización es obligatoria "
                        "para un horario especial."
                    )
                })

            if hora_inicio >= hora_fin:
                raise serializers.ValidationError({
                    "hora_fin": (
                        "La hora de finalización debe ser "
                        "posterior a la hora de inicio."
                    )
                })

        return data


class ConsultarHorariosDisponiblesSerializer(
    serializers.Serializer
):

    fecha = serializers.DateField(
        required=True,
        error_messages={
            "required": "La fecha es obligatoria",
            "invalid": (
                "La fecha debe tener formato YYYY-MM-DD"
            ),
        }
    )


class ConsultarDiasDisponiblesSerializer(
    serializers.Serializer
):

    desde = serializers.DateField(
        required=True,
        error_messages={
            "required": (
                "La fecha inicial es obligatoria"
            ),
            "invalid": (
                "La fecha inicial debe tener "
                "formato YYYY-MM-DD"
            ),
        }
    )

    hasta = serializers.DateField(
        required=True,
        error_messages={
            "required": (
                "La fecha final es obligatoria"
            ),
            "invalid": (
                "La fecha final debe tener "
                "formato YYYY-MM-DD"
            ),
        }
    )

    def validate(self, data):

        if data["hasta"] < data["desde"]:

            raise serializers.ValidationError({
                "hasta": (
                    "La fecha final debe ser posterior "
                    "o igual a la fecha inicial"
                )
            })

        return data

class HorarioEspecialSerializer(
    serializers.Serializer
):
    hora_inicio = serializers.TimeField(
        required=True,
        error_messages={
            "required": (
                "La hora de inicio es obligatoria"
            ),
            "invalid": (
                "La hora de inicio no tiene "
                "un formato válido"
            ),
        }
    )

    hora_fin = serializers.TimeField(
        required=True,
        error_messages={
            "required": (
                "La hora de finalización "
                "es obligatoria"
            ),
            "invalid": (
                "La hora de finalización no "
                "tiene un formato válido"
            ),
        }
    )

    def validate(self, data):
        if (
            data["hora_inicio"]
            >= data["hora_fin"]
        ):
            raise serializers.ValidationError({
                "hora_fin": (
                    "La hora de finalización debe "
                    "ser posterior a la hora de inicio."
                )
            })

        return data


class GuardarExcepcionFechaSerializer(
    serializers.Serializer
):
    fecha = serializers.DateField(
        required=True
    )

    tipo = serializers.ChoiceField(
        choices=(
            ExcepcionDisponibilidadMedico
            .TipoExcepcion.choices
        )
    )

    motivo = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=255,
        default=""
    )

    horarios = HorarioEspecialSerializer(
        many=True,
        required=False,
        default=list
    )

    def validate_fecha(self, fecha):
        if fecha < timezone.localdate():
            raise serializers.ValidationError(
                "No puedes configurar "
                "fechas pasadas."
            )

        return fecha

    def validate(self, data):
        tipo = data["tipo"]
        horarios = data.get(
            "horarios",
            []
        )

        tipo_no_disponible = (
            ExcepcionDisponibilidadMedico
            .TipoExcepcion.NO_DISPONIBLE
        )

        tipo_horario = (
            ExcepcionDisponibilidadMedico
            .TipoExcepcion.HORARIO_ESPECIAL
        )

        if tipo == tipo_no_disponible:
            if horarios:
                raise serializers.ValidationError({
                    "horarios": (
                        "Una fecha no disponible "
                        "no debe tener horarios."
                    )
                })

            return data

        if tipo == tipo_horario:
            if not horarios:
                raise serializers.ValidationError({
                    "horarios": (
                        "Debes configurar al menos "
                        "un horario especial."
                    )
                })

            horarios_ordenados = sorted(
                horarios,
                key=lambda bloque: (
                    bloque["hora_inicio"]
                )
            )

            for indice in range(
                1,
                len(horarios_ordenados)
            ):
                anterior = (
                    horarios_ordenados[
                        indice - 1
                    ]
                )

                actual = (
                    horarios_ordenados[
                        indice
                    ]
                )

                if (
                    actual["hora_inicio"]
                    < anterior["hora_fin"]
                ):
                    raise serializers.ValidationError({
                        "horarios": (
                            "Los horarios especiales "
                            "no pueden solaparse."
                        )
                    })

        return data

class FechaDisponibilidadSerializer(
    serializers.Serializer
):
    fecha = serializers.DateField()

    def validate_fecha(self, fecha):
        if fecha < timezone.localdate():
            raise serializers.ValidationError(
                "No puedes modificar "
                "fechas pasadas."
            )

        return fecha