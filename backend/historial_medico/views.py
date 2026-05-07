from rest_framework.views import APIView
from rest_framework.response import Response
from historial_medico.services import (
    crearHistorialService,
    listarHistorialesPacienteService,
    listarHistorialesMedicoService,
    obtenerHistorialService,
    editarHistorialService
)
from historial_medico.serializers import (
    CrearHistorialSerializer,
    EditarHistorialSerializer
)


# ─── HELPERS ─────────────────────────────────────────────────────────────────

def respuesta_ok(data=None, mensaje=None, status=200):
    return Response({'ok': True, 'mensaje': mensaje, 'data': data}, status=status)

def respuesta_error(mensaje, errores=None, status=400):
    return Response({
        'ok': False,
        'mensaje': 'Error',
        'errores': errores or {'detalle': mensaje}  # ← mensaje siempre en errores
    }, status=status)

def respuesta_serializer_invalido(errors):
    return respuesta_error('Datos inválidos', errores=errors, status=400)



class HistorialListView(APIView):
    def post(self, request):
        serializer = CrearHistorialSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)

        try:
            medico_id = request.user.id
            resultado, status_code = crearHistorialService(
                serializer.validated_data,
                medico_id
            )

            if status_code != 201:
                return respuesta_error(resultado, status=status_code)

            return respuesta_ok(
                data=resultado,
                mensaje='Historial creado correctamente',
                status=201
            )

        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)


class HistorialPacienteView(APIView):
    def get(self, request):
        try:
            usuario_id = request.user.id
            resultado, status_code = listarHistorialesPacienteService(usuario_id)

            if status_code != 200:
                return respuesta_error(resultado, status=status_code)

            return respuesta_ok(data=resultado)

        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)


class HistorialMedicoView(APIView):
    def get(self, request):
        try:
            medico_id = request.user.id
            resultado, status_code = listarHistorialesMedicoService(medico_id)

            if status_code != 200:
                return respuesta_error(resultado, status=status_code)

            return respuesta_ok(data=resultado)

        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)


class HistorialDetailView(APIView):
    def get(self, request, historial_id):
        try:
            es_medico = request.user.id_rol.nombre == 'medico'
            resultado, status_code = obtenerHistorialService(
                historial_id,
                request.user.id,
                es_medico
            )

            if status_code != 200:
                return respuesta_error(resultado, status=status_code)

            return respuesta_ok(data=resultado)

        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)

    def put(self, request, historial_id):
        serializer = EditarHistorialSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)

        try:
            medico_id = request.user.id
            resultado, status_code = editarHistorialService(
                historial_id,
                serializer.validated_data,
                medico_id
            )

            if status_code != 200:
                return respuesta_error(resultado, status=status_code)

            return respuesta_ok(
                data=resultado,
                mensaje='Historial actualizado correctamente'
            )

        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)

