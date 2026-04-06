from rest_framework.views import APIView #Clase base para crear endpoints
from rest_framework.response import Response #retornar respuestas json al front
from rest_framework import status #codigos http(200,400,404,500 etc)
from rest_framework_simplejwt.tokens import RefreshToken #Para generar el token 
from users.models import Usuario
from medicos.models import Medico
import bcrypt
class LoginView(APIView): #Creamos la clase LoginView y heredamos con APIView para heredar tdoas las herramientas de Django Rest Framework
    def post(self, request): #metodo que se ejecuta cuando el front hace una peticion post, la funcion tiene 2 parametros, self(para acceder a campos de la misma clase), request(lo que recibe del front
        #Obtenemos del body de la peticion el correo y la contraseña
        correo = request.data.get('correo') 
        contraseña = request.data.get('contraseña')

        if not correo or not contraseña:
            return Response(
                {'error': 'Correo y contraseña son requeridos'},
                status=400
            )

        # Busca en usuarios (pacientes)
        usuario = Usuario.objects.filter(correo=correo).first()
        # verifica que el usuario exista y que la contraseña sea correcta
        if usuario and bcrypt.checkpw(contraseña.encode(), usuario.contraseña.encode()):
            token = RefreshToken.for_user(usuario)
            response = Response({'rol': usuario.id_rol.nombre , 'nombre': usuario.nombre , 'apellido': usuario.apellido,'message': "Login exitoso"})
            response.set_cookie(
                key='token',
                value=str(token.access_token),
                httponly=True,    # JS no puede acceder
                secure=True,      # solo HTTPS
                samesite='Lax'    # protección CSRF
            )
            return response

        # Busca en medicos
        medico = Medico.objects.filter(correo=correo).first()
        if medico and bcrypt.checkpw(contraseña.encode(), medico.contraseña.encode()):
            token = RefreshToken.for_user(medico)
            response = Response({'rol': medico.id_rol.nombre, 
                                 'nombre': medico.nombre , 
                                 'apellido': medico.apellido,
                                 'message': "Login exitoso"
                                 })
            response.set_cookie(
                key='token',
                value=str(token.access_token),
                httponly=True,
                secure=True,
                samesite='Lax'
            )
            return response

        return Response(
            {'error': 'Credenciales incorrectas'},
            status=401
        )