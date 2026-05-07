from rest_framework import serializers
from historial_medico.models import HistorialClinico

# ─── MENSAJES ────────────────────────────────────────────────────────────────

def msg(campo, articulo='El'):
    return {
        'required': f'{articulo} {campo} es obligatorio',
        'blank':    f'{articulo} {campo} no puede estar vacío',
        'null':     f'{articulo} {campo} no puede ser nulo',
        'invalid':  f'{articulo} {campo} no tiene un formato válido',
    }

# ─── SALIDA ──────────────────────────────────────────────────────────────────

class HistorialClinicoSerializer(serializers.ModelSerializer):
    paciente = serializers.CharField(source='usuario.nombre')
    medico   = serializers.SerializerMethodField()
    cita_id  = serializers.IntegerField(source='cita.id')

    class Meta:
        model  = HistorialClinico
        fields = [
            'id',
            'diagnostico_general',
            'observaciones',
            'motivo_consulta',
            'fecha_creacion',
            'paciente',
            'medico',
            'cita_id'
        ]

    def get_medico(self, obj):
        return f"{obj.medico.nombre} {obj.medico.apellido}"


# ─── ENTRADA ─────────────────────────────────────────────────────────────────

class CrearHistorialSerializer(serializers.Serializer):
    diagnostico_general = serializers.CharField(
                              allow_blank=False,
                              trim_whitespace=True,
                              error_messages=msg('diagnóstico general', 'El'))
    observaciones       = serializers.CharField(
                              required=False,
                              allow_blank=True,
                              trim_whitespace=True,
                              error_messages=msg('observaciones', 'Las'))
    motivo_consulta     = serializers.CharField(
                              allow_blank=False,
                              trim_whitespace=True,
                              error_messages=msg('motivo de consulta', 'El'))
    cita_id             = serializers.IntegerField(
                              error_messages={
                                  'required': 'La cita es obligatoria',
                                  'invalid':  'El id de la cita debe ser un número válido'
                              })


class EditarHistorialSerializer(serializers.Serializer):
    diagnostico_general = serializers.CharField(
                              required=False,
                              allow_blank=False,
                              trim_whitespace=True,
                              error_messages=msg('diagnóstico general', 'El'))
    observaciones       = serializers.CharField(
                              required=False,
                              allow_blank=True,
                              trim_whitespace=True,
                              error_messages=msg('observaciones', 'Las'))
    motivo_consulta     = serializers.CharField(
                              required=False,
                              allow_blank=False,
                              trim_whitespace=True,
                              error_messages=msg('motivo de consulta', 'El'))