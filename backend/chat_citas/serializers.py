from rest_framework import serializers
from .models import Mensaje, AdjuntoConversacion


class AdjuntoSerializer(serializers.ModelSerializer):
    nombre = serializers.CharField(source='archivo.nombre_original')
    content_type = serializers.CharField(source='archivo.content_type')
    tamano = serializers.IntegerField(source='archivo.tamano')

    class Meta:
        model = AdjuntoConversacion
        fields = ['id', 'nombre', 'content_type', 'tamano']


class MensajeSerializer(serializers.ModelSerializer):
    emisor = serializers.SerializerMethodField()
    adjuntos = AdjuntoSerializer(many=True, read_only=True)

    def get_emisor(self, obj):
        if obj.emisor_usuario_id:
            return {'tipo': 'paciente', 'id': obj.emisor_usuario_id}
        if obj.emisor_medico_id:
            return {'tipo': 'medico', 'id': obj.emisor_medico_id}
        return None

    class Meta:
        model = Mensaje
        fields = ['id', 'conversacion_id', 'tipo', 'contenido', 'fecha_creacion',
                  'emisor', 'client_message_id', 'metadata', 'adjuntos']


class ConversacionSerializer(serializers.Serializer):
    """Proyección ya autorizada y calculada por queries, sin consultas ocultas."""
    def to_representation(self, instance):
        return instance


class StrictSerializer(serializers.Serializer):
    def to_internal_value(self, data):
        if not isinstance(data, dict) or set(data) - set(self.fields):
            raise serializers.ValidationError({'non_field_errors': ['Campos no permitidos']})
        return super().to_internal_value(data)


class StrictInteger(serializers.IntegerField):
    def to_internal_value(self, data):
        if isinstance(data, bool):
            raise serializers.ValidationError('Se requiere un entero')
        return super().to_internal_value(data)


class EnviarMensajeSerializer(StrictSerializer):
    client_message_id = serializers.UUIDField()
    contenido = serializers.CharField(required=False, default='', allow_blank=True, max_length=4000)
    modalidad = serializers.ChoiceField(choices=['mensaje', 'nota_previa'], default='mensaje')
    adjunto_ids = serializers.ListField(child=StrictInteger(min_value=1), max_length=5, default=list)


class LecturaSerializer(StrictSerializer):
    ultimo_mensaje_id = StrictInteger(min_value=1)
