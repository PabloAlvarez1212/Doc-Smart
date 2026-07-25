from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from utils import IsAdmin
from django.conf import settings
from users.services import (
    loginService,
    solicitarCambioService,
    cambiarContraseñaService,
    registrarUsuarioService,
    listarUsuariosService,
    obtenerUsuarioService,
    editarUsuarioService,
    eliminarUsuarioService
)
from users.serializers import (
    LoginSerializer,
    SolicitarCambioSerializer,
    CambiarContraseñaSerializer,
    RegistrarUsuarioSerializer,
    EditarUsuarioSerializer,
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


# ─── VISTAS ───────────────────────────────────────────────────────────────────

#! Auths publicas - no necesitan Token

class LoginView(APIView):
    def post(self, request):
        # Valida formato con serializer
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)

        try:
            token, resultado, status_code = loginService(
                serializer.validated_data['correo'],
                serializer.validated_data['contraseña']
            )

            if status_code != 200:
                return respuesta_error('Error', errores=resultado, status=status_code)

            response = Response({
                'ok': True,
                'mensaje': 'Inicio de sesión exitoso',
                'data': resultado
            })
            response.set_cookie(
                key='token',
                value=str(token.access_token),
                httponly=True,
                secure=not settings.DEBUG,
                samesite='Lax',
                path='/',
                max_age=3600
            )
            response.set_cookie(
                key='user_role',
                value=resultado['rol'],
                httponly=False,
                secure=False,
                samesite='Lax',
                path='/',
                max_age=3600
            )
            return response

        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)

class LogoutView(APIView):
    def post(self, request):
        try:
            response = respuesta_ok(mensaje='Sesión cerrada correctamente')
            response.delete_cookie('token')
            response.delete_cookie('user_role')
            return response
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)

class SolicitarCambioView(APIView):
    def post(self, request):
        serializer = SolicitarCambioSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)

        try:
            mensaje, status_code = solicitarCambioService(
                serializer.validated_data['correo']
            )

            if status_code != 200:
                return respuesta_error('Error',  errores=mensaje , status=status_code)

            return respuesta_ok(mensaje=mensaje)

        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)


class CambiarContraseñaView(APIView):
    def post(self, request):
        serializer = CambiarContraseñaSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)

        try:
            mensaje, status_code = cambiarContraseñaService(
                serializer.validated_data['token'],
                serializer.validated_data['nueva_contraseña']
            )

            if status_code != 200:
                return respuesta_error('Error',errores=mensaje, status=status_code)

            response = respuesta_ok(mensaje=mensaje)
            response.delete_cookie('token')
            response.delete_cookie('user_role')
            return response

        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)

#!Registro - publico - NO REQUIERE TOKEN
class RegistroView(APIView):
    def post(self,request):
        serializer = RegistrarUsuarioSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)
        try :
            respuesta , status_code = registrarUsuarioService(
                serializer.validated_data
            )
            if status_code != 201:
                return respuesta_error(mensaje=respuesta,status=status_code)
            return respuesta_ok(respuesta,"Registro existoso",status_code)
        except Exception as e:
            print(f"Error: {e}")
            return respuesta_error("Error interno en el servidor",status=500)

#!Metodos unicos del usuario - requiere Token

class PerfilPacienteView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self,request):
        try:
            respuesta,status_code = obtenerUsuarioService(request.user.id)
            if status_code != 200:
                return respuesta_error(mensaje=respuesta,status=status_code)
            return respuesta_ok(data=respuesta,status=status_code)
        except Exception as e:
            print(f"Error: {e}")
    def put(self,request):
        try:
            serializer = EditarUsuarioSerializer(data=request.data)
            if not serializer.is_valid():
                return respuesta_serializer_invalido(serializer.errors)
            respuesta , status_code = editarUsuarioService(
                request.user.id,
                serializer.validated_data
            )
            if status_code != 200:
                return respuesta_error(mensaje=respuesta,status=status_code)
            return respuesta_ok(data=respuesta,mensaje="Usuario actualizado correctamente",status=status_code)
        except Exception as e:
            print(f"Error: {e}")
            return respuesta_error("Error interno en el servidor",status=500)
    def delete(self,request):
        try:
            resultado, status_code = eliminarUsuarioService(request.user.id)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(mensaje=resultado)
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)
        
# ! Metodos para el Admin
class UsuarioListView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        try:
            page = request.query_params.get('page')
            page_size = request.query_params.get('page_size', 10)
            search = request.query_params.get('search')

            resultado, status_code = listarUsuariosService(
                page=page, page_size=page_size, search=search,
            )
            return respuesta_ok(data=resultado, status=status_code)
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)

class UsuarioDetailView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request, pk):
        try:
            resultado, status_code = obtenerUsuarioService(pk)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado)
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)

    def put(self, request, pk):
        serializer = EditarUsuarioSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)

        try:
            resultado, status_code = editarUsuarioService(
                pk, serializer.validated_data
            )
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado, mensaje='Usuario actualizado correctamente')
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)

    def delete(self, request, pk):
        try:
            resultado, status_code = eliminarUsuarioService(pk)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(mensaje=resultado)
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)
