from rest_framework import serializers
from calificaciones.models import Calificacion
from django.utils import timezone
from datetime import timedelta

# SERIALIZER DE SALIDA

class CalificacionSalidaSerializer(serializers.ModelSerializer):

    class Meta:
        model = Calificacion
        
        fields = [
            "id",
            "id_cita",
            "puntuacion",
            "comentario",
            "fecha_creacion",
            "es_publica",
            "fecha_actualizacion"
        ]

        read_only_fields = fields

# SERIALIZER DE CALIFICACIONES PÚBLICAS

class CalificacionPublicaSerializer(serializers.ModelSerializer):

    class Meta:
        model = Calificacion

        fields = [
            "id",
            "puntuacion",
            "comentario",
            "fecha_creacion"
        ]

        read_only_fields = fields
        
class CalificacionEnCitaSerializer(serializers.ModelSerializer):

    puede_editar = serializers.SerializerMethodField()

    class Meta:
        model = Calificacion

        fields = [
            "id",
            "puntuacion",
            "comentario",
            "fecha_creacion",
            "puede_editar",
            "es_publica",
        ]

        read_only_fields = fields

    def get_puede_editar(self, obj):

        fecha_limite = obj.fecha_creacion + timedelta(hours=24)

        return timezone.now() <= fecha_limite

# SERIALIZER DE ENTRADA

class CrearCalificacionSerializer(serializers.Serializer):

    id_cita = serializers.IntegerField(
        min_value=1,
        error_messages={
            "required": "La cita es obligatoria.",
            "invalid": "El identificador de la cita debe ser un número entero.",
            "min_value": "El identificador de la cita no es válido."
        }
    )

    puntuacion = serializers.IntegerField(
        min_value=1,
        max_value=5,
        error_messages={
            "required": "La puntuación es obligatoria.",
            "invalid": "La puntuación debe ser un número entero.",
            "min_value": "La puntuación mínima es de 1 estrella.",
            "max_value": "La puntuación máxima es de 5 estrellas."
        }
    )

    comentario = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=1000,
        trim_whitespace=True,
        error_messages={
            "invalid": "El comentario debe ser un texto válido.",
            "max_length": "El comentario no puede superar los 1000 caracteres."
        }
    )
    
    es_publica = serializers.BooleanField(
        required=False,
        default=False,
        error_messages={
            "invalid": "La autorización de publicación no es válida."
        }
    )
    
# SERIALIZER PARA ACTUALIZAR CALIFICACIONES

class ActualizarCalificacionSerializer(serializers.Serializer):

    puntuacion = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=5,
        error_messages={
            "invalid": "La puntuación debe ser un número entero.",
            "min_value": "La puntuación mínima es de 1 estrella.",
            "max_value": "La puntuación máxima es de 5 estrellas."
        }
    )

    comentario = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=1000,
        trim_whitespace=True,
        error_messages={
            "invalid": "El comentario debe ser un texto válido.",
            "max_length": "El comentario no puede superar los 1000 caracteres."
        }
    )

    def validate(self, attrs):

        if not attrs:
            raise serializers.ValidationError({
                "mensaje": "Debes proporcionar al menos un campo para actualizar."
            })

        return attrs 
    
class ActualizarVisibilidadCalificacionSerializer(serializers.Serializer):

    es_publica = serializers.BooleanField(
        required=True,
        error_messages={
            "required": "Debes indicar la visibilidad de la calificación.",
            "invalid": "La visibilidad proporcionada no es válida."
        }
    )