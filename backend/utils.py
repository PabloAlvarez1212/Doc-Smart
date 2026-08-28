import re
from rest_framework.permissions import BasePermission
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import CSRFCheck
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.exceptions import InvalidToken
from datetime import date
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

        if not token:
            return super().authenticate(request)
        
        validated_token = self.get_validated_token(token)

        self.enforce_csrf(request)

        return self.get_user(validated_token), validated_token


    def enforce_csrf(self, request):
        def dummy_get_response(request):
            return None

        check = CSRFCheck(dummy_get_response)

        check.process_request(request)

        reason = check.process_view(
            request,
            None,
            (),
            {}
        )

        if reason:
            raise PermissionDenied(
                f"CSRF Failed: {reason}"
            )


    def get_user(self, validated_token):
        user_id = validated_token.get("user_id")
        tipo = validated_token.get("tipo")

        if tipo == "medico":
            medico = Medico.objects.filter(
                id=user_id
            ).first()

            if medico:
                return medico

        elif tipo == "usuario":
            usuario = Usuario.objects.filter(
                id=user_id
            ).first()

            if usuario:
                return usuario

        raise InvalidToken("User not found")
    
class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and  # ← verifica primero que esté logueado
            hasattr(request.user, 'id_rol') and  # ← verifica que tenga id_rol
            request.user.id_rol.nombre == 'admin'
        )
        
class IsMedico(BasePermission):

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and isinstance(request.user, Medico)
        )
        
class IsPaciente(BasePermission):
    message = "No tienes permisos para acceder a esta sección."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and isinstance(request.user, Usuario)
            and request.user.id_rol
            and request.user.id_rol.nombre == "paciente"
        )
        
def calcular_edad(fecha_nacimiento):
    hoy = date.today()

    edad = hoy.year - fecha_nacimiento.year

    if (hoy.month, hoy.day) < (fecha_nacimiento.month, fecha_nacimiento.day):
        edad -= 1

    return edad