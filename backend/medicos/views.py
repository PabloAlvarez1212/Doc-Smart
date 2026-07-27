from rest_framework.views import APIView
from rest_framework.response import Response
from utils import IsAdmin
from medicos.services import (
    listarMedicosService,
    obtenerMedicoService,
    crearMedicoService,
    actualizarMedicoService,
    eliminarMedicoService,
    listarEspecialidadesService,
    obtenerEspecialidadService,
    crearEspecialidadService,
    editarEspecialidadService,
    eliminarEspecialidadService,
)
from medicos.serializers import (
    RegistrarMedicoSerializer,
    EditarMedicoSerializer,
    RegistrarEspecialidadSerializer,
    EditarEspecialidadSerializer
)

# ── HELPERS DE RESPUESTA ESTANDARIZADA ───────────────────────────────────────

# Respuesta exitosa: incluye datos y mensaje opcional
def respuesta_ok(data=None, mensaje=None, status=200):
    return Response({
        'ok': True,
        'mensaje': mensaje,
        'data': data
    }, status=status)

# Respuesta de error: incluye mensaje y detalle de errores opcional
def respuesta_error(mensaje, errores=None, status=400):
    return Response({
        'ok': False,
        'mensaje': "Error",
        'errores': errores or {"detalle": mensaje}
    }, status=status)

# Atajo para responder errores de validación de serializer
def respuesta_serializer_invalido(errors):
    return respuesta_error('Datos inválidos', errores=errors, status=400)


# ── VISTAS DE MÉDICOS ────────────────────────────────────────────────────────

# Vista pública: permite registrar un nuevo médico sin autenticación
class RegistrarMedicoView(APIView):
    def post(self, request):
        try:
            serializer = RegistrarMedicoSerializer(data=request.data)
            if not serializer.is_valid():
                return respuesta_serializer_invalido(serializer.errors)
            data_validada = serializer.validated_data
            respuesta, statusCode = crearMedicoService(data_validada)
            if statusCode != 201:
                return respuesta_error(respuesta, status=statusCode)
            return respuesta_ok(data=respuesta, mensaje="Médico registrado correctamente", status=statusCode)
        except Exception as e:
            print(e)
            return respuesta_error("Error interno en el servidor", status=500)


# Vista admin: lista todos los médicos registrados
class MedicoListView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        try:
            resultado, status_code = listarMedicosService()
            return respuesta_ok(resultado, status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error("Error interno en el servidor", status=500)


# Vista admin: obtiene, actualiza o elimina un médico por ID
class MedicoDetailView(APIView):
    permission_classes = [IsAdmin]
    # Obtiene los datos de un médico específico
    def get(self, request, id_medico):
        try:
            resultado, status_code = obtenerMedicoService(id_medico)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(resultado, status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error("Error interno en el servidor", status=500)

    # Actualiza los datos de un médico existente
    def put(self, request, id_medico):
        try:
            serializer = EditarMedicoSerializer(data=request.data)
            if not serializer.is_valid():
                return respuesta_serializer_invalido(serializer.errors)
            data_validada = serializer.validated_data
            resultado, status_code = actualizarMedicoService(id_medico, data_validada)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(resultado, "Medico actualizado correctamente", status=status_code)
        except Exception as e:
            print(f"Error: {e}")
            return respuesta_error("Error interno en el servidor", status=500)

    # Elimina un médico por su ID
    def delete(self, request, id_medico):
        try:
            resultado, status_code = eliminarMedicoService(id_medico)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(mensaje=resultado, status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error("Error interno en el servidor", status=500)


# ── VISTAS DE ESPECIALIDADES ──────────────────────────────────────────────────

# Lista todas las especialidades (GET) y permite crear una nueva (POST)
class EspecialidadListView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return []
        return [IsAdmin()] 

    def get(self, request):
        try:
            page = request.query_params.get('page')
            page_size = request.query_params.get('page_size', 10)
            search = request.query_params.get('search')

            resultado, status_code = listarEspecialidadesService(
                page=page, page_size=page_size, search=search,
            )
            return respuesta_ok(resultado, status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error("Error interno en el servidor", status=500)

    # Crea una nueva especialidad
    def post(self, request):
        try:
            serializer = RegistrarEspecialidadSerializer(data=request.data)
            if not serializer.is_valid():
                return respuesta_serializer_invalido(serializer.errors)
            data_validada = serializer.validated_data
            resultado, status_code = crearEspecialidadService(data_validada)
            if status_code != 201:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(resultado, "Especialidad registrada con éxito", status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error("Error interno en el servidor", status=500)


# Obtiene, actualiza o elimina una especialidad por ID
class EspecialidadDetailView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return []
        return [IsAdmin()] 
    # Retorna los datos de una especialidad específica
    def get(self, request, id_especialidad):
        try:
            resultado, status_code = obtenerEspecialidadService(id_especialidad)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(resultado, status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error("Error interno en el servidor", status=500)

    # Actualiza el nombre de una especialidad existente
    def put(self, request, id_especialidad):
        try:
            serializer = EditarEspecialidadSerializer(data=request.data)
            if not serializer.is_valid():
                return respuesta_serializer_invalido(serializer.errors)
            data_validada = serializer.validated_data
            resultado, status_code = editarEspecialidadService(id_especialidad, data_validada)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(resultado, "Especialidad actualizada correctamente", status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error("Error interno en el servidor", status=500)

    # Elimina una especialidad por su ID
    def delete(self, request, id_especialidad):
        try:
            resultado, status_code = eliminarEspecialidadService(id_especialidad)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(mensaje=resultado, status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error("Error interno en el servidor", status=500)