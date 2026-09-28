from catalogos.models import Rol
import bcrypt
from rest_framework_simplejwt.tokens import RefreshToken
from users.models import Usuario
from medicos.models import Medico,SolicitudValidacionMedico
from users.serializers import UsuarioSerializer, MedicoSerializer,UsuarioPerfilSerializer
import secrets
from django.utils import timezone
from datetime import timedelta
from django.core.mail import send_mail
import os
import resend
from django.template.loader import render_to_string
from django.core.paginator import Paginator
from citas.models import Cita
import calendar
from notificaciones.models import Notificacion 
import logging
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from utils import filtrarMedicosAprobados
from django.db.models import Count,OuterRef, Subquery, Value
from django.db.models.functions import TruncMonth, Coalesce
from dateutil.relativedelta import relativedelta
from django.contrib.auth.hashers import (
    make_password,
    check_password,
)

from django.db import transaction

from users.models import (
    Usuario,
    ProcesoRegistroUsuario,
    CambioCorreoUsuario,
)

#configuración de OTP
MAX_INTENTOS_OTP = 5
MAX_REENVIOS_OTP = 5

DURACION_OTP_MINUTOS = 10
DURACION_PROCESO_MINUTOS = 30

TIEMPO_REENVIO_SEGUNDOS = 60
def generarCodigoOTP():
    return f"{secrets.randbelow(1_000_000):06d}"


logger = logging.getLogger(__name__)
resend.api_key = os.getenv("RESEND_API_KEY")

def loginService(correo, contraseña):
    correo = correo.strip().lower()

    # Busca el correo en ambas tablas
    usuario = Usuario.objects.filter(
        correo__iexact=correo
    ).first()

    medico = Medico.objects.filter(
        correo__iexact=correo
    ).first()

    # El correo no existe en ninguna de las dos tablas
    if not usuario and not medico:
        return (
            None,
            {
                "correo": [
                    "El correo no se encuentra registrado"
                ]
            },
            404
        )

    # Verifica paciente
    if usuario and bcrypt.checkpw(
        contraseña.encode(),
        usuario.contraseña.encode()
    ):
        token = RefreshToken.for_user(usuario)
        token["tipo"] = "usuario"

        serializer = UsuarioSerializer(usuario)

        return token, serializer.data, 200

    # Verifica médico
    if medico and bcrypt.checkpw(
        contraseña.encode(),
        medico.contraseña.encode()
    ):
        # Obtiene la última solicitud de validación del médico
        ultima_solicitud = medico.ultima_solicitud_validacion

        token = RefreshToken.for_user(medico)
        token["tipo"] = "medico"

        # Agrega el estado actual de validación al token
        token["estado_validacion"] = (
            ultima_solicitud.estado
            if ultima_solicitud
            else None
        )

        serializer = MedicoSerializer(medico)

        return token, serializer.data, 200

    # El correo existe, pero la contraseña es incorrecta
    return (
        None,
        {
            "general": [
                "Credenciales incorrectas"
            ]
        },
        401
    )
    
def refreshTokenService(refresh_token):
    try:
        refresh = RefreshToken(refresh_token)

        nuevo_access_token = refresh.access_token

        return nuevo_access_token, None, 200

    except TokenError:
        return (
            None,
            {
                "general": [
                    "La sesión ha expirado. Inicia sesión nuevamente."
                ]
            },
            401
        )
        
def solicitarCambioCorreoService(usuario,nuevo_correo):

    nuevo_correo = (nuevo_correo .strip().lower())

    if (
        nuevo_correo
        == usuario.correo.lower()
    ):
        return {
            "correo": [
                "El correo ingresado es el actual"
            ]
        }, 400

    ocupado = (
        Usuario.objects.filter(
            correo__iexact=nuevo_correo
        ).exclude(
            id=usuario.id
        ).exists()
        or
        Medico.objects.filter(
            correo__iexact=nuevo_correo
        ).exists()
    )

    if ocupado:
        return {"correo": ["El correo ya se encuentra registrado"]}, 400

    CambioCorreoUsuario.objects.filter(
        usuario=usuario,
        estado=(CambioCorreoUsuario.Estado.PENDIENTE)
    ).update(estado=(CambioCorreoUsuario.Estado.EXPIRADO))

    codigo = generarCodigoOTP()
    ahora = timezone.now()
    cambio = CambioCorreoUsuario.objects.create(
        usuario=usuario,
        nuevo_correo=nuevo_correo,
        otp_hash=make_password(codigo),
        otp_expira_en=(
            ahora
            + timedelta(
                minutes=DURACION_OTP_MINUTOS
            )
        ),
    )

    try:

        resend.Emails.send({
            "from": os.getenv(
                "RESEND_FROM_EMAIL"
            ),
            "to": [nuevo_correo],
            "subject": (
                "Confirma tu nuevo correo - DocSmart"
            ),
            "html": f"""
                <h2>Cambio de correo electrónico</h2>

                <p>
                    Código de verificación:
                </p>

                <h1>{codigo}</h1>

                <p>
                    Este código expirará en
                    {DURACION_OTP_MINUTOS} minutos.
                </p>
            """
        })

    except Exception:

        logger.exception("Error enviando OTP cambio correo")

        cambio.delete()
        return {"general": ["No fue posible enviar el código"]}, 500

    return {"cambio_id": str(cambio.id)}, 201

@transaction.atomic
def confirmarCambioCorreoService(usuario,cambio_id,codigo):

    cambio = (
        CambioCorreoUsuario.objects
        .select_for_update()
        .filter(
            id=cambio_id,
            usuario=usuario
        )
        .first()
    )
    if not cambio:
        return {"general": ["Solicitud inválida"]}, 400

    if (
        cambio.estado
        != CambioCorreoUsuario.Estado.PENDIENTE
    ):
        return {
            "general": [
                "Esta solicitud ya no está disponible"
            ]
        }, 400

    ahora = timezone.now()

    if cambio.otp_expira_en <= ahora:
        cambio.estado = (CambioCorreoUsuario.Estado.EXPIRADO)
        cambio.save(update_fields=["estado"])
        
        return {
            "codigo": ["El código ha expirado"]}, 400

    if cambio.intentos >= MAX_INTENTOS_OTP:
        cambio.estado = (CambioCorreoUsuario.Estado.BLOQUEADO)
        cambio.save(update_fields=["estado"])

        return {
            "general": ["Se alcanzó el máximo de intentos"]}, 429

    if not check_password(codigo,cambio.otp_hash):

        cambio.intentos += 1
        campos = ["intentos"]

        if cambio.intentos >= MAX_INTENTOS_OTP:
            cambio.estado = (CambioCorreoUsuario.Estado.BLOQUEADO)
            campos.append("estado")

        cambio.save(
            update_fields=campos
        )

        return {"codigo": ["Código incorrecto"]}, 400

    # Volver a verificar justo antes
    # de cambiar el correo.
    ocupado = (
        Usuario.objects.filter(
            correo__iexact=cambio.nuevo_correo
        ).exclude(
            id=usuario.id
        ).exists()
        or
        Medico.objects.filter(
            correo__iexact=cambio.nuevo_correo
        ).exists()
    )

    if ocupado:
        return {
            "correo": [
                "El correo ya se encuentra registrado"
            ]
        }, 400

    usuario.correo = cambio.nuevo_correo
    usuario.save(update_fields=["correo"])

    cambio.estado = (CambioCorreoUsuario.Estado.COMPLETADO)
    cambio.completado_en = ahora
    cambio.save(
        update_fields=[
            "estado",
            "completado_en",
        ]
    )

    return {"correo": usuario.correo}, 200
    
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

def cambiarContraseñaAutenticadoService(persona,contraseña_actual,nueva_contraseña):
    if not isinstance(persona, (Usuario, Medico)):
        return 'Usuario no válido', 400
    
    if not bcrypt.checkpw(contraseña_actual.encode(),persona.contraseña.encode()):
        return 'La contraseña ingresada no es correcta', 400

    nuevaContraseñaHash = bcrypt.hashpw(nueva_contraseña.encode(),bcrypt.gensalt()).decode()

    persona.contraseña = nuevaContraseñaHash
    persona.save()

    return 'Contraseña actualizada correctamente', 200
        
def registrarUsuarioService(datos):

    correo = datos["correo"].strip().lower()
    cedula = datos["cedula"].strip()

    # No revelamos demasiado sobre cuentas existentes.
    correo_ocupado = (
        Usuario.objects.filter(
            correo__iexact=correo
        ).exists()
        or
        Medico.objects.filter(
            correo__iexact=correo
        ).exists()
    )

    if correo_ocupado:
        return {"correo": ["No fue posible utilizar este correo"]}, 400

    cedula_ocupada = (
        Usuario.objects.filter(
            cedula=cedula
        ).exists()
        or
        Medico.objects.filter(
            cedula=cedula
        ).exists()
    )

    if cedula_ocupada:
        return {"cedula": ["No fue posible utilizar este documento"]}, 400

    # Invalidar procesos anteriores sin completar.
    ProcesoRegistroUsuario.objects.filter(
        correo__iexact=correo
    ).exclude(
        estado=(ProcesoRegistroUsuario.Estado.COMPLETADO)
    ).update(
        estado=(ProcesoRegistroUsuario.Estado.EXPIRADO)
    )
    codigo = generarCodigoOTP()
    ahora = timezone.now()

    contraseña_hash = bcrypt.hashpw(
        datos["contraseña"].encode(),
        bcrypt.gensalt()
    ).decode()

    proceso = ProcesoRegistroUsuario.objects.create(
        nombre_declarado=datos["nombre"],
        apellido_declarado=datos["apellido"],
        fecha_nacimiento_declarada=(
            datos["fecha_nacimiento"]
        ),
        cedula_declarada=cedula,
        correo=correo,
        contraseña_hash=contraseña_hash,

        telefono=datos["telefono"],
        estatura=datos["estatura"],
        peso=datos["peso"],

        otp_hash=make_password(codigo),

        otp_expira_en=(
            ahora
            + timedelta(
                minutes=DURACION_OTP_MINUTOS
            )
        ),

        ultimo_envio_otp=ahora,
        expira_en=(ahora + timedelta(minutes=DURACION_PROCESO_MINUTOS)),
    )
    try:
        resend.Emails.send({
            "from": os.getenv(
                "RESEND_FROM_EMAIL"
            ),
            "to": [correo],
            "subject": (
                "Código de verificación - DocSmart"
            ),
            "html": f"""
                <h2>Verificación de correo</h2>

                <p>
                    Tu código de verificación es:
                </p>

                <h1>{codigo}</h1>

                <p>
                    Este código expirará en
                    {DURACION_OTP_MINUTOS} minutos.
                </p>

                <p>
                    Si no solicitaste este registro,
                    ignora este mensaje.
                </p>
            """
        })

    except Exception:
        logger.exception("Error enviando OTP de registro")
        proceso.delete()

        return {
            "general": ["No fue posible enviar el código"]}, 500

    return {"proceso_id": str(proceso.id)}, 201


def verificarCorreoRegistroService(proceso_id,codigo):
    ahora = timezone.now()
    proceso = (ProcesoRegistroUsuario.objects.filter(id=proceso_id).first())

    if not proceso:
        return {"general": ["Proceso de registro inválido"]}, 400

    if proceso.estado in [
        ProcesoRegistroUsuario.Estado.BLOQUEADO,
        ProcesoRegistroUsuario.Estado.EXPIRADO,
        ProcesoRegistroUsuario.Estado.COMPLETADO,
    ]:
        return {"general": ["El proceso ya no está disponible"]}, 400

    if proceso.expira_en <= ahora:
        proceso.estado = (ProcesoRegistroUsuario.Estado.EXPIRADO)
        proceso.save(update_fields=["estado"])

        return {"general": ["El proceso de registro ha expirado"]}, 400

    if proceso.correo_verificado:
        return {"correo_verificado": True}, 200

    if proceso.intentos_otp >= MAX_INTENTOS_OTP:

        proceso.estado = (ProcesoRegistroUsuario.Estado.BLOQUEADO)
        proceso.save(update_fields=["estado"])

        return {"general": ["Se alcanzó el máximo de intentos"]}, 429

    if (
        not proceso.otp_expira_en
        or proceso.otp_expira_en <= ahora
    ):
        return {"codigo": ["El código ha expirado"]}, 400

    if not check_password(codigo,proceso.otp_hash):

        proceso.intentos_otp += 1
        campos = ["intentos_otp"]

        if (
            proceso.intentos_otp
            >= MAX_INTENTOS_OTP
        ):
            proceso.estado = (
                ProcesoRegistroUsuario
                .Estado
                .BLOQUEADO
            )

            campos.append("estado")
        proceso.save(

            update_fields=campos
        )

        return {"codigo": ["Código incorrecto"]}, 400

    proceso.correo_verificado = True
    proceso.correo_verificado_en = ahora
    proceso.estado = (ProcesoRegistroUsuario.Estado.CORREO_VERIFICADO)

    # OTP de un solo uso.
    proceso.otp_hash = None
    proceso.otp_expira_en = None

    proceso.save(
        update_fields=[
            "correo_verificado",
            "correo_verificado_en",
            "estado",
            "otp_hash",
            "otp_expira_en",
        ]
    )

    return {"correo_verificado": True}, 200


def reenviarCodigoRegistroService(proceso_id):

    proceso = (ProcesoRegistroUsuario.objects.filter(id=proceso_id).first())

    if not proceso:
        return {"general": ["Proceso de registro inválido"]}, 400

    if proceso.correo_verificado:
        return {"general": ["El correo ya fue verificado"]}, 400

    if proceso.estado in [
        ProcesoRegistroUsuario.Estado.BLOQUEADO,
        ProcesoRegistroUsuario.Estado.EXPIRADO,
        ProcesoRegistroUsuario.Estado.COMPLETADO,
    ]:
        return {
            "general": ["El proceso ya no está disponible"]}, 400

    ahora = timezone.now()

    if proceso.expira_en <= ahora:
        proceso.estado = (ProcesoRegistroUsuario.Estado.EXPIRADO)
        proceso.save(update_fields=["estado"])

        return {"general": ["El proceso ha expirado"]}, 400

    if proceso.reenvios_otp >= MAX_REENVIOS_OTP:
        return {"general": ["Se alcanzó el máximo de reenvíos"]}, 429

    if proceso.ultimo_envio_otp:

        transcurrido = (ahora - proceso.ultimo_envio_otp).total_seconds()

        if transcurrido < TIEMPO_REENVIO_SEGUNDOS:

            restantes = int(TIEMPO_REENVIO_SEGUNDOS - transcurrido)

            return {"general": [f"Espera {restantes} segundos"]}, 429

    codigo = generarCodigoOTP()

    proceso.otp_hash = make_password(codigo)
    proceso.otp_expira_en = (ahora + timedelta(minutes=DURACION_OTP_MINUTOS))
    proceso.ultimo_envio_otp = ahora
    proceso.reenvios_otp += 1

    try:

        resend.Emails.send({
            "from": os.getenv(
                "RESEND_FROM_EMAIL"
            ),
            "to": [proceso.correo],
            "subject": (
                "Nuevo código de verificación - DocSmart"
            ),
            "html": f"""
                <h2>Nuevo código</h2>
                <h1>{codigo}</h1>

                <p>
                    El código expirará en
                    {DURACION_OTP_MINUTOS} minutos.
                </p>
            """
        })

    except Exception:
        logger.exception("Error reenviando OTP de registro")

        return { "general": [ "No fue posible enviar el código"]}, 500

    proceso.save(
        update_fields=[
            "otp_hash",
            "otp_expira_en",
            "ultimo_envio_otp",
            "reenvios_otp",
        ]
    )

    return {"general": ["Código reenviado correctamente"]}, 200


@transaction.atomic
def completarRegistroUsuarioService(proceso_id):

    proceso = (ProcesoRegistroUsuario.objects.select_for_update().filter(id=proceso_id).first())

    if not proceso:
        return {"general": ["Proceso de registro inválido"]}, 400

    if (
        proceso.estado
        ==
        ProcesoRegistroUsuario.Estado.COMPLETADO
    ):
        return {"general": ["El registro ya fue completado" ]}, 400

    if proceso.expira_en <= timezone.now():

        proceso.estado = (ProcesoRegistroUsuario.Estado.EXPIRADO)

        proceso.save(update_fields=["estado"])

        return {"general": ["El proceso ha expirado"]}, 400

    if not proceso.correo_verificado:
        return {
            "correo": ["El correo no ha sido verificado"]}, 400

    if not proceso.documento_verificado:
        return {"documento": ["El documento no ha sido verificado"]}, 400

    if not all([
        proceso.nombre_verificado,
        proceso.apellido_verificado,
        proceso.cedula_verificada,
        proceso.fecha_nacimiento_verificada,
    ]):
        return {"documento": ["La identidad verificada está incompleta"]}, 400

    correo_ocupado = (
        Usuario.objects.filter(
            correo__iexact=proceso.correo
        ).exists()
        or
        Medico.objects.filter(
            correo__iexact=proceso.correo
        ).exists()
    )

    if correo_ocupado:
        return {"correo": ["No fue posible completar el registro"]}, 400

    cedula_ocupada = (
        Usuario.objects.filter(
            cedula=proceso.cedula_verificada
        ).exists()
        or
        Medico.objects.filter(
            cedula=proceso.cedula_verificada
        ).exists()
    )

    if cedula_ocupada:
        return {"cedula": ["No fue posible completar el registro"]}, 400
    rol = Rol.objects.filter(nombre__iexact="paciente").first()

    if not rol:
        return {"general": ["Rol de paciente no configurado"]}, 500

    usuario = Usuario.objects.create(
        # Estos vienen exclusivamente
        # de la identidad verificada.
        nombre=proceso.nombre_verificado,
        apellido=proceso.apellido_verificado,
        fecha_nacimiento=(
            proceso
            .fecha_nacimiento_verificada
        ),
        cedula=proceso.cedula_verificada,

        correo=proceso.correo,

        contraseña=proceso.contraseña_hash,

        telefono=proceso.telefono,
        estatura=proceso.estatura,
        peso=proceso.peso,

        id_rol=rol,
    )

    proceso.estado = (ProcesoRegistroUsuario.Estado.COMPLETADO)
    proceso.completado_en = timezone.now()
    proceso.save(update_fields=["estado","completado_en",])

    serializer = UsuarioSerializer(usuario)
    return serializer.data, 201

def listarPacientesService(page=None, page_size=10, search=None):
    usuarios = Usuario.objects.filter(id_rol__nombre__iexact = "paciente")
    
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
    nombre_foto_anterior = (
        usuario.foto_perfil.name
        if usuario.foto_perfil
        else None
    )

    storage = usuario.foto_perfil.storage

    # Guardar primero la nueva foto
    usuario.foto_perfil = foto_perfil

    usuario.save(
        update_fields=["foto_perfil"]
    )

    # Borrar la anterior directamente desde el storage,
    # sin modificar nuevamente usuario.foto_perfil
    if nombre_foto_anterior:
        storage.delete(nombre_foto_anterior)

    return usuario


def eliminarFotoPerfilPacienteService(usuario):
    if usuario.foto_perfil:
        try:
            usuario.foto_perfil.delete(save=False)
        except Exception:
            logger.exception(
                "Error eliminando foto de perfil del paciente"
            )

    usuario.foto_perfil = None

    usuario.save(
        update_fields=["foto_perfil"]
    )

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
        return "Usuario no encontrado", 404

    usuario.estatura = datos.get("estatura",usuario.estatura)
    usuario.peso = datos.get("peso",usuario.peso)
    usuario.telefono = datos.get("telefono",usuario.telefono)

    usuario.save(
        update_fields=[
            "estatura",
            "peso",
            "telefono",
        ]
    )
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

#!Metodos de estadistica para el panel del admin

def obtenerMetricasSistema():
    medicos = Medico.objects.all()
    totalMedicosAprobados = filtrarMedicosAprobados(medicos).count()
    totalPacientes = Usuario.objects.filter(id_rol__nombre__iexact = "paciente").count()
    totalCitas = Cita.objects.all().count()
    totalSolicitudesPendientes = SolicitudValidacionMedico.objects.filter(estado=SolicitudValidacionMedico.EstadoSolicitud.PENDIENTE).count()
    data = {
        "total_medicos_aprobados" : totalMedicosAprobados,
        "total_pacientes" : totalPacientes,
        "total_citas" : totalCitas,
        "total_solicitudes_pendientes": totalSolicitudesPendientes,
    }
    return data,200

def obtenerEstadisticasSistemaService():
    
    #citas
    citaPorEstado = Cita.objects.values('id_estado__nombre').annotate(total=Count('id')).order_by('-total')
    citaPorMes = Cita.objects.annotate(mes=TruncMonth('fecha_creacion')).values('mes').annotate(total=Count('id')).order_by('mes')
    citaPorEspecialidad = Cita.objects.values('id_medico__id_especialidad__nombre').annotate(total=Count('id')).order_by('-total')
    
    #medicos
    medicosPorEpecialidad = filtrarMedicosAprobados(Medico.objects.all()).values('id_especialidad__nombre').annotate(total=Count('id')).order_by('-total')
    solicitudesValidacionPorMes = (SolicitudValidacionMedico.objects.annotate(mes=TruncMonth("fecha_solicitud")).values("mes").annotate(total=Count("id")).order_by("mes"))
    ultimaSolicitud = (SolicitudValidacionMedico.objects.filter(medico=OuterRef("pk")).order_by("-fecha_solicitud").values("estado")[:1])
    medicosPorEstadoValidacion = (Medico.objects.annotate(estado_actual=Coalesce(Subquery(ultimaSolicitud),Value("sin_solicitud"))).values("estado_actual").annotate(total=Count("id")).order_by("-total"))
    
    #pacientes
    pacientesPorCitas = Cita.objects.filter(id_usuario__id_rol__nombre="paciente").values("id_usuario","id_usuario__nombre","id_usuario__apellido").annotate(total=Count("id")).order_by("-total")[:5]
    pacientesPorMes = (Usuario.objects.filter(id_rol__nombre__iexact="paciente").annotate(mes=TruncMonth("fecha_creacion")).values("mes").annotate(total=Count("id")).order_by("mes"))
    
    hoy = timezone.localdate()
    pacientes = Usuario.objects.filter(id_rol__nombre__iexact="paciente")
    
    hace18 = hoy - relativedelta(years=18)
    hace30 = hoy - relativedelta(years=30)
    hace45 = hoy - relativedelta(years=45)
    hace60 = hoy - relativedelta(years=60)

    menores18 = pacientes.filter(
        fecha_nacimiento__gt=hace18
    ).count()

    entre18y29 = pacientes.filter(
        fecha_nacimiento__lte=hace18,
        fecha_nacimiento__gt=hace30
    ).count()

    entre30y44 = pacientes.filter(
        fecha_nacimiento__lte=hace30,
        fecha_nacimiento__gt=hace45
    ).count()

    entre45y59 = pacientes.filter(
        fecha_nacimiento__lte=hace45,
        fecha_nacimiento__gt=hace60
    ).count()

    mayores60 = pacientes.filter(
        fecha_nacimiento__lte=hace60
    ).count()

    data = {
        "citas": {
            "citas_por_estado" : [],
            "citas_por_mes" : [],
            "citas_por_especialidad" : [],
        },
        "medicos":{
            "medicos_por_especialidad" : [],
            "medicos_por_estado_validacion": [],
            "solicitudes_validacion_por_mes": []
        },
        "pacientes":{
            "pacientes_por_citas": [],
            "pacientes_por_edad": [],
            "pacientes_por_mes": [],
        },
    }
    
    #citas
    for item in citaPorEstado:
        data["citas"]["citas_por_estado"].append({
            "estado" : item['id_estado__nombre'],
            "total" : item['total']
        })
        
    for item in citaPorMes:
        data["citas"]["citas_por_mes"].append({
            "mes" : item['mes'],
            "total_citas" : item['total']
        })
        
    for item in citaPorEspecialidad:
        data["citas"]["citas_por_especialidad"].append({
            "especialidad" : item['id_medico__id_especialidad__nombre'],
            "total_citas" : item["total"]
        })
    
    #medicos
    for item in medicosPorEpecialidad:
        data["medicos"]["medicos_por_especialidad"].append({
            "especialidad" : item['id_especialidad__nombre'],
            "total_medicos" : item['total']
        })
        
    for item in medicosPorEstadoValidacion:
        data["medicos"]["medicos_por_estado_validacion"].append({
            "estado": item["estado_actual"],
            "total_medicos": item["total"]
        })
    
    for item in solicitudesValidacionPorMes:
        data["medicos"]["solicitudes_validacion_por_mes"].append({
            "mes": item["mes"],
            "total_solicitudes": item["total"]
        })
    
    #pacientes
    for item in pacientesPorCitas:
        data["pacientes"]["pacientes_por_citas"].append({
            "paciente" : f'{item["id_usuario__nombre"]} {item["id_usuario__apellido"]}',
            "total_citas" : item["total"]
        })
    
    data["pacientes"]["pacientes_por_edad"] = [
        {
            "rango": "0-17",
            "total_pacientes": menores18
        },
        {
            "rango": "18-29",
            "total_pacientes": entre18y29
        },
        {
            "rango": "30-44",
            "total_pacientes": entre30y44
        },
        {
            "rango": "45-59",
            "total_pacientes": entre45y59
        },
        {
            "rango": "60+",
            "total_pacientes": mayores60
        }
    ] 
    
    for item in pacientesPorMes:
        data["pacientes"]["pacientes_por_mes"].append({
            "mes": item["mes"],
            "total_pacientes": item["total"]
        })
    
    return data,200