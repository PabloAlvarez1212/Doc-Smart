
from rest_framework import serializers
from .models import Reporte, Sancion


class CrearReporteSerializer(serializers.Serializer):
    id_reportado = serializers.IntegerField(min_value=1)

    id_cita = serializers.IntegerField(
        min_value=1,
        required=False,
        allow_null=True
    )

    motivo = serializers.CharField(
        max_length=150,
        trim_whitespace=True
    )

    descripcion = serializers.CharField(
        max_length=2000,
        trim_whitespace=True,
        allow_blank=False
    )


class GestionarReporteSerializer(serializers.Serializer):

    ACCIONES = (
        ("revision", "En revisión"),
        ("descartar", "Descartar"),
        ("sancionar", "Sancionar"),
    )

    accion = serializers.ChoiceField(choices=ACCIONES)

    observacion_admin = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=2000
    )

    dias_suspension = serializers.IntegerField(
        min_value=1,
        max_value=30,
        required=False
    )

    def validate(self, attrs):
        if attrs["accion"] == "sancionar":
            if not attrs.get("dias_suspension"):
                raise serializers.ValidationError({
                    "dias_suspension": [
                        "Debes indicar los días de suspensión."
                    ]
                })

        return attrs


class SancionSerializer(serializers.ModelSerializer):
    esta_activa = serializers.BooleanField(read_only=True)

    class Meta:
        model = Sancion
        fields = [
            "id",
            "motivo",
            "fecha_inicio",
            "fecha_fin",
            "fecha_creacion",
            "anulada_en",
            "esta_activa",
        ]
        read_only_fields = fields


class ReporteSerializer(serializers.ModelSerializer):
    sancion = SancionSerializer(read_only=True)
    nombre_paciente = serializers.SerializerMethodField()
    nombre_medico = serializers.SerializerMethodField()
    codigo_cita = serializers.CharField(source="cita.codigo_cita", read_only=True, allow_null=True)

    def get_nombre_paciente(self, obj):
        return (
            f"{obj.paciente.nombre} "
            f"{obj.paciente.apellido}"
        ).strip()

    def get_nombre_medico(self, obj):
        return (
            f"{obj.medico.nombre} "
            f"{obj.medico.apellido}"
        ).strip()


    class Meta:
        model = Reporte
        fields = [
            "id",
            "paciente",
            "medico",
            "cita",
            "reportante",
            "motivo",
            "descripcion",
            "estado",
            "observacion_admin",
            "fecha_creacion",
            "fecha_revision",
            "sancion",
            "nombre_paciente",
            "nombre_medico",
        ]
        read_only_fields = fields
