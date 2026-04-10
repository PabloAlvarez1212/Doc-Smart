from rest_framework.views import APIView
from rest_framework.response import Response
from users.services import loginService

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
            return Response(
                {'error': 'Error interno del servidor'},
                status=500
            )