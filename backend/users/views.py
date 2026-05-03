from rest_framework.views import APIView
from rest_framework.response import Response
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
        'mensaje': mensaje,
        'errores': errores or {}
    }, status=status)

def respuesta_serializer_invalido(errors):
    return respuesta_error('Datos inválidos', errores=errors, status=400)


# ─── VISTAS ───────────────────────────────────────────────────────────────────

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
                secure=True,
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


class UsuarioListView(APIView):
    def get(self, request):
        try:
            resultado, status_code = listarUsuariosService()
            return respuesta_ok(data=resultado)
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)

    def post(self, request):
        serializer = RegistrarUsuarioSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)

        try:
            resultado, status_code = registrarUsuarioService(
                serializer.validated_data
            )
            if status_code != 201:
                return respuesta_error("Error",errores=resultado, status=status_code)
            return respuesta_ok(data=resultado, mensaje='Usuario registrado correctamente', status=201)
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)


class UsuarioDetailView(APIView):
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
