import re
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from users.models import Usuario
from medicos.models import Medico

def validarContraseña(contraseña):
    if len(contraseña) < 8:
        return 'La contraseña debe tener mínimo 8 caracteres'
    if re.search(r'[<>\\"\'&]', contraseña):
        return 'No se permiten los caracteres (<, >, ", \', &) en la contraseña'
    if not re.search(r'[^a-zA-Z0-9]', contraseña):
        return 'La contraseña debe contener al menos un carácter especial'
    if not re.search(r'[A-Z]', contraseña):
        return 'La contraseña debe tener mínimo una mayúscula'
    if not re.search(r'[a-z]', contraseña):
        return 'La contraseña debe tener mínimo una minúscula'
    if not re.search(r'\d', contraseña):
        return 'La contraseña debe tener mínimo un número'
    return None

def validarNumber(cedula):
    if not re.match(r"^\d+$",cedula):
        return 'Ingresa un numero valido'
    
# Autenticación JWT personalizada para soportar dos modelos de usuario (Medico y Usuario)
class CustomJWTAuthentication(JWTAuthentication):

    def authenticate(self, request):
        token = request.COOKIES.get("token")

        if token is None:
            return None

        validated_token = self.get_validated_token(token)
        return self.get_user(validated_token), validated_token

    def get_user(self, validated_token):
        user_id = validated_token.get("user_id")

        medico = Medico.objects.filter(id=user_id).first()
        if medico:
            return medico

        usuario = Usuario.objects.filter(id=user_id).first()
        if usuario:
            return usuario

        raise InvalidToken("User not found")