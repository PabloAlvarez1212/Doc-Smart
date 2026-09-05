import unicodedata

from rest_framework import serializers

from historial_medico.models import HistorialClinico, VersionHistorialClinico


LIMITES_TEXTO_CLINICO = {
    'diagnostico_general': 5000,
    'observaciones': 10000,
    'motivo_consulta': 2000,
}


def msg(campo, articulo='El'):
    return {
        'required': f'{articulo} {campo} es obligatorio',
        'blank': f'{articulo} {campo} no puede estar vacío',
        'null': f'{articulo} {campo} no puede ser nulo',
        'invalid': f'{articulo} {campo} no tiene un formato válido',
        'max_length': f'{articulo} {campo} supera la longitud máxima permitida',
    }


class TextoClinicoField(serializers.CharField):
    """Normaliza texto clínico y rechaza caracteres de control no imprimibles."""

    default_error_messages = {
        'control_chars': 'El texto contiene caracteres de control no permitidos.',
    }

    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        value = unicodedata.normalize('NFC', value)
        if any(
            unicodedata.category(character) == 'Cc'
            and character not in ('\n', '\r', '\t')
            for character in value
        ):
            self.fail('control_chars')
        return value


class VersionHistorialClinicoSerializer(serializers.ModelSerializer):
    medico_editor = serializers.SerializerMethodField()

    class Meta:
        model = VersionHistorialClinico
        fields = [
            'version',
            'diagnostico_general',
            'observaciones',
            'motivo_consulta',
            'motivo_cambio',
            'medico_editor',
            'fecha_creacion',
        ]

    def get_medico_editor(self, obj):
        return f'{obj.medico_editor.nombre} {obj.medico_editor.apellido}'


class HistorialClinicoSerializer(serializers.ModelSerializer):
    paciente = serializers.CharField(source='usuario.nombre')
    medico = serializers.SerializerMethodField()
    cita_id = serializers.IntegerField(read_only=True, allow_null=True)
    especialidad = serializers.SerializerMethodField()
    class Meta:
        model = HistorialClinico
        fields = [
            'id',
            'diagnostico_general',
            'observaciones',
            'motivo_consulta',
            'fecha_creacion',
            'version_actual',
            'paciente',
            'medico',
            'cita_id',
            'especialidad',
        ]

    def get_medico(self, obj):
        return f'{obj.medico.nombre} {obj.medico.apellido}'
    def get_especialidad(self,obj):
        return obj.medico.id_especialidad.nombre


class HistorialClinicoDetalleSerializer(HistorialClinicoSerializer):
    versiones = VersionHistorialClinicoSerializer(many=True, read_only=True)

    class Meta(HistorialClinicoSerializer.Meta):
        fields = HistorialClinicoSerializer.Meta.fields + ['versiones']


class CrearHistorialSerializer(serializers.Serializer):
    diagnostico_general = TextoClinicoField(
        allow_blank=False,
        trim_whitespace=True,
        max_length=LIMITES_TEXTO_CLINICO['diagnostico_general'],
        error_messages=msg('diagnóstico general'),
    )
    observaciones = TextoClinicoField(
        required=False,
        allow_blank=True,
        trim_whitespace=True,
        max_length=LIMITES_TEXTO_CLINICO['observaciones'],
        error_messages=msg('observaciones', 'Las'),
    )
    motivo_consulta = TextoClinicoField(
        allow_blank=False,
        trim_whitespace=True,
        max_length=LIMITES_TEXTO_CLINICO['motivo_consulta'],
        error_messages=msg('motivo de consulta'),
    )
    cita_id = serializers.IntegerField(
        min_value=1,
        error_messages={
            'required': 'La cita es obligatoria',
            'invalid': 'El id de la cita debe ser un número válido',
            'min_value': 'El id de la cita debe ser un número positivo',
        },
    )


class EditarHistorialSerializer(serializers.Serializer):
    diagnostico_general = TextoClinicoField(
        required=False,
        allow_blank=False,
        trim_whitespace=True,
        max_length=LIMITES_TEXTO_CLINICO['diagnostico_general'],
        error_messages=msg('diagnóstico general'),
    )
    observaciones = TextoClinicoField(
        required=False,
        allow_blank=True,
        trim_whitespace=True,
        max_length=LIMITES_TEXTO_CLINICO['observaciones'],
        error_messages=msg('observaciones', 'Las'),
    )
    motivo_consulta = TextoClinicoField(
        required=False,
        allow_blank=False,
        trim_whitespace=True,
        max_length=LIMITES_TEXTO_CLINICO['motivo_consulta'],
        error_messages=msg('motivo de consulta'),
    )
    motivo_cambio = TextoClinicoField(
        allow_blank=False,
        trim_whitespace=True,
        max_length=500,
        error_messages=msg('motivo del cambio'),
    )

    def validate(self, attrs):
        campos_clinicos = set(LIMITES_TEXTO_CLINICO)
        if not campos_clinicos.intersection(attrs):
            raise serializers.ValidationError(
                'Debes enviar al menos un campo clínico para actualizar.'
            )
        return attrs
