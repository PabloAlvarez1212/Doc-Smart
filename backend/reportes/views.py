
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

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
)

from .services import (
    crearReporteService,
    listarReportesService,
    gestionarReporteService,
    anularSancionService,
    obtenerMiSancionService,
    listarUsuariosReportablesService,
    obtenerContextoCitaReporteService,
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
        resultado, codigo = anularSancionService(
            request.user,
            sancion_id,
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
