
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.http import FileResponse
from django.conf import settings
import logging

from utils import (
    IsAdmin,
    IsPacienteOrMedicoAprobado,
    respuesta_ok,
    respuesta_error,
    respuesta_serializer_invalido,
)

from .serializers import (
    CrearReporteSerializer,
    GestionarReporteSerializer,
    AnularSancionSerializer,
)

from .services import (
    crearReporteService,
    listarReportesService,
    gestionarReporteService,
    anularSancionService,
    obtenerMiSancionService,
    listarUsuariosReportablesService,
    obtenerContextoCitaReporteService,
    previsualizarSancionService,
    listarCitasReportablesService,
    obtenerEvidenciaReporteService,
)


class CrearReporteView(APIView):
    permission_classes = [
        IsAuthenticated,
        IsPacienteOrMedicoAprobado,
    ]

    def post(self, request):
        serializer = CrearReporteSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return respuesta_serializer_invalido(
                serializer.errors
            )

        resultado, codigo = crearReporteService(
            request.user,
            serializer.validated_data,
        )

        if codigo != 201:
            return respuesta_error(
                resultado,
                status=codigo
            )

        return respuesta_ok(
            data=resultado,
            mensaje="Reporte registrado correctamente",
            status=201,
        )


class ListarReportesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        estado = request.query_params.get("estado")

        resultado, codigo = listarReportesService(
            request.user,
            estado=estado,
        )

        if codigo != 200:
            return respuesta_error(
                resultado,
                status=codigo
            )

        return respuesta_ok(
            data=resultado,
            status=200,
        )


class GestionarReporteView(APIView):
    permission_classes = [
        IsAuthenticated,
        IsAdmin,
    ]

    def patch(self, request, reporte_id):
        serializer = GestionarReporteSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return respuesta_serializer_invalido(
                serializer.errors
            )

        resultado, codigo = gestionarReporteService(
            request.user,
            reporte_id,
            serializer.validated_data,
        )

        if codigo != 200:
            return respuesta_error(
                resultado,
                status=codigo
            )

        return respuesta_ok(
            data=resultado,
            mensaje="Reporte gestionado correctamente",
        )


class AnularSancionView(APIView):
    permission_classes = [
        IsAuthenticated,
        IsAdmin,
    ]

    def patch(self, request, sancion_id):
        serializer = AnularSancionSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)
        resultado, codigo = anularSancionService(
            request.user,
            sancion_id,
            serializer.validated_data["motivo"],
        )

        if codigo != 200:
            return respuesta_error(
                resultado,
                status=codigo
            )

        return respuesta_ok(
            mensaje=resultado,
            status=200,
        )

class MiSancionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        resultado, codigo = obtenerMiSancionService(request.user)

        if codigo != 200:
            return respuesta_error(resultado, status = codigo)

        return respuesta_ok(data = resultado, status = 200)


class ListarUsuariosReportablesView(APIView):
    permission_classes = [
        IsAuthenticated,
        IsPacienteOrMedicoAprobado,
    ]

    def get(self, request):
        resultado, codigo = listarUsuariosReportablesService(
            request.user
        )

        if codigo != 200:
            return respuesta_error(
                resultado,
                status=codigo
            )

        return respuesta_ok(
            data=resultado,
            status=200
        )


class ContextoCitaReporteView(APIView):
    permission_classes = [
        IsAuthenticated,
        IsPacienteOrMedicoAprobado,
    ]

    def get(self, request, cita_id):
        resultado, codigo = obtenerContextoCitaReporteService(
            request.user,
            cita_id,
        )

        if codigo != 200:
            return respuesta_error(
                resultado,
                status=codigo
            )

        return respuesta_ok(
            data=resultado,
            status=200
        )


class PrevisualizarSancionView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, reporte_id):
        serializer = GestionarReporteSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)
        if serializer.validated_data["accion"] != "sancionar":
            return respuesta_error("La vista previa requiere una suspensión", status=400)
        resultado, codigo = previsualizarSancionService(request.user, reporte_id, serializer.validated_data)
        if codigo != 200:
            return respuesta_error(resultado, status=codigo)
        return respuesta_ok(data=resultado)


class CitasReportablesView(APIView):
    permission_classes = [IsAuthenticated, IsPacienteOrMedicoAprobado]

    def get(self, request):
        from rest_framework import serializers
        try:
            reportado_id = serializers.IntegerField(min_value=1).run_validation(request.query_params.get("id_reportado"))
        except serializers.ValidationError as error:
            return respuesta_serializer_invalido({"id_reportado": error.detail})
        resultado, codigo = listarCitasReportablesService(request.user, reportado_id)
        if codigo != 200:
            return respuesta_error(resultado, status=codigo)
        return respuesta_ok(data=resultado)


class EvidenciaReporteView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, reporte_id):
        archivo, codigo = obtenerEvidenciaReporteService(request.user, reporte_id)
        if codigo != 200:
            return respuesta_error(archivo, status=codigo)
        from storage_app.services import obtener_cliente_s3
        try:
            objeto = obtener_cliente_s3().get_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=archivo.storage_key)
        except Exception:
            logging.getLogger(__name__).exception("No se pudo descargar evidencia del reporte %s", reporte_id)
            return respuesta_error("La evidencia no está disponible temporalmente", status=503)
        response = FileResponse(objeto["Body"], as_attachment=True, filename=archivo.nombre_original,
                                content_type=archivo.content_type)
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response
