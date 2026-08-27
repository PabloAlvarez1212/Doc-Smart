from catalogos.models import Rol
import bcrypt
from rest_framework_simplejwt.tokens import RefreshToken
from users.models import Usuario
from medicos.models import Medico
from users.serializers import UsuarioSerializer, MedicoSerializer,UsuarioPerfilSerializer
import secrets
from django.utils import timezone
from datetime import timedelta
from django.core.mail import send_mail
import os
from django.template.loader import render_to_string
from django.core.paginator import Paginator
from citas.models import Cita
import calendar
from notificaciones.models import Notificacion 

def loginService(correo, contraseña):
    # Busca en ambas tablas
    usuario = Usuario.objects.filter(correo=correo).first()
    medico = Medico.objects.filter(correo=correo).first()

    # Verifica que existe en alguna tabla
    if not usuario and not medico:
       return None,{"correo": ["El correo no se encuentra registrado"]}, 404

    # Verifica usuario
    if usuario and bcrypt.checkpw(contraseña.encode(), usuario.contraseña.encode()):
        token = RefreshToken.for_user(usuario)
        token['tipo'] = 'usuario'  # ← nuevo: marca el tipo de cuenta en el token
        serializer = UsuarioSerializer(usuario)
        return token, serializer.data, 200

    # Verifica medico
    if medico and bcrypt.checkpw(contraseña.encode(), medico.contraseña.encode()):
        token = RefreshToken.for_user(medico)
        token['tipo'] = 'medico'  # ← nuevo: marca el tipo de cuenta en el token
        serializer = MedicoSerializer(medico)
        return token, serializer.data, 200

    return None, {"general": ["Credenciales incorrectas"]}, 401

def solicitarCambioService(correo):
    # Busca en ambas tablas
    usuario = Usuario.objects.filter(correo=correo).first()
    medico = Medico.objects.filter(correo=correo).first()

    if not usuario and not medico:
        return {"general": ["El correo no se encuentra registrado"]}, 404

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

    persona = usuario or medico
    
    if persona.ultimo_envio:
        tiempo_transcurrido = timezone.now() - persona.ultimo_envio

        if tiempo_transcurrido < timedelta(minutes=5):
            segundos_restantes = max(0, 300 - int(tiempo_transcurrido.total_seconds()))
            minutos = segundos_restantes // 60
            segundos = segundos_restantes % 60
            if minutos > 0:
                return {"general":[f"Espera {minutos} min {segundos} seg antes de reenviar"]}, 400
            else:
                return {"general":[f"Espera {segundos} segundos antes de reenviar"]}, 400
    
    if persona :
        # Envía el email
        link = f'http://localhost:3000/reset-password?token={token}'
        nombre = persona.nombre or 'Usuario'
        apellido = persona.apellido or ''
        html_content = render_to_string(
            'emails/reset_password.html',
            {'link': link,
            'nombre': nombre,
            'apellido': apellido}
        )
        try:
            send_mail(
                subject='Recupera tu contraseña - DocSmart',
                message=f'Usa este enlace: {link}',
                from_email=os.getenv('EMAIL_HOST_USER'),
                recipient_list=[correo],
                html_message=html_content,
                fail_silently=False
            )
            persona.ultimo_envio = timezone.now()
            persona.save()
            return 'Email enviado correctamente', 200

        except Exception as e:
            print("Error enviando correo:", e)
            return {"general": ['Error enviando el correo']}, 500
    
def cambiarContraseñaService(token, nueva_contraseña):
    
    # Busca el token en ambas tablas
    usuario = Usuario.objects.filter(token_reset=token).first()
    medico = Medico.objects.filter(token_reset=token).first()

    if not usuario and not medico:
        return {"general": ["Token inválido"]}, 400

    # Verifica que el token no haya expirado
    persona = usuario or medico
    
    if not persona.token_reset_expira or persona.token_reset_expira < timezone.now():
        persona.token_reset = None
        persona.token_reset_expira = None
        persona.save()
        return {"general":["El token ha expirado"]}, 400
    
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

def registrarUsuarioService(datos):

    usuario_correo = Usuario.objects.filter(correo=datos.get('correo')).first()
    medico_correo = Medico.objects.filter(correo=datos.get('correo')).first()

    usuario_cedula = Usuario.objects.filter(cedula=datos.get('cedula')).first()
    medico_cedula = Medico.objects.filter(cedula=datos.get('cedula')).first()
    # Verifica que existe en alguna tabla
    if usuario_correo or medico_correo:
       return {"correo": ["El correo ya se encuentra registrado"]}, 404

    if usuario_cedula or medico_cedula:
        return {'cedula': ['La cédula ya está registrada']}, 400

    # Obtiene el rol
    rol = Rol.objects.filter(nombre='paciente').first()
    if not rol:
        return 'Rol no encontrado', 404

    # Encripta la contraseña
    contraseña_hash = bcrypt.hashpw(
        datos.get('contraseña').encode(),
        bcrypt.gensalt()
    ).decode()

    # Crea el usuario
    usuario = Usuario.objects.create(
        nombre=datos.get('nombre'),
        apellido=datos.get('apellido'),
        fecha_nacimiento=datos.get('fecha_nacimiento'),
        estatura=datos.get('estatura'),
        peso=datos.get('peso'),
        correo=datos.get('correo'),
        contraseña=contraseña_hash,
        cedula=datos.get('cedula'),
        telefono=datos.get('telefono'),
        id_rol=rol
    )

    serializer = UsuarioSerializer(usuario)
    return serializer.data, 201




def listarUsuariosService(page=None, page_size=10, search=None):
    usuarios = Usuario.objects.all()
    if search:
        usuarios = usuarios.filter(nombre__icontains=search)
    usuarios = usuarios.order_by('nombre')

    if page is None:
        serializer = UsuarioSerializer(usuarios, many=True)
        return serializer.data, 200
    try:
        page_size = int(page_size)
    except (TypeError, ValueError):
        page_size = 10

    paginator = Paginator(usuarios, page_size)
    page_obj = paginator.get_page(page)
    serializer = UsuarioSerializer(page_obj.object_list, many=True)

    return {
        "resultados": serializer.data,
        "paginacion": {
            "count": paginator.count,
            "total_pages": paginator.num_pages,
            "current_page": page_obj.number,
            "page_size": page_size,
        },
    }, 200

def actualizarFotoPerfilPacienteService(usuario, foto_perfil):

    usuario.foto_perfil = foto_perfil

    usuario.save(
        update_fields=["foto_perfil"]
    )

    return usuario

def eliminarFotoPerfilPacienteService(usuario):

    if usuario.foto_perfil:
        usuario.foto_perfil.delete(save=False)

    usuario.foto_perfil = None
    usuario.save(update_fields=["foto_perfil"])

    return usuario

def obtenerUsuarioService(id):
    usuario = Usuario.objects.filter(id=id).first()
    if not usuario:
        return 'Usuario no encontrado', 404
    serializer = UsuarioPerfilSerializer(usuario)
    return serializer.data, 200


def editarUsuarioService(id, datos):
    usuario = Usuario.objects.filter(id=id).first()
    if not usuario:
        return 'Usuario no encontrado', 404

    nuevo_correo = datos.get('correo')
    if nuevo_correo and nuevo_correo != usuario.correo:
        if Usuario.objects.filter(correo=nuevo_correo).exists():
            return {"correo": ["El correo ya está registrado"]}, 400
        usuario.correo = nuevo_correo

    usuario.nombre = datos.get('nombre', usuario.nombre)
    usuario.apellido = datos.get('apellido', usuario.apellido)
    usuario.fecha_nacimiento = datos.get('fecha_nacimiento', usuario.fecha_nacimiento)
    usuario.estatura = datos.get('estatura', usuario.estatura)
    usuario.peso = datos.get('peso', usuario.peso)
    usuario.telefono = datos.get('telefono', usuario.telefono)
    usuario.save()

    serializer = UsuarioPerfilSerializer(usuario)
    return serializer.data, 200


def eliminarUsuarioService(id):
    usuario = Usuario.objects.filter(id=id).first()
    if not usuario:
        return 'Usuario no encontrado', 404
    usuario.delete()
    return 'Usuario eliminado correctamente', 200

def obtenerDashboardPacienteInicioService(id):
    fecha_actual = timezone.now()
    usuario = Usuario.objects.filter(id=id).first()
    
    if not usuario:
        return 'Usuario no encontrado', 404
    
    nombreCompletoUsuario = f"{usuario.nombre} {usuario.apellido}"
    
    proximasTresCita = Cita.objects.filter(
        id_usuario = usuario,
        fecha_programada__gte = fecha_actual,
        id_estado__nombre = 'confirmada'
    ).order_by('fecha_programada')[:3]
    
    proximas_citas = []

    for cita in proximasTresCita:
        proximas_citas.append({
            "id": cita.id,
            "fecha_programada": cita.fecha_programada,
            "medico": f"{cita.id_medico.nombre} {cita.id_medico.apellido}",
            "especialidad": cita.id_medico.id_especialidad.nombre,
            "estado": cita.id_estado.nombre,
            "direccion": cita.id_medico.direccion,
            "ciudad": cita.id_medico.ciudad.nombre,
            "departamento": cita.id_medico.ciudad.departamento.nombre,
            "foto_medico": (
                cita.id_medico.foto_perfil.url
                if cita.id_medico.foto_perfil
                else None),
    })
    
    numeroCitasProximas = Cita.objects.filter(
        id_usuario = usuario,
        fecha_programada__gte = fecha_actual,
        id_estado__nombre = 'confirmada',
    ).count()
    
    numeroCitasPendientes = Cita.objects.filter(
            id_usuario = usuario,
            fecha_programada__gte = fecha_actual,
            id_estado__nombre__in = ['pendiente','reprogramada'],
        ).count()
    
    primer_dia = fecha_actual.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    ultimo_dia = fecha_actual.replace(
        day=calendar.monthrange(fecha_actual.year, fecha_actual.month)[1],
        hour=23, minute=59, second=59
    )
    consultasRealizadasEsteMes = Cita.objects.filter(
        id_usuario=usuario,
        id_estado__nombre='completada',
        fecha_final__range=(primer_dia, ultimo_dia)
    ).count()
    
    consultasCanceladasEsteMes = Cita.objects.filter(
        id_usuario = usuario,
        id_estado__nombre ='cancelada',
        fecha_cancelacion__range=(primer_dia,ultimo_dia)
    ).count()
    
    data = {
        "usuario" : nombreCompletoUsuario,
        "id": usuario.id,
        "foto_perfil": usuario.foto_perfil.url if usuario.foto_perfil else None,
        "proximas_citas": proximas_citas,
        "estadisticas": {
            "cantidad_proximas_citas": numeroCitasProximas,
            "consultas_pendientes": numeroCitasPendientes,
            "consultas_realizadas_mes": consultasRealizadasEsteMes,
            "consultas_canceladas_mes": consultasCanceladasEsteMes,
        },
    }
    
    return data,200