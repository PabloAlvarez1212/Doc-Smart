from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from citas.services import (
    listarCitasService,
    listarCitasPacienteService,
    listarCitasMedicoService,
    obtenerCitaService,
    crearCitaService,
    editarCitaService,
    cancelarCitaService,
    completarCitaService,
    listarRecordatoriosService,
    crearRecordatorioService,
    confirmarCitaService,
    eliminarRecordatorioService
)
from citas.serializers import CrearCitaSerializer, EditarCitaSerializer


# ─── HELPERS ─────────────────────────────────────────────────────────────────

def respuesta_ok(data=None, mensaje=None, status=200):
    return Response({'ok': True, 'mensaje': mensaje, 'data': data}, status=status)

def respuesta_error(mensaje, errores=None, status=400):
    return Response({
        'ok': False,
        'mensaje': 'Error',
        'errores': errores or {'detalle': mensaje}
    }, status=status)

def respuesta_serializer_invalido(errors):
    return respuesta_error('Datos inválidos', errores=errors, status=400)


# ─── CITAS ───────────────────────────────────────────────────────────────────

#!Metodo-administrador
class CitaListView(APIView):
    def get(self, request):
        try:
            resultado, status_code = listarCitasService()
            return respuesta_ok(data=resultado)
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)

#!Metodo para crear cita - paciente
class RegistroCitaView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        serializer = CrearCitaSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)

        try:
            usuario_id = request.user.id  # viene del token
            resultado, status_code = crearCitaService(
                serializer.validated_data,
                usuario_id
            )
            if status_code != 201:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado, mensaje='Cita creada correctamente', status=201)
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)


class CitaPacienteView(APIView):
    permission_classes = [IsAuthenticated]
    # Paciente lista sus propias citas
    def get(self, request):
        try:
            usuario_id = request.user.id
            resultado, status_code = listarCitasPacienteService(usuario_id)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado)
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)


class CitaMedicoView(APIView):
    permission_classes = [IsAuthenticated]
    # Médico lista sus propias citas
    def get(self, request):
        try:
            medico_id = request.user.id
            resultado, status_code = listarCitasMedicoService(medico_id)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado)
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)


class CitaDetailView(APIView):
    permission_classes = [IsAuthenticated]
    #!Medico o usuario obtienen una cita por id
    def get(self, request, pk):
        try:
            resultado, status_code = obtenerCitaService(pk,request.user.id )
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado)
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)
    #!Medico o usuario actualizan una cita por id
    def put(self, request, pk):
        serializer = EditarCitaSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)

        try:
            usuario_id = request.user.id
            resultado, status_code = editarCitaService(
                pk,
                serializer.validated_data,
                usuario_id
            )
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado, mensaje='Cita actualizada correctamente')
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)


class CitaCancelarView(APIView):
    permission_classes = [IsAuthenticated]
    #! Paciente o medico cancelan su cita
    def put(self, request, pk):
        try:
            usuario_id = request.user.id
            resultado, status_code = cancelarCitaService(pk, usuario_id)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(mensaje=resultado)
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)


class CitaCompletarView(APIView):
    permission_classes = [IsAuthenticated]
    # Médico completa la cita
    def put(self, request, pk):
        try:
            medico_id = request.user.id
            resultado, status_code = completarCitaService(pk, medico_id)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado, mensaje='Cita completada correctamente')
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)

class CitaConfirmarView(APIView):
    permission_classes = [IsAuthenticated]
    #Medico confirma la cita
    def put(self, request, pk):
        try:
            medico_id = request.user.id
            resultado, status_code = confirmarCitaService(pk, medico_id)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado, mensaje='Cita confirmada correctamente')
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)

# ─── RECORDATORIOS ───────────────────────────────────────────────────────────

#!Metodos admin
class RecordatorioListView(APIView):
    #!Listar recordatorios
    def get(self, request):
        try:
            resultado, status_code = listarRecordatoriosService()
            return respuesta_ok(data=resultado)
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)

    #!Crear recordatorio
    def post(self, request):
        try:
            resultado, status_code = crearRecordatorioService(request.data)
            if status_code != 201:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado, mensaje='Recordatorio creado correctamente', status=201)
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)


class RecordatorioDetailView(APIView):
    #!Eliminar recordatorio
    def delete(self, request, pk):
        try:
            resultado, status_code = eliminarRecordatorioService(pk)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(mensaje=resultado)
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)