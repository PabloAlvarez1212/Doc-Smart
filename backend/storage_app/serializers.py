from rest_framework import serializers

from storage_app.models import Archivo


class ArchivoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Archivo
        fields = [
            "id",
            "nombre_original",
            "storage_key",
            "content_type",
            "tamano",
            "tipo",
            "categoria",
            "fecha_subida",
            "activo",
        ]
        read_only_fields = [
            "id",
            "storage_key",
            "content_type",
            "tamano",
            "fecha_subida",
            "activo",
        ]


class SubirArchivoSerializer(serializers.Serializer):
    archivo = serializers.FileField()

    categoria = serializers.CharField(
        max_length=100,
        required=False,
        default="general",
    )

    referencia_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
    )