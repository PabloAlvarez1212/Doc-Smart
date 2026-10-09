import hashlib,uuid
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image,UnidentifiedImageError
from storage_app.models import Archivo
from django.db import transaction
from catalogos.models import Rol
import bcrypt
from rest_framework_simplejwt.tokens import RefreshToken
from users.models import Usuario,ProcesoRegistroUsuario,InfoUser, TipoInfoUser
from medicos.models import Medico,SolicitudValidacionMedico
from users.serializers import UsuarioSerializer, MedicoSerializer,UsuarioPerfilSerializer
from users.documento_identidad import DocumentoError,extraer_datos_documento
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
from rest_framework.exceptions import NotFound, PermissionDenied
from utils import filtrarMedicosAprobados
from django.db.models import Count,Case, When, Value, CharField,Q
from django.db.models.functions import TruncMonth, Coalesce,TruncDay
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

#configuración de documentos
MAX_DOCUMENTO_BYTES=8*1024*1024
FORMATOS_DOCUMENTO={"JPEG":"image/jpeg","PNG":"image/png","WEBP":"image/webp"}

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
    tipo=datos["tipo_documento"]
    numero=datos["numero_documento"].strip().upper()

    if Usuario.objects.filter(cedula=numero).exists() or Medico.objects.filter(cedula=numero).exists():
        return {"numero_documento":["Este documento ya está registrado"]},400

    ahora=timezone.now()
    proceso=ProcesoRegistroUsuario.objects.create(
        nombre_declarado=datos["nombre"],
        apellido_declarado=datos["apellido"],
        fecha_nacimiento_declarada=datos["fecha_nacimiento"],
        tipo_documento=tipo,
        numero_documento_declarado=numero,
        expira_en=ahora+timedelta(minutes=DURACION_PROCESO_MINUTOS)
    )
    return {"proceso_id":str(proceso.id)},201


def validarProcesoRegistro(proceso):
    if not proceso:return {"general":["Proceso de registro inválido"]},400
    if proceso.estado in [ProcesoRegistroUsuario.Estado.BLOQUEADO,ProcesoRegistroUsuario.Estado.EXPIRADO,ProcesoRegistroUsuario.Estado.COMPLETADO]:
        return {"general":["El proceso ya no está disponible"]},400
    if proceso.expira_en<=timezone.now():
        proceso.estado=ProcesoRegistroUsuario.Estado.EXPIRADO
        proceso.save(update_fields=["estado"])
        return {"general":["El proceso ha expirado"]},400
    return None


@transaction.atomic
def guardarDatosAdicionalesRegistroService(datos):
    proceso=ProcesoRegistroUsuario.objects.select_for_update().filter(id=datos["proceso_id"]).first()
    error=validarProcesoRegistro(proceso)
    if error:return error
    if not proceso.documento_verificado:return {"documento":["Primero debes verificar el documento"]},403
    if proceso.contraseña_hash:return {"general":["Los datos ya están fijados para la verificación de correo"]},400
    proceso.telefono=datos["telefono"]
    proceso.estatura=datos["estatura"]
    proceso.peso=datos["peso"]
    proceso.save(update_fields=["telefono","estatura","peso"])
    return {"datos_guardados":True},200


@transaction.atomic
def configurarCredencialesRegistroService(datos):
    proceso=ProcesoRegistroUsuario.objects.select_for_update().filter(id=datos["proceso_id"]).first()
    error=validarProcesoRegistro(proceso)
    if error:return error
    if not proceso.documento_verificado:return {"documento":["Primero debes verificar el documento"]},403
    if not proceso.telefono or proceso.estatura is None or proceso.peso is None:
        return {"general":["Primero debes guardar los datos adicionales"]},403
    # No reiniciar intentos ni cambiar credenciales de un OTP ya emitido.
    correo=datos["correo"].strip().lower()
    if proceso.contraseña_hash:
        if proceso.correo==correo and bcrypt.checkpw(datos["contraseña"].encode(),proceso.contraseña_hash.encode()):
            return {"correo_configurado":True},200
        return {"correo":["El correo ya está configurado; utiliza reenviar código"]},400
    if Usuario.objects.filter(correo__iexact=correo).exists() or Medico.objects.filter(correo__iexact=correo).exists():
        return {"correo":["No fue posible utilizar este correo"]},400

    codigo=generarCodigoOTP()
    ahora=timezone.now()
    proceso.correo=correo
    proceso.contraseña_hash=bcrypt.hashpw(datos["contraseña"].encode(),bcrypt.gensalt()).decode()
    proceso.otp_hash=make_password(codigo)
    proceso.otp_expira_en=ahora+timedelta(minutes=DURACION_OTP_MINUTOS)
    proceso.ultimo_envio_otp=ahora
    proceso.intentos_otp=0
    proceso.reenvios_otp=0

    try:
        resend.Emails.send({
            "from":os.getenv("RESEND_FROM_EMAIL"),
            "to":[correo],
            "subject":"Código de verificación - DocSmart",
            "html":f"<h2>Verificación de correo</h2><p>Tu código es:</p><h1>{codigo}</h1><p>Expira en {DURACION_OTP_MINUTOS} minutos.</p>"
        })

    except Exception:
        logger.exception("Error enviando OTP de registro")
        return {"general":["No fue posible enviar el código de verificación"]},500

    proceso.save(update_fields=["correo","contraseña_hash","otp_hash","otp_expira_en","ultimo_envio_otp","intentos_otp","reenvios_otp"])
    return {"correo_configurado":True},200


def validarArchivoDocumentoService(archivo):
    if not archivo or archivo.size<=0: return None,{"documento":["Archivo vacío"]},400
    if archivo.size>MAX_DOCUMENTO_BYTES: return None,{"documento":["El archivo supera los 8 MB"]},400

    archivo.seek(0)
    contenido=archivo.read()
    archivo.seek(0)

    try:
        img=Image.open(ContentFile(contenido))
        img.verify()
        img=Image.open(ContentFile(contenido))
        formato=img.format
        if formato not in FORMATOS_DOCUMENTO: return None,{"documento":["Solo se permiten JPG, PNG o WEBP"]},400
        ancho,alto=img.size
        if ancho<600 or alto<350: return None,{"documento":["La resolución de la imagen es demasiado baja"]},400
        if ancho*alto>30000000: return None,{"documento":["La resolución de la imagen es demasiado alta"]},400
    except (UnidentifiedImageError,OSError,ValueError):
        return None,{"documento":["El archivo no es una imagen válida"]},400

    return {
        "contenido":contenido,
        "formato":formato,
        "content_type":FORMATOS_DOCUMENTO[formato],
        "sha256":hashlib.sha256(contenido).hexdigest(),
        "tamano":len(contenido)
    },None,200

@transaction.atomic
def subirDocumentoRegistroService(
    proceso_id,
    documento_frente=None,
    documento_reverso=None
):
    proceso=ProcesoRegistroUsuario.objects.select_for_update().filter(id=proceso_id).first()

    if not proceso:
        return {"general":["Proceso inválido"]},400

    if proceso.estado in [
        ProcesoRegistroUsuario.Estado.BLOQUEADO,
        ProcesoRegistroUsuario.Estado.EXPIRADO,
        ProcesoRegistroUsuario.Estado.COMPLETADO
    ]:
        return {"general":["El proceso ya no está disponible"]},400

    if proceso.expira_en<=timezone.now():
        proceso.estado=ProcesoRegistroUsuario.Estado.EXPIRADO
        proceso.save(update_fields=["estado"])
        return {"general":["El proceso ha expirado"]},400

    if proceso.documento_verificado:
        return {"documento":["El documento ya fue verificado"]},400

    campos=[]

    try:
        if documento_frente:
            datos,error,status=validarArchivoDocumentoService(documento_frente)
            if error:
                return error,status

            ext={"JPEG":"jpg","PNG":"png","WEBP":"webp"}[datos["formato"]]
            key=f"verificaciones/registro/{proceso.id}/frente-{uuid.uuid4().hex}.{ext}"

            key_real=default_storage.save(
                key,
                ContentFile(datos["contenido"])
            )

            archivo_db=Archivo.objects.create(
                usuario=None,
                nombre_original=documento_frente.name,
                storage_key=key_real,
                content_type=datos["content_type"],
                tamano=datos["tamano"],
                tipo="imagen",
                categoria="documento_identidad_frente"
            )

            proceso.documento=archivo_db
            proceso.documento_sha256=datos["sha256"]

            campos+=["documento","documento_sha256"]

        if documento_reverso:
            datos,error,status=validarArchivoDocumentoService(documento_reverso)
            if error:
                return error,status

            ext={"JPEG":"jpg","PNG":"png","WEBP":"webp"}[datos["formato"]]
            key=f"verificaciones/registro/{proceso.id}/reverso-{uuid.uuid4().hex}.{ext}"

            key_real=default_storage.save(
                key,
                ContentFile(datos["contenido"])
            )

            archivo_db=Archivo.objects.create(
                usuario=None,
                nombre_original=documento_reverso.name,
                storage_key=key_real,
                content_type=datos["content_type"],
                tamano=datos["tamano"],
                tipo="imagen",
                categoria="documento_identidad_reverso"
            )

            proceso.documento_reverso=archivo_db
            proceso.documento_reverso_sha256=datos["sha256"]

            campos+=["documento_reverso","documento_reverso_sha256"]

    except Exception:
        logger.exception("Error guardando documento de registro")
        return {"general":["No fue posible guardar el documento"]},500

    if proceso.documento and (proceso.tipo_documento!="CC" or proceso.documento_reverso):
        proceso.estado=ProcesoRegistroUsuario.Estado.DOCUMENTO_CARGADO
        campos.append("estado")

    if campos:
        proceso.save(update_fields=list(set(campos)))

    return {
        "frente_cargado":bool(proceso.documento),
        "reverso_cargado":bool(proceso.documento_reverso)
    },200


def extraerDocumentoRegistroService(proceso_id):
    proceso=ProcesoRegistroUsuario.objects.filter(
        id=proceso_id
    ).select_related(
        "documento",
        "documento_reverso"
    ).first()

    if not proceso:
        return {"general":["Proceso inválido"]},400

    if proceso.estado in [
        ProcesoRegistroUsuario.Estado.BLOQUEADO,
        ProcesoRegistroUsuario.Estado.EXPIRADO,
        ProcesoRegistroUsuario.Estado.COMPLETADO
    ]:
        return {"general":["El proceso ya no está disponible"]},400

    if proceso.expira_en<=timezone.now():
        proceso.estado=ProcesoRegistroUsuario.Estado.EXPIRADO
        proceso.save(update_fields=["estado"])
        return {"general":["El proceso ha expirado"]},400

    if not proceso.documento:
        return {"documento":["Debes cargar el frente del documento"]},400

    try:
        with default_storage.open(
            proceso.documento.storage_key,
            "rb"
        ) as archivo:
            contenido_frente=archivo.read()

        contenido_reverso=None

        if proceso.documento_reverso:
            with default_storage.open(
                proceso.documento_reverso.storage_key,
                "rb"
            ) as archivo:
                contenido_reverso=archivo.read()

        datos=extraer_datos_documento(
            contenido_frente,
            proceso.tipo_documento,
            contenido_reverso=contenido_reverso,
            nombre_declarado=proceso.nombre_declarado,
            apellido_declarado=proceso.apellido_declarado
        )

    except DocumentoError as e:
        return {"documento":[str(e)]},400

    except Exception:
        logger.exception("Error extrayendo documento de registro")
        return {"general":["No fue posible procesar el documento"]},500

    return datos,200

@transaction.atomic
def verificarCorreoRegistroService(proceso_id,codigo):
    ahora = timezone.now()
    proceso = (ProcesoRegistroUsuario.objects.select_for_update().filter(id=proceso_id).first())

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

    if not proceso.documento_verificado or not proceso.correo or not proceso.contraseña_hash:
        return {"general":["Primero debes verificar el documento y configurar el correo"]},403

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


@transaction.atomic
def reenviarCodigoRegistroService(proceso_id):

    proceso = (ProcesoRegistroUsuario.objects.select_for_update().filter(id=proceso_id).first())

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

    if not proceso.documento_verificado or not proceso.correo or not proceso.contraseña_hash:
        return {"general":["Primero debes verificar el documento y configurar el correo"]},403

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
def verificarDocumentoRegistroService(proceso_id):
    proceso=ProcesoRegistroUsuario.objects.select_for_update().filter(id=proceso_id).select_related(
        "documento","documento_reverso"
    ).first()

    if not proceso:return {"general":["Proceso inválido"]},400
    if proceso.estado in [ProcesoRegistroUsuario.Estado.BLOQUEADO,ProcesoRegistroUsuario.Estado.EXPIRADO,ProcesoRegistroUsuario.Estado.COMPLETADO]:
        return {"general":["El proceso ya no está disponible"]},400
    if proceso.expira_en<=timezone.now():
        proceso.estado=ProcesoRegistroUsuario.Estado.EXPIRADO
        proceso.save(update_fields=["estado"])
        return {"general":["El proceso ha expirado"]},400
    if proceso.documento_verificado:return {"documento_verificado":True},200
    if not proceso.documento:return {"documento":["Debes cargar el frente"]},400
    if proceso.tipo_documento=="CC" and not proceso.documento_reverso:
        return {"documento":["Debes cargar el reverso"]},400

    try:
        with default_storage.open(proceso.documento.storage_key,"rb") as f:
            frente=f.read()

        reverso=None
        if proceso.documento_reverso:
            with default_storage.open(proceso.documento_reverso.storage_key,"rb") as f:
                reverso=f.read()

        datos=extraer_datos_documento(
            frente,
            proceso.tipo_documento,
            contenido_reverso=reverso,
            nombre_declarado=proceso.nombre_declarado,
            apellido_declarado=proceso.apellido_declarado
        )
    except DocumentoError as e:
        return {"documento":[str(e)]},400
    except Exception:
        logger.exception("Error verificando documento")
        return {"general":["No fue posible verificar el documento"]},500

    numero=str(datos.get("numero_documento") or "")
    numero_esperado=str(proceso.numero_documento_declarado or "")
    fecha=datos.get("fecha_nacimiento")

    errores={}

    if numero!=numero_esperado:
        errores["numero_documento"]=["El número no coincide con el registrado"]

    if datos.get("nombre_coincide") is not True:
        errores["nombre"]=["El nombre no coincide con el documento"]

    if datos.get("apellido_coincide") is not True:
        errores["apellido"]=["El apellido no coincide con el documento"]

    if not fecha:
        errores["fecha_nacimiento"]=["No fue posible leer la fecha de nacimiento"]
    elif fecha!=proceso.fecha_nacimiento_declarada:
        errores["fecha_nacimiento"]=["La fecha de nacimiento no coincide"]

    if errores:
        proceso.intentos_documento+=1
        proceso.save(update_fields=["intentos_documento"])
        return errores,400

    ahora=timezone.now()

    proceso.numero_documento_verificado=numero
    proceso.nombre_verificado=proceso.nombre_declarado
    proceso.apellido_verificado=proceso.apellido_declarado
    proceso.fecha_nacimiento_verificada=fecha
    proceso.documento_verificado=True
    proceso.documento_verificado_en=ahora
    proceso.estado=ProcesoRegistroUsuario.Estado.DOCUMENTO_VERIFICADO

    proceso.save(update_fields=[
        "numero_documento_verificado",
        "nombre_verificado",
        "apellido_verificado",
        "fecha_nacimiento_verificada",
        "documento_verificado",
        "documento_verificado_en",
        "estado"
    ])

    return {
        "documento_verificado":True,
        "formato_cc":datos.get("formato_cc")
    },200


@transaction.atomic
def completarRegistroUsuarioService(proceso_id):
    proceso=ProcesoRegistroUsuario.objects.select_for_update().filter(id=proceso_id).first()

    if not proceso:return {"general":["Proceso de registro inválido"]},400
    if proceso.estado==ProcesoRegistroUsuario.Estado.COMPLETADO:
        return {"general":["El registro ya fue completado"]},400
    if proceso.estado in [ProcesoRegistroUsuario.Estado.BLOQUEADO,ProcesoRegistroUsuario.Estado.EXPIRADO]:
        return {"general":["El proceso ya no está disponible"]},400

    if proceso.expira_en<=timezone.now():
        proceso.estado=ProcesoRegistroUsuario.Estado.EXPIRADO
        proceso.save(update_fields=["estado"])
        return {"general":["El proceso ha expirado"]},400

    if not proceso.correo_verificado:
        return {"correo":["El correo no ha sido verificado"]},400
    if not proceso.documento_verificado:
        return {"documento":["El documento no ha sido verificado"]},400

    if not proceso.telefono or proceso.estatura is None or proceso.peso is None or not proceso.contraseña_hash or not proceso.correo:
        return {"general":["Los datos adicionales o las credenciales están incompletos"]},400

    if not all([
        proceso.nombre_verificado,
        proceso.apellido_verificado,
        proceso.numero_documento_verificado,
        proceso.fecha_nacimiento_verificada
    ]):
        return {"documento":["La identidad verificada está incompleta"]},400

    if Usuario.objects.filter(correo__iexact=proceso.correo).exists() or Medico.objects.filter(correo__iexact=proceso.correo).exists():
        return {"correo":["No fue posible completar el registro"]},400

    if Usuario.objects.filter(
        cedula=proceso.numero_documento_verificado
    ).exists() or Medico.objects.filter(
        cedula=proceso.numero_documento_verificado
    ).exists():
        return {"numero_documento":["No fue posible completar el registro"]},400

    rol=Rol.objects.filter(nombre__iexact="paciente").first()
    if not rol:return {"general":["Rol de paciente no configurado"]},500

    usuario=Usuario.objects.create(
        nombre=proceso.nombre_verificado,
        apellido=proceso.apellido_verificado,
        fecha_nacimiento=proceso.fecha_nacimiento_verificada,
        tipo_documento=proceso.tipo_documento,
        cedula=proceso.numero_documento_verificado,
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
    solicitudPendienteMasAntigua = (SolicitudValidacionMedico.objects.filter(estado=SolicitudValidacionMedico.EstadoSolicitud.PENDIENTE).order_by("fecha_solicitud").first())
    
    antiguedadSolicitudPendiente = None

    if solicitudPendienteMasAntigua:
        antiguedad = (
            timezone.now()
            - solicitudPendienteMasAntigua.fecha_solicitud
        )

        antiguedadSolicitudPendiente = antiguedad.days

    hoy = timezone.localdate()
    ahora = timezone.localtime()

    totalCitasHoy = Cita.objects.filter(fecha_programada__date=hoy).count()
    
    inicioMes = ahora.replace(
        day=1,
        hour=0,
        minute=0,
        second=0,
        microsecond=0
    )
    
    finMes = inicioMes + relativedelta(months=1)
    
    inicioPeriodo = inicioMes - relativedelta(months=2)
    citasCreadasUltimosMeses = (Cita.objects.filter(fecha_creacion__gte=inicioPeriodo).annotate(mes=TruncMonth("fecha_creacion")).values("mes").annotate(total=Count("id")).order_by("mes"))
    totalPacientesActivosMes = (Cita.objects.filter(fecha_programada__gte=inicioMes,fecha_programada__lt=finMes,id_usuario__id_rol__nombre__iexact="paciente").values("id_usuario").distinct().count())
    especialidadMasSolicitada = (Cita.objects.filter(fecha_creacion__gte=inicioMes,fecha_creacion__lt=finMes).values("id_medico__id_especialidad__nombre").annotate(total=Count("id")).order_by("-total").first())
    especialidadMasProgramada = (Cita.objects.filter(fecha_programada__gte=inicioMes,fecha_programada__lt=finMes).values("id_medico__id_especialidad__nombre").annotate(total=Count("id")).order_by("-total").first())
    totalCancelacionesMes = Cita.objects.filter(fecha_cancelacion__gte=inicioMes,fecha_cancelacion__lt=finMes).count()

    data = {
        "total_medicos_aprobados" : totalMedicosAprobados,
        "total_pacientes" : totalPacientes,
        "total_citas" : totalCitas,
        "total_solicitudes_pendientes": totalSolicitudesPendientes,
        "citas_hoy": totalCitasHoy,
        "pacientes_activos_mes": totalPacientesActivosMes,
        "antiguedad_solicitud_pendiente_dias": antiguedadSolicitudPendiente,
        "citas_creadas_ultimos_3_meses": [],
        "especialidad_mas_solicitada_mes": {
            "especialidad": (
                especialidadMasSolicitada["id_medico__id_especialidad__nombre"]
                if especialidadMasSolicitada
                else None
            ),
            "total_citas": (
                especialidadMasSolicitada["total"]
                if especialidadMasSolicitada
                else 0
            )
        },
        "cancelaciones_mes": totalCancelacionesMes,
        "especialidad_mas_programada_mes": {
            "especialidad": (
                especialidadMasProgramada["id_medico__id_especialidad__nombre"]
                if especialidadMasProgramada
                else None
                ),
                "total_citas": (
                    especialidadMasProgramada["total"]
                    if especialidadMasProgramada
                    else 0
                )
            },
        
    }
    
    for item in citasCreadasUltimosMeses:
        data["citas_creadas_ultimos_3_meses"].append({
            "mes": item["mes"].strftime("%Y-%m"),
            "total": item["total"],
        })
        
    return data,200

def obtenerEstadisticasPacientesService(anio=None, mes=None):

    if mes is not None:
        inicioPeriodo = timezone.localtime().replace(
            year=anio,
            month=mes,
            day=1,
            hour=0,
            minute=0,
            second=0,
            microsecond=0
        )

        finPeriodo = inicioPeriodo + relativedelta(months=1)

    else:
        inicioPeriodo = timezone.localtime().replace(
            year=anio,
            month=1,
            day=1,
            hour=0,
            minute=0,
            second=0,
            microsecond=0
        )

        finPeriodo = inicioPeriodo + relativedelta(years=1)

    aniosPacientes = (
        Usuario.objects
        .filter(
            id_rol__nombre__iexact="paciente"
        )
        .dates(
            "fecha_creacion",
            "year",
            order="DESC"
        )
    )

    aniosCitas = (
        Cita.objects
        .filter(
            id_usuario__id_rol__nombre__iexact="paciente"
        )
        .dates(
            "fecha_programada",
            "year",
            order="DESC"
        )
    )

    aniosDisponibles = sorted(
        {
            fecha.year
            for fecha in [
                *aniosPacientes,
                *aniosCitas
            ]
        },
        reverse=True
    )
    
    citasPeriodo = Cita.objects.filter(id_usuario__id_rol__nombre__iexact="paciente",fecha_programada__gte=inicioPeriodo,fecha_programada__lt=finPeriodo)

    pacientesRegistradosPeriodo = Usuario.objects.filter(id_rol__nombre__iexact="paciente",fecha_creacion__gte=inicioPeriodo,fecha_creacion__lt=finPeriodo)

    if mes is not None:
        pacientesPorPeriodo = (pacientesRegistradosPeriodo.annotate(periodo=TruncDay("fecha_creacion")).values("periodo").annotate(total=Count("id")).order_by("periodo"))

        agrupacionPacientes = "dia"

    else:
        pacientesPorPeriodo = (pacientesRegistradosPeriodo.annotate(periodo=TruncMonth("fecha_creacion")).values("periodo").annotate(total=Count("id")).order_by("periodo"))

        agrupacionPacientes = "mes"

    pacientesCantidadCitas = (
        Usuario.objects
        .filter(
            id_rol__nombre__iexact="paciente",
            fecha_creacion__lt=finPeriodo
        )
        .annotate(
            total_citas=Count(
                "cita",
                filter=Q(
                    cita__fecha_programada__gte=inicioPeriodo,
                    cita__fecha_programada__lt=finPeriodo
                )
            )
        )
        .annotate(
            rango_citas=Case(
                When(
                    total_citas=0,
                    then=Value("Sin citas")
                ),
                When(
                    total_citas=1,
                    then=Value("1 cita")
                ),
                When(
                    total_citas__range=(2, 3),
                    then=Value("2 - 3 citas")
                ),
                When(
                    total_citas__range=(4, 5),
                    then=Value("4 - 5 citas")
                ),
                When(
                    total_citas__gte=6,
                    then=Value("6+ citas")
                ),
                output_field=CharField(),
            )
        )
    )
    
    rangosCitas = {
        "Sin citas": 0,
        "1 cita": 0,
        "2 - 3 citas": 0,
        "4 - 5 citas": 0,
        "6+ citas": 0,
    }

    for paciente in pacientesCantidadCitas.values("rango_citas"):
        rangosCitas[paciente["rango_citas"]] += 1

    if mes is not None:
        pacientesActivosPorPeriodo = (citasPeriodo.annotate(periodo=TruncDay("fecha_programada")).values("periodo").annotate(total_pacientes=Count("id_usuario",distinct=True)).order_by("periodo"))

        agrupacionActivos = "dia"

    else:
        pacientesActivosPorPeriodo = (citasPeriodo.annotate(periodo=TruncMonth("fecha_programada")).values("periodo").annotate(total_pacientes=Count("id_usuario",distinct=True)).order_by("periodo"))

        agrupacionActivos = "mes"

    fechaCorte = (finPeriodo - relativedelta(days=1)).date()

    pacientesExistentes = Usuario.objects.filter(id_rol__nombre__iexact="paciente",fecha_creacion__lt=finPeriodo)

    hace18 = fechaCorte - relativedelta(years=18)
    hace30 = fechaCorte - relativedelta(years=30)
    hace45 = fechaCorte - relativedelta(years=45)
    hace60 = fechaCorte - relativedelta(years=60)

    menores18 = pacientesExistentes.filter(fecha_nacimiento__gt=hace18).count()

    entre18y29 = pacientesExistentes.filter(fecha_nacimiento__lte=hace18,fecha_nacimiento__gt=hace30).count()

    entre30y44 = pacientesExistentes.filter(fecha_nacimiento__lte=hace30,fecha_nacimiento__gt=hace45).count()

    entre45y59 = pacientesExistentes.filter(fecha_nacimiento__lte=hace45,fecha_nacimiento__gt=hace60).count()

    mayores60 = pacientesExistentes.filter(fecha_nacimiento__lte=hace60).count()

    pacientesRegistradosData = []

    for item in pacientesPorPeriodo:
        if agrupacionPacientes == "dia":
            periodo = item["periodo"].strftime("%Y-%m-%d")
        else:
            periodo = item["periodo"].strftime("%Y-%m")

        pacientesRegistradosData.append({
            "periodo": periodo,
            "total_pacientes": item["total"]
        })

    pacientesActivosData = []

    for item in pacientesActivosPorPeriodo:
        if agrupacionActivos == "dia":
            periodo = item["periodo"].strftime("%Y-%m-%d")
        else:
            periodo = item["periodo"].strftime("%Y-%m")

        pacientesActivosData.append({
            "periodo": periodo,
            "total_pacientes": item["total_pacientes"]
        })

    data = {
        "pacientes_por_edad": [
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
        ],
        "pacientes_registrados_por_periodo": {
            "agrupacion": agrupacionPacientes,
            "datos": pacientesRegistradosData
        },
        "pacientes_por_cantidad_citas": [],
        "pacientes_activos_por_periodo": {
            "agrupacion": agrupacionActivos,
            "datos": pacientesActivosData
        },
        "filtros": {
            "anio": anio,
            "mes": mes,
            "anios_disponibles": aniosDisponibles
        },
    }

    for rango, total in rangosCitas.items():
        data["pacientes_por_cantidad_citas"].append({
            "rango": rango,
            "total_pacientes": total,
        })

    return data, 200


def validarPacienteInfoService(usuario):
    if not isinstance(usuario, Usuario):
        raise PermissionDenied("Esta función es para pacientes.")
    if str(usuario.id_rol.nombre).strip().casefold() != "paciente":
        raise PermissionDenied("Esta función es para pacientes.")


def listarTiposInfoUserService(usuario):
    validarPacienteInfoService(usuario)
    return TipoInfoUser.objects.filter(activo=True).order_by("nombre")


def listarInfoUserService(usuario):
    validarPacienteInfoService(usuario)
    return InfoUser.objects.filter(
        id_usuario=usuario
    ).select_related("id_tipo")


def obtenerInfoUserService(usuario, info_id, bloquear=False):
    registros = listarInfoUserService(usuario)
    if bloquear:
        registros = registros.select_for_update()
    try:
        return registros.get(pk=info_id)
    except InfoUser.DoesNotExist:
        raise NotFound("Información no encontrada.")


def _datosInfoUser(datos):
    permitidos = {
        "id_tipo", "nombre", "descripcion", "fecha_inicio", "fecha_fin",
        "estado", "es_permanente", "dosis", "frecuencia",
        "via_administracion", "reaccion",
    }
    return {campo: valor for campo, valor in datos.items() if campo in permitidos}


@transaction.atomic
def crearInfoUserService(usuario, datos):
    validarPacienteInfoService(usuario)
    return InfoUser.objects.create(
        id_usuario=usuario, **_datosInfoUser(datos)
    )


@transaction.atomic
def editarInfoUserService(usuario, info_id, datos):
    registro = obtenerInfoUserService(usuario, info_id, bloquear=True)
    for campo, valor in _datosInfoUser(datos).items():
        setattr(registro, campo, valor)
    registro.save()
    return registro


@transaction.atomic
def eliminarInfoUserService(usuario, info_id):
    obtenerInfoUserService(usuario, info_id, bloquear=True).delete()