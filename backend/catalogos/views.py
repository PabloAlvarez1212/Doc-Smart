from rest_framework.views import APIView
from rest_framework.response import Response
from urllib3 import request
from catalogos.serializers import CatalogoSerializer,CiudadInputSerializer
from catalogos.services import (
    listarRolesService, obtenerRolService, crearRolService, editarRolService, eliminarRolService,
    listarEstadosService, obtenerEstadoService, crearEstadoService, editarEstadoService, eliminarEstadoService,
    listarDepartamentosService, obtenerDepartamentoService,listarCiudadesService,obtenerCiudadService,
    listarMediosService, obtenerMedioService, crearMedioService, editarMedioService, eliminarMedioService,
    crearCiudadService, editarCiudadService, eliminarCiudadService,
)
from utils import IsAdmin

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


# ─── ROL ─────────────────────────────────────────────────────────────────────

class RolListView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        try:
            resultado, status_code = listarRolesService()
            return respuesta_ok(data=resultado)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error('Error interno del servidor', status=500)

    def post(self, request):
        serializer = CatalogoSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)
        try:
            resultado, status_code = crearRolService(serializer.validated_data)
            if status_code != 201:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado, mensaje='Rol creado correctamente', status=201)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error('Error interno del servidor', status=500)


class RolDetailView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request, id):
        try:
            resultado, status_code = obtenerRolService(id)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error('Error interno del servidor', status=500)

    def put(self, request, id):
        serializer = CatalogoSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)
        try:
            resultado, status_code = editarRolService(id, serializer.validated_data)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado, mensaje='Rol actualizado correctamente')
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error('Error interno del servidor', status=500)

    def delete(self, request, id):
        try:
            resultado, status_code = eliminarRolService(id)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(mensaje=resultado)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error('Error interno del servidor', status=500)


# ─── ESTADO ──────────────────────────────────────────────────────────────────

class EstadoListView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        try:
            resultado, status_code = listarEstadosService()
            return respuesta_ok(data=resultado)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error('Error interno del servidor', status=500)

    def post(self, request):
        serializer = CatalogoSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)
        try:
            resultado, status_code = crearEstadoService(serializer.validated_data)
            if status_code != 201:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado, mensaje='Estado creado correctamente', status=201)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error('Error interno del servidor', status=500)


class EstadoDetailView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request, id):
        try:
            resultado, status_code = obtenerEstadoService(id)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error('Error interno del servidor', status=500)

    def put(self, request, id):
        serializer = CatalogoSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)
        try:
            resultado, status_code = editarEstadoService(id, serializer.validated_data)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado, mensaje='Estado actualizado correctamente')
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error('Error interno del servidor', status=500)

    def delete(self, request, id):
        try:
            resultado, status_code = eliminarEstadoService(id)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(mensaje=resultado)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error('Error interno del servidor', status=500)


# ─── DEPARTAMENTO ───────────────────────────────────────────────────────────────────

class DepartamentoListView(APIView):
    def get(self, request):
        try:
            resultado, status_code = listarDepartamentosService()
            return respuesta_ok(data=resultado)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error('Error interno del servidor', status=500)

class DepartamentoDetailView(APIView):
    def get(self, request, id):
        try:
            resultado, status_code = obtenerDepartamentoService(id)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error('Error interno del servidor', status=500)

# ─── CIUDAD ───────────────────────────────────────────────────────────────────
class CiudadListView(APIView):
    def get(self, request, id_departamento):
        try:
            resultado, status_code = listarCiudadesService(id_departamento)
            return respuesta_ok(data=resultado,status=status_code)
        except Exception as e:
            print("Error:", e)
            return respuesta_error("Error interno en el servidor",status=500)

## Mostrar Detalles de todas las ciudades 
class CiudadesDetailView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return []
        return [IsAdmin()] 
    def get(self, request):
        try:
            resultado, status_code = listarCiudadesService()
            return respuesta_ok(data=resultado, status=status_code)

        except Exception as e:
            print("Error:", e)
            return respuesta_error("Error interno en el servidor",status=500)

    def post(self, request):
        serializer = CiudadInputSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)
        try:
            resultado, status_code = crearCiudadService(serializer.validated_data)
            if status_code != 201:
                return respuesta_error(mensaje=resultado, status=status_code)
            return respuesta_ok(data=resultado,mensaje='Ciudad creada correctamente',status=201)

        except Exception as e:
            print("Error:", e)
            return respuesta_error("Error interno en el servidor",status=500)
        
class CiudadDetailView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return []
        return [IsAdmin()] 
    def get(self,request,id):
        try:
            resultado, status_code = obtenerCiudadService(id)
            if status_code != 200:
                return respuesta_error(mensaje=resultado,status=status_code)
            return respuesta_ok(data=resultado,status=status_code)
        except Exception as e:
            print("Error: ", e)
            return respuesta_error("Error interno en el servidor",status=500)
      
    def put(self, request, id):
        serializer = CatalogoSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)
        try:
            resultado, status_code = editarCiudadService(id,serializer.validated_data)
            if status_code != 200:
                return respuesta_error(mensaje=resultado,status=status_code)
            return respuesta_ok(data=resultado,mensaje='Ciudad actualizada correctamente',status=200)
        except Exception as e:
            print("Error:", e)
            return respuesta_error("Error interno en el servidor",status=500)
        
        
    def delete(self, request, id):

        try:

            resultado, status_code = eliminarCiudadService(id)

            if status_code != 200:

                return respuesta_error(
                    mensaje=resultado,
                    status=status_code
                )

            return respuesta_ok(
                mensaje=resultado,
                status=200
            )

        except Exception as e:

            print(f'Error: {e}')

            return respuesta_error(
                'Error interno del servidor',
                status=500
            )
# ─── MEDIO ───────────────────────────────────────────────────────────────────

class MedioListView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        try:
            resultado, status_code = listarMediosService()
            return respuesta_ok(data=resultado)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error('Error interno del servidor', status=500)

    def post(self, request):
        serializer = CatalogoSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)
        try:
            resultado, status_code = crearMedioService(serializer.validated_data)
            if status_code != 201:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado, mensaje='Medio creado correctamente', status=201)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error('Error interno del servidor', status=500)


class MedioDetailView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request, id):
        try:
            resultado, status_code = obtenerMedioService(id)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error('Error interno del servidor', status=500)

    def put(self, request, id):
        serializer = CatalogoSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)
        try:
            resultado, status_code = editarMedioService(id, serializer.validated_data)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado, mensaje='Medio actualizado correctamente')
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error('Error interno del servidor', status=500)

    def delete(self, request, id):
        try:
            resultado, status_code = eliminarMedioService(id)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(mensaje=resultado)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error('Error interno del servidor', status=500)