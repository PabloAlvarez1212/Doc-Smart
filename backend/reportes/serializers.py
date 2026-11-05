
from rest_framework import serializers
from .models import Reporte, Sancion, HistorialReporte


def nombreAdministrador(usuario):
    return f"{usuario.nombre} {usuario.apellido}".strip() if usuario else None


class CrearReporteSerializer(serializers.Serializer):
    id_reportado = serializers.IntegerField(min_value=1)

    id_cita = serializers.IntegerField(
        min_value=1,
        required=False,
        allow_null=True
    )

    motivo = serializers.ChoiceField(choices=Reporte.Motivo.choices)
    otro_motivo = serializers.CharField(max_length=150, required=False, allow_blank=True)
    evidencia = serializers.FileField(required=False, allow_empty_file=False)

    def validate_evidencia(self, archivo):
        from django.core.exceptions import ValidationError
        from storage_app.validators import validar_evidencia_reporte
        try:
            validar_evidencia_reporte(archivo)
        except ValidationError as error:
            raise serializers.ValidationError(error.messages)
        return archivo

    def validate(self, attrs):
        if attrs["motivo"] == Reporte.Motivo.OTRO:
            if not attrs.get("otro_motivo", "").strip():
                raise serializers.ValidationError({"otro_motivo": "Especifica el otro motivo."})
        else:
            attrs["otro_motivo"] = ""
        return attrs

    descripcion = serializers.CharField(
        max_length=2000,
        trim_whitespace=True,
        allow_blank=False
    )


class GestionarReporteSerializer(serializers.Serializer):

    ACCIONES = (
        ("revision", "En revisión"),
        ("descartar", "Descartar"),
        ("advertir", "Advertir"),
        ("sancionar", "Sancionar"),
    )

    accion = serializers.ChoiceField(choices=ACCIONES)
    tipo = serializers.ChoiceField(choices=Sancion.Tipo.choices, required=False)
    token_vista_previa = serializers.CharField(required=False, max_length=20000)
    observacion_reportante = serializers.CharField(required=False, allow_blank=True, max_length=2000)

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
        if attrs["accion"] != "revision" and not attrs.get("observacion_admin", "").strip():
            raise serializers.ValidationError({"observacion_admin": "Escribe el motivo de la decisión administrativa."})
        if attrs["accion"] != "sancionar":
            for campo in ("tipo", "dias_suspension", "token_vista_previa"):
                attrs.pop(campo, None)
        if attrs["accion"] == "revision":
            attrs.pop("observacion_admin", None)
            attrs.pop("observacion_reportante", None)
        if attrs["accion"] == "sancionar":
            attrs.setdefault("tipo", Sancion.Tipo.TEMPORAL)
            if attrs["tipo"] == Sancion.Tipo.TEMPORAL and not attrs.get("dias_suspension"):
                raise serializers.ValidationError({
                    "dias_suspension": [
                        "Debes indicar los días de suspensión."
                    ]
                })
            if attrs["tipo"] == Sancion.Tipo.INDEFINIDA and "dias_suspension" in attrs:
                raise serializers.ValidationError({"dias_suspension": "La suspensión indefinida no lleva duración."})

        return attrs


class SancionSerializer(serializers.ModelSerializer):
    esta_activa = serializers.SerializerMethodField()
    estado_vigencia = serializers.SerializerMethodField()
    nombre_administrador = serializers.SerializerMethodField()
    nombre_rehabilitador = serializers.SerializerMethodField()

    def get_estado_vigencia(self, obj):
        return obj.estado_vigencia(self.context.get("ahora"))

    def get_esta_activa(self, obj):
        return self.get_estado_vigencia(obj) == "sancion_activa"

    def get_nombre_administrador(self, obj):
        return nombreAdministrador(obj.aplicada_por)

    def get_nombre_rehabilitador(self, obj):
        return nombreAdministrador(obj.anulada_por)

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
            "tipo",
            "aplicada_por",
            "anulada_por",
            "motivo_anulacion",
            "estado_vigencia", "nombre_administrador", "nombre_rehabilitador",
        ]
        read_only_fields = fields


class HistorialReporteSerializer(serializers.ModelSerializer):
    nombre_administrador = serializers.SerializerMethodField()
    accion_display = serializers.CharField(source="get_accion_display", read_only=True)

    def get_nombre_administrador(self, obj):
        return nombreAdministrador(obj.administrador)

    class Meta:
        model = HistorialReporte
        fields = ["id", "accion", "accion_display", "administrador", "nombre_administrador",
                  "fecha", "estado_anterior", "estado_nuevo", "motivo", "respuesta_reportante"]
        read_only_fields = fields


class ReporteSerializer(serializers.ModelSerializer):
    sancion = serializers.SerializerMethodField()
    observacion_admin = serializers.SerializerMethodField()
    evidencia = serializers.SerializerMethodField()
    motivo_display = serializers.CharField(source="get_motivo_display", read_only=True)
    nombre_paciente = serializers.SerializerMethodField()
    nombre_medico = serializers.SerializerMethodField()
    codigo_cita = serializers.CharField(source="cita.codigo_cita", read_only=True, allow_null=True)
    estado_administrativo = serializers.SerializerMethodField()
    historial_administrativo = serializers.SerializerMethodField()
    nombre_administrador = serializers.SerializerMethodField()
    decision = serializers.SerializerMethodField()

    def get_estado_administrativo(self, obj):
        return obj.situacion_administrativa(self.context.get("ahora")) if self.context.get("es_admin") else obj.estado

    def get_decision(self, obj):
        return obj.decision if self.context.get("es_admin") else ""

    def get_nombre_administrador(self, obj):
        return nombreAdministrador(obj.revisado_por) if self.context.get("es_admin") else None

    def get_historial_administrativo(self, obj):
        if not self.context.get("es_admin"):
            return []
        return HistorialReporteSerializer(obj.historial_administrativo.all(), many=True).data

    def get_sancion(self, obj):
        sancion = getattr(obj, "sancion", None)
        return SancionSerializer(sancion, context=self.context).data if self.context.get("es_admin") and sancion else None

    def get_observacion_admin(self, obj):
        if self.context.get("es_admin", False):
            return obj.observacion_admin

        return None

    def get_evidencia(self, obj):
        if not obj.evidencia_id or not obj.evidencia.activo:
            return None
        return {"nombre": obj.evidencia.nombre_original, "tamano": obj.evidencia.tamano,
                "content_type": obj.evidencia.content_type}

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
            "codigo_cita",
            "otro_motivo",
            "motivo_display",
            "evidencia",
            "observacion_reportante",
            "decision", "estado_administrativo", "nombre_administrador", "historial_administrativo",
        ]
        read_only_fields = fields


class AnularSancionSerializer(serializers.Serializer):
    motivo = serializers.CharField(max_length=2000, allow_blank=False, trim_whitespace=True)
