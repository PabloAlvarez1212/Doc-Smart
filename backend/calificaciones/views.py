from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from calificaciones.services import *

from calificaciones.serializers import *

from utils import (respuesta_error,respuesta_ok,respuesta_serializer_invalido,IsPaciente,IsMedicoAprobado)

# CREAR CALIFICACIÓN

class CrearCalificacionView(APIView):

    permission_classes = [IsAuthenticated,IsPaciente]

    def post(self, request):

        serializer = CrearCalificacionSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)

        resultado, codigo = crearCalificacionesServices(
            data=serializer.validated_data,
            usuario=request.user
        )

        if codigo != 201:
            return respuesta_error(resultado, status=codigo)

        return respuesta_ok(
            mensaje=resultado,
            status=codigo
        )

# ACTUALIZAR CALIFICACIÓN

class ActualizarCalificacionView(APIView):

    permission_classes = [IsAuthenticated,IsPaciente]

    def patch(self, request, id_calificacion):

        serializer = ActualizarCalificacionSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)

        resultado, codigo = actualizarCalificacionServices(
            data=serializer.validated_data,
            id_calificacion=id_calificacion,
            usuario=request.user
        )

        if codigo != 200:
            return respuesta_error(resultado, status=codigo)

        return respuesta_ok(
            mensaje=resultado,
            status=codigo
        )

# LISTAR CALIFICACIONES DE UN MÉDICO (VISTA PÚBLICA)

class ListarCalificacionesMedicoView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request, id_medico):

        resultado, codigo = listarCalificacionesMedicoService(
            id_medico=id_medico
        )

        if codigo != 200:
            return respuesta_error(resultado, status=codigo)

        serializer = CalificacionPublicaSerializer(
            resultado,
            many=True
        )

        return respuesta_ok(
            data=serializer.data,
            mensaje="Calificaciones obtenidas correctamente.",
            status=codigo
        )

# LISTAR CALIFICACIONES DE UN MÉDICO (VISTA PRIVADA)

class ListarMisCalificacionesMedicoView(APIView):

    permission_classes = [IsAuthenticated,IsMedicoAprobado]

    def get(self, request):

        resultado, codigo = listarMisCalificacionesMedicoService(
            medico=request.user
        )

        if codigo != 200:
            return respuesta_error(resultado, status=codigo)

        serializer = CalificacionPublicaSerializer(
            resultado,
            many=True
        )

        return respuesta_ok(
            data=serializer.data,
            mensaje="Calificaciones del médico obtenidas correctamente.",
            status=codigo
        )

# OBTENER PROMEDIO DE CALIFICACIONES

class ObtenerPromedioCalificacionesMedicoView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request, id_medico):

        resultado, codigo = obtenerPromedioCalificacionesMedicoService(
            id_medico=id_medico
        )

        if codigo != 200:
            return respuesta_error(resultado, status=codigo)

        return respuesta_ok(
            data=resultado,
            mensaje="Promedio de calificaciones obtenido correctamente.",
            status=codigo
        )

class ActualizarVisibilidadCalificacionView(APIView):

    permission_classes = [IsAuthenticated]

    def patch(self, request, id_calificacion):

        serializer = ActualizarVisibilidadCalificacionSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)

        resultado, codigo = actualizarVisibilidadCalificacionService(
            data=serializer.validated_data,
            id_calificacion=id_calificacion,
            usuario=request.user
        )

        if codigo != 200:
            return respuesta_error(resultado, status=codigo)

        return respuesta_ok(
            mensaje=resultado,
            status=codigo
        )