from rest_framework import serializers
from django.utils import timezone
from .models import Cita, RecordatorioCita

def msg(campo, articulo='El'):
    return {
        'required': f'{articulo} {campo} es obligatorio',
        'blank':    f'{articulo} {campo} no puede estar vacío',
        'null':     f'{articulo} {campo} no puede ser nulo',
        'invalid':  f'{articulo} {campo} no tiene un formato válido',
    }

def msg_numero(campo, articulo='El'):
    return {
        'required':  f'{articulo} {campo} es obligatorio',
        'invalid':   f'{articulo} {campo} debe ser un número válido',
        'min_value': f'{articulo} {campo} ingresado es demasiado bajo',
        'max_value': f'{articulo} {campo} ingresado es demasiado alto',
    }

# ─── SALIDA ───────────────────────────────────────────────────────────────────

class CitaSerializer(serializers.ModelSerializer):
    paciente = serializers.SerializerMethodField()
    medico   = serializers.SerializerMethodField()
    estado   = serializers.CharField(source='id_estado.nombre')
    ciudad    = serializers.CharField(source='id_medico.ciudad.nombre', allow_null=True, read_only=True)
    departamento = serializers.CharField(source='id_medico.ciudad.departamento.nombre', allow_null=True, read_only=True)
    direccion = serializers.CharField(source='id_medico.direccion')
    especialidad = serializers.CharField(source='id_medico.id_especialidad.nombre')
    foto_paciente = serializers.SerializerMethodField()
    foto_medico = serializers.SerializerMethodField()
    id_medico = serializers.IntegerField(source="id_medico_id",read_only=True,)
    class Meta:
        model  = Cita
        fields = [
            'id',
            'fecha_programada',
            'fecha_final',
            'fecha_cancelacion',
            'estado',
            'paciente',
            'medico',
            'departamento',
            'ciudad',
            'direccion',
            'especialidad',
            'foto_paciente',
            'foto_medico',
            'id_medico',
            'codigo_cita',
            'motivo_consulta',
        ]

    def get_medico(self, obj):
        return f"{obj.id_medico.nombre} {obj.id_medico.apellido}"

    def get_paciente(self, obj):
        return f"{obj.id_usuario.nombre} {obj.id_usuario.apellido}"

    def get_foto_paciente(self, obj):
        if obj.id_usuario.foto_perfil:
            return obj.id_usuario.foto_perfil.url

        return None

    def get_foto_medico(self, obj):
        if obj.id_medico.foto_perfil:
            return obj.id_medico.foto_perfil.url

        return None


class RecordatorioSerializer(serializers.ModelSerializer):
    estado = serializers.CharField(source='id_estado.nombre')
    medio  = serializers.CharField(source='id_medios.nombre')

    class Meta:
        model  = RecordatorioCita
        fields = [
            'id',
            'fecha_programada',
            'fecha_envio_recordatorio',
            'estado',
            'medio'
        ]

# ─── ENTRADA ──────────────────────────────────────────────────────────────────

class CrearCitaSerializer(serializers.Serializer):
    fecha_programada = serializers.DateTimeField(
        error_messages={
            'required': 'La fecha programada es obligatoria',
            'invalid':  'La fecha programada no tiene un formato válido'
        })

    id_medico = serializers.IntegerField(error_messages=msg_numero('médico', 'El'))

    motivo_consulta = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=1000,
        error_messages={
            'required': 'El motivo de consulta es obligatorio',
            'blank': 'El motivo de consulta no puede estar vacío',
            'max_length': 'El motivo de consulta no puede superar los 1000 caracteres',
            'null': 'El motivo de consulta no puede ser nulo'
        })



class EditarCitaSerializer(serializers.Serializer):
    fecha_programada = serializers.DateTimeField(
                           required=False,
                           error_messages={
                               'invalid': 'La fecha programada no tiene un formato válido'
                           })

class FiltroEstadisticasCitasSerializer(serializers.Serializer):
    anio = serializers.IntegerField(
        required=False
    )

    mes = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=12
    )

    def validate(self, data):
        anio = data.get("anio")
        mes = data.get("mes")

        if mes is not None and anio is None:
            raise serializers.ValidationError({
                "anio": "Debes seleccionar un año para filtrar por mes."
            })
            
        if anio is None:
            data["anio"] = timezone.localdate().year
            
        return data
