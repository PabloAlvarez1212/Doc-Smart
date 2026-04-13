import bcrypt
from rest_framework_simplejwt.tokens import RefreshToken
from users.models import Usuario
from medicos.models import Medico
from users.serializers import UsuarioSerializer, MedicoSerializer
import secrets
from django.utils import timezone
from datetime import timedelta
from django.core.mail import send_mail
import os
from utils import validarContraseña

def loginService(correo, contraseña):
    # Busca en ambas tablas
    usuario = Usuario.objects.filter(correo=correo).first()
    medico = Medico.objects.filter(correo=correo).first()

    # Verifica que existe en alguna tabla
    if not usuario and not medico:
        return None, 'El correo no se encuentra registrado', 404

    # Verifica usuario
    if usuario and bcrypt.checkpw(contraseña.encode(), usuario.contraseña.encode()):
        token = RefreshToken.for_user(usuario)
        serializer = UsuarioSerializer(usuario)
        return token, serializer.data, 200

    # Verifica medico
    if medico and bcrypt.checkpw(contraseña.encode(), medico.contraseña.encode()):
        token = RefreshToken.for_user(medico)
        serializer = MedicoSerializer(medico)
        return token, serializer.data, 200

    return None, 'Credenciales incorrectas', 401

def solicitarCambioService(correo):
    # Busca en ambas tablas
    usuario = Usuario.objects.filter(correo=correo).first()
    medico = Medico.objects.filter(correo=correo).first()

    if not usuario and not medico:
        return 'El correo no se encuentra registrado', 404

    # Genera token temporal
    token = secrets.token_urlsafe(32)
    expiracion = timezone.now() + timedelta(minutes=15)

    # Guarda el token en la BD
    if usuario:
        usuario.token_reset = token
        usuario.token_reset_expira = expiracion
        usuario.save()
    else:
        medico.token_reset = token
        medico.token_reset_expira = expiracion
        medico.save()

    # Envía el email
    link = f'http://localhost:3000/reset-password?token={token}'
    send_mail(
        subject='Recupera tu contraseña - DocSmart',
        message=f'Haz click en el siguiente link para recuperar tu contraseña: {link}',
        from_email=os.getenv('EMAIL_HOST_USER'),
        recipient_list=[correo],
        fail_silently=False
    )

    return 'Email enviado correctamente', 200


def cambiarContraseñaService(token, nueva_contraseña):
    
    #validar contraseña
    error = validarContraseña(nueva_contraseña)
    if error:
        return error, 400
    
    # Busca el token en ambas tablas
    usuario = Usuario.objects.filter(token_reset=token).first()
    medico = Medico.objects.filter(token_reset=token).first()

    if not usuario and not medico:
        return 'Token inválido', 400

    # Verifica que el token no haya expirado
    persona = usuario or medico
    
    if persona.token_reset_expira < timezone.now():
        persona.token_reset = None
        persona.token_reset_expira = None
        persona.save()
        return 'El token ha expirado', 400
    
    # Encripta la nueva contraseña
    nueva_contraseña_hash = bcrypt.hashpw(
        nueva_contraseña.encode(), 
        bcrypt.gensalt()
    ).decode()

    # Actualiza la contraseña y limpia el token
    persona.contraseña = nueva_contraseña_hash
    persona.token_reset = None
    persona.token_reset_expira = None
    persona.save()

    return 'Contraseña actualizada correctamente', 200