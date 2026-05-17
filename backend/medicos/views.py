# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
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
from medicos.serializers import(
    RegistrarMedicoSerializer,
    EditarMedicoSerializer,
    RegistrarEspecialidadSerializer,
    EditarEspecialidadSerializer
)

# ─── RESPUESTAS ESTANDARIZADAS ────────────────────────────────────────────────

def respuesta_ok(data=None, mensaje=None, status=200):
    return Response({
        'ok': True,
        'mensaje': mensaje,
        'data': data
    }, status=status)

def respuesta_error(mensaje, errores=None, status=400):
    return Response({
        'ok': False,
        'mensaje': "Error",
        'errores': errores or {"detalle" : mensaje}
    }, status=status)

def respuesta_serializer_invalido(errors):
    return respuesta_error('Datos inválidos', errores=errors, status=400)

# ─── MÉDICOS ──────────────────────────────────────────────────────────────────

#Metodo público
class RegistrarMedicoView(APIView):
    def post(self,request):
        try:
            serializer = RegistrarMedicoSerializer(data=request.data)
            if not serializer.is_valid():
                return respuesta_serializer_invalido(serializer.errors)
            data_validada = serializer.validated_data
            respuesta,statusCode = crearMedicoService(data_validada)
            if statusCode != 201:
                return respuesta_error(respuesta,status=statusCode)
            return respuesta_ok(data=respuesta,mensaje="Médico registrado correctamente",status=statusCode)
        except Exception as e:
            print(e)
            return respuesta_error("Error interno en el servidor",status=500)

#Metodos- Admin  
class MedicoListView(APIView):
    def get(self, request):
        try:
            resultado, status_code = listarMedicosService()
            return respuesta_ok(resultado,status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error("Error interno en el servidor",status=500)

class MedicoDetailView(APIView):
    def get(self, request, id_medico):
        try:
            resultado, status_code = obtenerMedicoService(id_medico)
            if status_code != 200:
                return respuesta_error(resultado,status=status_code)
            return respuesta_ok(resultado,status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error("Error interno en el servidor",status=500)
    def put(self, request, id_medico):
        try:
            serializer = EditarMedicoSerializer(data=request.data)
            if not serializer.is_valid():
                return respuesta_serializer_invalido(serializer.errors)
            data_validada = serializer.validated_data
            resultado, status_code = actualizarMedicoService(
                id_medico,
                data_validada
            )
            if status_code != 200:
                return respuesta_error(resultado,status=status_code)
            return respuesta_ok(resultado,"Medico actualizado correctamente",status=status_code)
        except Exception as e:
            print(f"Error: {e}")
            return respuesta_error("Error interno en el servidor",status=500)

    def delete(self, request, id_medico):
        try:
            resultado, status_code = eliminarMedicoService(id_medico)
            if status_code != 200:
                return respuesta_error(resultado,status=status_code)
            return respuesta_ok(mensaje=resultado,status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error("Error interno en el servidor",status=500)
        
# ─── ESPECIALIDADES ──────────────────────────────────────────────────────────

class EspecialidadListView(APIView):
    def get(self, request):
        try:
            resultado, status_code = listarEspecialidadesService()
            return respuesta_ok(resultado,status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error("Error interno en el servidor",status=500)
    def post(self, request):
        try:
            serializer = RegistrarEspecialidadSerializer(data=request.data)
            if not serializer.is_valid():
                return respuesta_serializer_invalido(serializer.errors)
            data_validada = serializer.validated_data     
            resultado, status_code = crearEspecialidadService(data_validada)
            if status_code != 201:
                return respuesta_error(resultado,status=status_code)
            return respuesta_ok(resultado,"Especialidad registrada con éxito",status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error("Error interno en el servidor",status=500)


class EspecialidadDetailView(APIView):
    def get(self, request, id_especialidad):
        try:
            resultado, status_code = obtenerEspecialidadService(id_especialidad)
            if status_code != 200:
                return respuesta_error(resultado,status=status_code)
            return respuesta_ok(resultado,status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error("Error interno en el servidor",status=500)
    def put(self, request, id_especialidad):
        try:
            serializer = EditarEspecialidadSerializer(data=request.data)
            if not serializer.is_valid():
                return respuesta_serializer_invalido(serializer.errors)
            data_validada = serializer.validated_data     
            resultado, status_code = editarEspecialidadService(id_especialidad,data_validada)
            if status_code != 200:
                return respuesta_error(resultado,status=status_code)
            return respuesta_ok(resultado,"Medico actualizado correctamente",status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error("Error interno en el servidor",status=500)

    def delete(self, request, id_especialidad):
        try:
            resultado, status_code = eliminarEspecialidadService(id_especialidad)
            if status_code != 200:
                return respuesta_error(resultado,status=status_code)
            return respuesta_ok(mensaje=resultado,status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error("Error interno en el servidor",status=500)