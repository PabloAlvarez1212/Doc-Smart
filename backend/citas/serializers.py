from rest_framework import serializers
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
    paciente = serializers.CharField(source='id_usuario.nombre')
    medico   = serializers.SerializerMethodField()
    estado   = serializers.CharField(source='id_estado.nombre')
    lugar    = serializers.CharField(source='id_lugar.nombre')

    class Meta:
        model  = Cita
        fields = [
            'id',
            'fecha_programada',
            'fecha_final',
            'estado',
            'paciente',
            'medico',
            'lugar'
        ]

    def get_medico(self, obj):
        return f"{obj.id_medico.nombre} {obj.id_medico.apellido}"


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
    id_cita                  = serializers.IntegerField(
                                   error_messages=msg_numero('cita', 'La'))
    fecha_programada = serializers.DateTimeField(
                           error_messages={
                               'required': 'La fecha programada es obligatoria',
                               'invalid':  'La fecha programada no tiene un formato válido'
                           })
    id_medico        = serializers.IntegerField(
                           error_messages=msg_numero('médico', 'El'))
    id_lugar         = serializers.IntegerField(
                           error_messages=msg_numero('lugar', 'El'))


class EditarCitaSerializer(serializers.Serializer):
    fecha_programada = serializers.DateTimeField(
                           required=False,
                           error_messages={
                               'invalid': 'La fecha programada no tiene un formato válido'
                           })
    id_lugar         = serializers.IntegerField(
                           required=False,
                           error_messages=msg_numero('lugar', 'El'))