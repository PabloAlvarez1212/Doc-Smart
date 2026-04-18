from rest_framework.views import APIView
from rest_framework.response import Response
from users.services import loginService, solicitarCambioService, cambiarContraseñaService

class LoginView(APIView):
    def post(self, request):
        # Recibe los datos
        correo = request.data.get('correo')
        contraseña = request.data.get('contraseña')

        # Valida que vengan los campos
        if not correo or not contraseña:
            return Response(
                {'error': 'Correo y contraseña son requeridos'},
                status=400
            )

        try:
            # Llama al servicio
            token, resultado, status_code = loginService(correo, contraseña)

            # Si hay error retorna el mensaje
            if status_code != 200:
                return Response({'error': resultado}, status=status_code)

            # Si todo bien, crea la respuesta con cookies
            response = Response(resultado)
            response.set_cookie(
                key='token',
                value=str(token.access_token),
                httponly=True,
                secure=True,
                samesite='Lax',
                path='/',
                domain=None,
                max_age=3600
            )
            response.set_cookie(
                key='user_role',
                value=resultado['rol'],
                httponly=False,
                secure=False,
                samesite='Lax',
                path='/',
                domain=None,
                max_age=3600
            )
            return response

        except Exception as e:
            print(e)
            return Response(
                {'error': 'Error interno del servidor'},
                status=500
            )
            
class SolicitarCambioView(APIView):
    def post(self, request):
        #obtenemos el correo del front
        correo = request.data.get('correo')

        if not correo:
            return Response(
                {'error': 'El correo es requerido'},
                status=400
            )

        try:
            mensaje, status_code = solicitarCambioService(correo)
            if status_code != 200:
                return Response({'error': mensaje}, status=status_code)
            
            return Response({'mensaje': mensaje}, status=status_code)

        except Exception as e:
            print(e)
            return Response(
                {'error': 'Error interno del servidor'},
                status=500
        )


class CambiarContraseñaView(APIView):
    def post(self, request):
        token = request.data.get('token')
        nueva_contraseña = request.data.get('nueva_contraseña')
        if not token or not nueva_contraseña:
            return Response(
                {'error': 'Token y nueva contraseña son requeridos'},
                status=400
            )
        try:
            mensaje, status_code = cambiarContraseñaService(token, nueva_contraseña)
            return Response({'mensaje': mensaje}, status=status_code)

        except Exception as e:
            print(e)
            return Response(
                {'error': 'Error interno del servidor'},
                status=500
            )