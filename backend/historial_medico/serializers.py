import unicodedata

from rest_framework import serializers
from citas.models import DocumentoSeguimientoCita
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

class DocumentoSeguimientoHistorialSerializer(
    serializers.ModelSerializer
):
    nombre = serializers.CharField(
        source="archivo.nombre_original",
        read_only=True
    )

    content_type = serializers.CharField(
        source="archivo.content_type",
        read_only=True
    )

    tamano = serializers.IntegerField(
        source="archivo.tamano",
        read_only=True
    )

    class Meta:
        model = DocumentoSeguimientoCita

        fields = [
            "id",
            "nombre",
            "content_type",
            "tamano",
            "fecha_subida",
        ]

class HistorialClinicoSerializer(serializers.ModelSerializer):
    paciente = serializers.CharField(source='usuario.nombre')
    medico = serializers.SerializerMethodField()
    cita_id = serializers.IntegerField(read_only=True, allow_null=True)
    codigo_cita = serializers.CharField(
        source='cita.codigo_cita',
        read_only=True,
        allow_null=True,
    )
    especialidad = serializers.SerializerMethodField()
    documentos = serializers.SerializerMethodField()
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
            'codigo_cita',
            'documentos'
        ]

    def get_medico(self, obj):
        return f'{obj.medico.nombre} {obj.medico.apellido}'
    def get_especialidad(self,obj):
        return obj.medico.id_especialidad.nombre
    def get_documentos(self, obj):
        if not obj.cita_id:
            return []
        documentos_prefetch = getattr(
            obj.cita,
            "documentos_seguimiento_activos",
            None
        )
        if documentos_prefetch is not None:
            documentos = documentos_prefetch
        else:
            documentos = (
                obj.cita.documentos_seguimiento.filter(archivo__activo=True)
                .select_related("archivo").order_by("pk")
            )

        return (
            DocumentoSeguimientoHistorialSerializer(
                documentos,
                many=True
            ).data
        )


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


class FiltrosHistorialSerializer(serializers.Serializer):
    search = TextoClinicoField(
        required=False,
        allow_blank=True,
        trim_whitespace=True,
        max_length=100,
        error_messages=msg('término de búsqueda'),
    )
    period = serializers.ChoiceField(
        required=False,
        default='all',
        choices=('all', '3months', '6months', 'year'),
        error_messages={
            'invalid_choice': 'El periodo seleccionado no es válido.',
        },
    )
    doctor = TextoClinicoField(
        required=False,
        allow_blank=True,
        trim_whitespace=True,
        max_length=200,
        error_messages=msg('nombre del profesional'),
    )


class ProfesionalHistorialSerializer(serializers.Serializer):
    nombre = serializers.CharField(read_only=True)
