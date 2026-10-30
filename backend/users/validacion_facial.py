"""Validación facial del registro: compara el rostro del documento con una selfie.

Detección y comparación con OpenCV (YuNet + SFace, modelos ONNX locales). La decisión se toma
siempre aquí; el cliente solo envía imágenes y el desafío de un solo uso.

Alcance: una coincidencia de rostros no prueba que el documento sea auténtico ni que haya una
persona real frente a la cámara. Los controles de variación entre fotogramas son una barrera
adicional, no una garantía contra fotografías o videos mostrados a la cámara.
"""
import base64
import hashlib
import hmac
import logging
import os
import secrets
import threading
import uuid
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.core.files.storage import default_storage
from django.db import transaction
from django.utils import timezone

from storage_app.models import Archivo
from users.models import ProcesoRegistroUsuario

logger = logging.getLogger(__name__)

Estado = ProcesoRegistroUsuario.EstadoFacial

MODELOS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "modelos_faciales")
LADO_DOCUMENTO = 1280
LADO_SELFIE = 640
ZONA_FOTO = 0.45
LADO_ZONA_MIN = 600
MIN_FOTOGRAMAS = 2
MAX_FOTOGRAMAS = 4
MAX_BYTES_FOTOGRAMA = 3 * 1024 * 1024

# Solo estos documentos no traen fotografía. En los demás, no detectar el rostro nunca
# habilita una alternativa automática: pasa a revisión manual.
TIPOS_SIN_FOTO = {"RC"}

MOTIVOS_OMISION = {"camara_no_disponible", "accesibilidad", "sin_consentimiento"}

MENSAJES = {
    "sin_rostro": "No detectamos tu rostro. Ubícate de frente y con buena luz.",
    "varios_rostros": "Se detectó más de un rostro. Debes aparecer solo en la imagen.",
    "rostro_pequeno": "Acércate un poco más a la cámara.",
    "imagen_borrosa": "La imagen salió borrosa. Mantén el dispositivo firme e inténtalo de nuevo.",
    "mala_iluminacion": "La iluminación no es adecuada. Busca un lugar con luz uniforme.",
    "no_coincide": "El rostro no coincide con la fotografía del documento.",
    "similitud_baja": "No pudimos confirmar tu identidad. Mira de frente, con buena luz y sin accesorios que cubran tu rostro.",
}

_candado = threading.Lock()
_modelos = {}
cv2 = np = None

NO_DISPONIBLE = {"general": ["La verificación facial no está disponible por el momento. Inténtalo más tarde"]}


class FacialNoDisponible(RuntimeError):
    """OpenCV o los modelos no están instalados; no debe afectar a los demás endpoints."""


def _dependencias():
    """Importa OpenCV bajo demanda para que su ausencia no impida cargar las rutas."""
    global cv2, np
    if cv2 is None:
        try:
            import cv2 as _cv2
            import numpy as _np
        except ImportError as error:
            logger.error("Verificación facial no disponible: %s", error)
            raise FacialNoDisponible(str(error)) from error
        cv2, np = _cv2, _np


# ─── Modelos OpenCV ──────────────────────────────────────────────────────────

def _cargar_modelos():
    if not _modelos:
        _modelos["detector"] = cv2.FaceDetectorYN.create(
            os.path.join(MODELOS, "yunet.onnx"), "", (320, 320), 0.7, 0.3, 5000
        )
        _modelos["reconocedor"] = cv2.FaceRecognizerSF.create(
            os.path.join(MODELOS, "sface.onnx"), ""
        )
    return _modelos["detector"], _modelos["reconocedor"]


def _decodificar(contenido, lado):
    img = cv2.imdecode(np.frombuffer(contenido, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        return None
    h, w = img.shape[:2]
    escala = lado / max(h, w)
    if escala < 1:
        img = cv2.resize(img, (int(w * escala), int(h * escala)), interpolation=cv2.INTER_AREA)
    return img


def _rostros(img):
    detector, _ = _cargar_modelos()
    h, w = img.shape[:2]
    detector.setInputSize((w, h))
    _, caras = detector.detect(img)
    if caras is None:
        return []
    return sorted(caras, key=lambda c: c[2] * c[3], reverse=True)


def _vector(img, cara):
    _, reconocedor = _cargar_modelos()
    return reconocedor.feature(reconocedor.alignCrop(img, cara))


def _similitud(a, b):
    _, reconocedor = _cargar_modelos()
    return float(reconocedor.match(a, b, cv2.FaceRecognizerSF_FR_COSINE))


def _jpeg(img, calidad=88):
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, calidad])
    return buf.tobytes() if ok else b""


def _recorte(img, cara, margen=0.35):
    h, w = img.shape[:2]
    x, y, ancho, alto = (int(v) for v in cara[:4])
    mx, my = int(ancho * margen), int(alto * margen)
    return img[max(0, y - my):min(h, y + alto + my), max(0, x - mx):min(w, x + ancho + mx)]


def _zona_foto(img):
    """Recorte del cuadro de la fotografía (mitad izquierda del documento), ampliado si es pequeño."""
    h, w = img.shape[:2]
    zona = img[:, : int(w * ZONA_FOTO)]
    if zona.shape[1] < LADO_ZONA_MIN:
        escala = LADO_ZONA_MIN / zona.shape[1]
        zona = cv2.resize(zona, None, fx=escala, fy=escala, interpolation=cv2.INTER_CUBIC)
    return zona


def rostro_documento(contenido):
    """Devuelve (vector, recorte_jpeg) del rostro de la fotografía del documento o None.

    Primero se analiza el cuadro de la fotografía (a la izquierda en la cédula, el pasaporte y
    la tarjeta de identidad), lo que evita confundirlo con la imagen fantasma pequeña del
    documento. Si ahí no hay rostro, se busca en toda la imagen y se toma el más grande.
    """
    _dependencias()
    img = _decodificar(contenido, LADO_DOCUMENTO)
    if img is None:
        return None
    with _candado:
        for fuente in (_zona_foto(img), img):
            caras = [c for c in _rostros(fuente) if c[14] >= 0.7]
            if caras:
                return _vector(fuente, caras[0]), _jpeg(_recorte(fuente, caras[0]))
    return None


def _calidad(img, cara):
    """Devuelve el código del problema de calidad o None si la imagen es utilizable."""
    h, w = img.shape[:2]
    x, y, ancho, alto = (int(v) for v in cara[:4])
    if ancho < 0.18 * w:
        return "rostro_pequeno"
    recorte = cv2.cvtColor(_recorte(img, cara, 0.1), cv2.COLOR_BGR2GRAY)
    if recorte.size == 0:
        return "sin_rostro"
    if not 45 <= float(recorte.mean()) <= 215:
        return "mala_iluminacion"
    if cv2.Laplacian(cv2.resize(recorte, (160, 160)), cv2.CV_64F).var() < 25:
        return "imagen_borrosa"
    return None


def _miniatura(img):
    return cv2.resize(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), (64, 48)).astype(np.float32)


def comparar(vector_documento, fotogramas):
    """Analiza los fotogramas de la selfie contra el vector del documento.

    Devuelve {"decision": aprobado|revision|rechazado|reintento, "motivo", "similitud", "selfie"}.
    """
    _dependencias()
    validos, problemas = [], []
    with _candado:
        for contenido in fotogramas:
            img = _decodificar(contenido, LADO_SELFIE)
            if img is None:
                problemas.append("sin_rostro")
                continue
            caras = _rostros(img)
            if not caras:
                problemas.append("sin_rostro")
                continue
            if len(caras) > 1 and caras[1][2] * caras[1][3] > 0.3 * caras[0][2] * caras[0][3]:
                problemas.append("varios_rostros")
                continue
            problema = _calidad(img, caras[0])
            if problema:
                problemas.append(problema)
                continue
            validos.append((img, _vector(img, caras[0])))

        if not validos:
            motivo = max(set(problemas), key=problemas.count) if problemas else "sin_rostro"
            return {"decision": "reintento", "motivo": motivo, "similitud": None, "selfie": None}

        similitudes = [_similitud(vector, vector_documento) for _, vector in validos]
        consistencia = min(
            (_similitud(a[1], b[1]) for i, a in enumerate(validos) for b in validos[i + 1:]),
            default=1.0,
        )

    mejor = int(np.argmax(similitudes))
    puntaje = float(np.mean(sorted(similitudes, reverse=True)[:2]))
    diferencia = max(
        (float(np.abs(_miniatura(a[0]) - _miniatura(b[0])).mean())
         for i, a in enumerate(validos) for b in validos[i + 1:]),
        default=0.0,
    )

    marcas = []
    if len(validos) < MIN_FOTOGRAMAS:
        marcas.append("pocos_fotogramas")
    if len(validos) > 1 and diferencia < 0.3:
        marcas.append("sin_variacion")
    if consistencia < settings.FACIAL_UMBRAL_REVISION:
        marcas.append("rostros_inconsistentes")

    if puntaje >= settings.FACIAL_UMBRAL_APROBADO and not marcas:
        decision, motivo = "aprobado", ""
    elif puntaje >= settings.FACIAL_UMBRAL_REVISION:
        decision, motivo = "revision", marcas[0] if marcas else "similitud_intermedia"
    else:
        decision, motivo = "rechazado", "no_coincide"
    return {
        "decision": decision,
        "motivo": motivo,
        "similitud": round(puntaje, 4),
        "selfie": _jpeg(validos[mejor][0]),
    }


# ─── Almacenamiento (carpeta validacionFacial del storage de Railway) ─────────

def _s3_configurado():
    return bool(settings.AWS_STORAGE_BUCKET_NAME and settings.AWS_S3_ENDPOINT_URL)


def _ruta_local(clave):
    return os.path.join(settings.BASE_DIR, "media", clave)


def _guardar(clave, contenido):
    if _s3_configurado():
        from storage_app.services import obtener_cliente_s3
        obtener_cliente_s3().put_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=clave, Body=contenido, ContentType="image/jpeg"
        )
        return
    ruta = _ruta_local(clave)
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    with open(ruta, "wb") as f:
        f.write(contenido)


def _borrar(clave):
    if _s3_configurado():
        from storage_app.services import eliminar_archivo
        eliminar_archivo(clave)
    elif os.path.exists(_ruta_local(clave)):
        os.remove(_ruta_local(clave))


def _url(clave):
    if _s3_configurado():
        from storage_app.services import generar_url_firmada
        return generar_url_firmada(clave, expiracion=300)
    ruta = _ruta_local(clave)
    if not os.path.exists(ruta):
        return None
    with open(ruta, "rb") as f:
        return "data:image/jpeg;base64," + base64.b64encode(f.read()).decode()


def _archivo(proceso, nombre, contenido, categoria):
    clave = f"{settings.FACIAL_CARPETA}/{proceso.id}/{nombre}-{uuid.uuid4().hex}.jpg"
    _guardar(clave, contenido)
    return Archivo.objects.create(
        usuario=None, nombre_original=f"{nombre}.jpg", storage_key=clave,
        content_type="image/jpeg", tamano=len(contenido), tipo="imagen", categoria=categoria,
    )


def _quitar_archivo(archivo):
    if archivo:
        _borrar(archivo.storage_key)
        archivo.delete()


def eliminar_imagenes(proceso):
    """Elimina del storage y de la base de datos las imágenes biométricas del proceso."""
    documento, selfie = proceso.foto_documento_facial, proceso.selfie_facial
    proceso.foto_documento_facial = proceso.selfie_facial = None
    proceso.save(update_fields=["foto_documento_facial", "selfie_facial"])
    _quitar_archivo(documento)
    _quitar_archivo(selfie)


def _guardar_imagenes(proceso, recorte_documento, selfie):
    anteriores = (proceso.foto_documento_facial, proceso.selfie_facial)
    proceso.foto_documento_facial = _archivo(proceso, "documento", recorte_documento, "validacion_facial_documento")
    proceso.selfie_facial = _archivo(proceso, "selfie", selfie, "validacion_facial_selfie")
    for viejo in anteriores:
        _quitar_archivo(viejo)


# ─── Reglas del proceso ──────────────────────────────────────────────────────

def facial_cumplida(proceso):
    """True si el registro puede continuar respecto a la verificación facial."""
    if not settings.FACIAL_OBLIGATORIA:
        return True
    return proceso.validacion_facial or proceso.estado_facial == Estado.ALTERNATIVA


def marcar_revision_posterior(proceso):
    """Si el sistema aprobó la identidad por sí solo, el administrador la confirma después.
    La persona usa la cuenta con normalidad mientras tanto."""
    if (proceso.validacion_facial and proceso.estado_facial == Estado.APROBADO
            and proceso.motivo_facial != "revision_manual" and proceso.selfie_facial_id):
        proceso.revision_posterior = "pendiente"


def _hash(desafio):
    return hashlib.sha256(desafio.encode()).hexdigest()


def _bloquear(proceso_id, tipo_registro):
    """Devuelve (proceso, error) con el proceso bloqueado para escritura."""
    from users.services import validarProcesoRegistro
    proceso = (
        ProcesoRegistroUsuario.objects.select_for_update()
        .select_related("documento", "foto_documento_facial", "selfie_facial")
        .filter(id=proceso_id).first()
    )
    error = validarProcesoRegistro(proceso, tipo_registro)
    if error:
        return None, error
    if not proceso.documento_verificado:
        return None, ({"documento": ["Primero debes verificar el documento"]}, 403)
    return proceso, None


def _contenido_documento(proceso):
    with default_storage.open(proceso.documento.storage_key, "rb") as f:
        return f.read()


def _estado(proceso, extra=None):
    return {
        "estado": proceso.estado_facial,
        "validacion_facial": proceso.validacion_facial,
        "motivo": proceso.motivo_facial,
        **(extra or {}),
    }


def _a_revision(proceso, motivo, similitud=None):
    """Pasa el caso a revisión manual. Se guarda de forma definitiva cuando deja su correo."""
    _fijar(proceso, Estado.REVISION, motivo, similitud)
    proceso.desafio_facial_hash = ""
    proceso.desafio_facial_expira_en = None


def _fijar_sin_rostro(proceso):
    if proceso.tipo_documento in TIPOS_SIN_FOTO:
        _fijar(proceso, Estado.ALTERNATIVA, "sin_foto_documento")
    else:
        logger.warning("Sin rostro detectable en el documento %s del proceso %s", proceso.tipo_documento, proceso.id)
        _a_revision(proceso, "rostro_documento_no_detectado")


def _fijar(proceso, estado, motivo="", similitud=None, validada=False):
    proceso.estado_facial = estado
    proceso.motivo_facial = motivo
    if similitud is not None:
        proceso.similitud_facial = similitud
    proceso.validacion_facial = validada
    proceso.validacion_facial_en = timezone.now() if validada else None


# ─── Servicios del registro ──────────────────────────────────────────────────

@transaction.atomic
def iniciarDesafioFacialService(proceso_id, consentimiento, tipo_registro="paciente"):
    proceso, error = _bloquear(proceso_id, tipo_registro)
    if error:
        return error
    if proceso.estado_facial in (Estado.APROBADO, Estado.ALTERNATIVA, Estado.REVISION):
        return _estado(proceso), 200
    if not consentimiento:
        return {"consentimiento": ["Debes aceptar el tratamiento de tu imagen para continuar"]}, 400
    if (proceso.intentos_facial >= settings.FACIAL_MAX_INTENTOS
            or proceso.capturas_facial >= settings.FACIAL_MAX_CAPTURAS):
        _a_revision(proceso, "intentos_agotados")
        proceso.save()
        return _estado(proceso), 200

    try:
        hay_rostro = rostro_documento(_contenido_documento(proceso)) is not None
    except FacialNoDisponible:
        return NO_DISPONIBLE, 503
    except Exception:
        logger.exception("Error leyendo la fotografía del documento")
        return {"general": ["No fue posible preparar la verificación facial"]}, 500

    ahora = timezone.now()
    proceso.consentimiento_facial_version = settings.FACIAL_CONSENTIMIENTO_VERSION
    proceso.consentimiento_facial_en = ahora
    if not hay_rostro:
        _fijar_sin_rostro(proceso)
        proceso.save()
        return _estado(proceso), 200

    desafio = secrets.token_urlsafe(32)
    proceso.desafio_facial_hash = _hash(desafio)
    proceso.desafio_facial_expira_en = ahora + timedelta(seconds=settings.FACIAL_DESAFIO_SEGUNDOS)
    proceso.save(update_fields=["desafio_facial_hash", "desafio_facial_expira_en",
                                "consentimiento_facial_version", "consentimiento_facial_en"])
    return _estado(proceso, {
        "desafio": desafio,
        "expira_en": proceso.desafio_facial_expira_en,
        "fotogramas_min": MIN_FOTOGRAMAS,
        "fotogramas_max": MAX_FOTOGRAMAS,
    }), 200


@transaction.atomic
def verificarRostroService(proceso_id, desafio, fotogramas, tipo_registro="paciente"):
    proceso, error = _bloquear(proceso_id, tipo_registro)
    if error:
        return error
    if proceso.estado_facial in (Estado.APROBADO, Estado.ALTERNATIVA):
        return _estado(proceso), 200
    if proceso.estado_facial in (Estado.REVISION, Estado.RECHAZADO):
        return {"facial": ["La verificación está en revisión"], **_estado(proceso)}, 409

    vigente = bool(
        proceso.desafio_facial_hash and proceso.desafio_facial_expira_en
        and proceso.desafio_facial_expira_en > timezone.now()
        and hmac.compare_digest(proceso.desafio_facial_hash, _hash(desafio))
    )
    # El desafío se consume en el primer uso, sea cual sea el resultado.
    proceso.desafio_facial_hash = ""
    proceso.desafio_facial_expira_en = None
    consumo = ["desafio_facial_hash", "desafio_facial_expira_en"]
    if not vigente:
        proceso.save(update_fields=consumo)
        return {"desafio": ["El desafío no es válido o expiró. Inicia la captura de nuevo"]}, 400

    if not MIN_FOTOGRAMAS <= len(fotogramas) <= MAX_FOTOGRAMAS:
        proceso.save(update_fields=consumo)
        return {"fotogramas": [f"Envía entre {MIN_FOTOGRAMAS} y {MAX_FOTOGRAMAS} fotogramas"]}, 400

    proceso.capturas_facial += 1
    try:
        documento = rostro_documento(_contenido_documento(proceso))
        contenidos = [f.read() for f in fotogramas]
        if any(len(c) > MAX_BYTES_FOTOGRAMA for c in contenidos):
            raise ValueError("fotograma demasiado grande")
        resultado = comparar(documento[0], contenidos) if documento else None
    except FacialNoDisponible:
        # No se consume el desafío ni la captura: la transacción se revierte sin guardar.
        return NO_DISPONIBLE, 503
    except ValueError:
        proceso.save(update_fields=consumo + ["capturas_facial"])
        return {"fotogramas": ["Los fotogramas superan el tamaño permitido"]}, 400
    except Exception:
        logger.exception("Error en la verificación facial")
        proceso.save(update_fields=consumo + ["capturas_facial"])
        return {"general": ["No fue posible procesar la imagen. Inténtalo de nuevo"]}, 500

    def restantes():
        return max(0, settings.FACIAL_MAX_INTENTOS - proceso.intentos_facial)

    if resultado is None:
        _fijar_sin_rostro(proceso)
        proceso.save()
        return _estado(proceso), 200

    if resultado["decision"] == "reintento":
        # Mala calidad de imagen: se repite sin gastar uno de los intentos de comparación.
        if proceso.capturas_facial >= settings.FACIAL_MAX_CAPTURAS:
            _a_revision(proceso, "intentos_agotados")
            proceso.save()
            return _estado(proceso), 200
        proceso.save(update_fields=consumo + ["capturas_facial"])
        return {
            "facial": [MENSAJES[resultado["motivo"]]],
            "codigo": resultado["motivo"],
            "reintentar": True,
            "intentos_restantes": restantes(),
        }, 400

    proceso.intentos_facial += 1
    _guardar_imagenes(proceso, documento[1], resultado["selfie"])
    if resultado["decision"] == "aprobado":
        _fijar(proceso, Estado.APROBADO, "", resultado["similitud"], validada=True)
        proceso.save()
        return _estado(proceso), 200

    if proceso.intentos_facial >= settings.FACIAL_MAX_INTENTOS:
        _a_revision(proceso, "intentos_agotados", resultado["similitud"])
        proceso.save()
        return _estado(proceso), 200

    codigo = "no_coincide" if resultado["decision"] == "rechazado" else "similitud_baja"
    _fijar(proceso, Estado.PENDIENTE, codigo, resultado["similitud"])
    proceso.save()
    return {
        "facial": [MENSAJES[codigo]],
        "codigo": codigo,
        "reintentar": True,
        "intentos_restantes": restantes(),
    }, 400


@transaction.atomic
def omitirValidacionFacialService(proceso_id, motivo, tipo_registro="paciente"):
    proceso, error = _bloquear(proceso_id, tipo_registro)
    if error:
        return error
    if proceso.estado_facial in (Estado.APROBADO, Estado.ALTERNATIVA, Estado.REVISION):
        return _estado(proceso), 200

    if motivo == "sin_foto_documento":
        try:
            if rostro_documento(_contenido_documento(proceso)) is not None:
                return {"motivo": ["Tu documento tiene fotografía; debes completar la verificación"]}, 400
        except FacialNoDisponible:
            return NO_DISPONIBLE, 503
        except Exception:
            logger.exception("Error leyendo la fotografía del documento")
            return {"general": ["No fue posible validar el documento"]}, 500
        _fijar_sin_rostro(proceso)
    elif motivo in MOTIVOS_OMISION:
        _a_revision(proceso, motivo)
    else:
        return {"motivo": ["Motivo no válido"]}, 400

    proceso.desafio_facial_hash = ""
    proceso.desafio_facial_expira_en = None
    proceso.save()
    return _estado(proceso), 200


@transaction.atomic
def registrarCorreoContactoFacialService(proceso_id, correo, tipo_registro="paciente"):
    """Correo temporal al que se avisa el resultado de la revisión manual."""
    proceso, error = _bloquear(proceso_id, tipo_registro)
    if error:
        return error
    if proceso.estado_facial != Estado.REVISION:
        return {"general": ["La verificación no está en revisión manual"]}, 409
    correo = (correo or "").strip().lower()
    try:
        validate_email(correo)
    except ValidationError:
        return {"correo": ["Ingresa un correo válido"]}, 400
    proceso.correo_contacto_facial = correo
    # Con el correo registrado el proceso queda guardado a la espera del administrador.
    limite = timezone.now() + timedelta(days=settings.FACIAL_REVISION_DIAS)
    proceso.expira_en = max(proceso.expira_en, limite)
    proceso.save(update_fields=["correo_contacto_facial", "expira_en"])
    return _estado(proceso, {"correo_contacto": correo}), 200


def reanudarRegistroFacialService(proceso_id, token, tipo_registro="paciente"):
    """Valida el enlace del correo y devuelve lo necesario para continuar en el paso siguiente."""
    from users.services import validarProcesoRegistro
    proceso = ProcesoRegistroUsuario.objects.filter(id=proceso_id).first()
    error = validarProcesoRegistro(proceso, tipo_registro)
    if error:
        return error
    valido = bool(
        proceso.token_reanudacion_hash and proceso.token_reanudacion_expira_en
        and proceso.token_reanudacion_expira_en > timezone.now()
        and hmac.compare_digest(proceso.token_reanudacion_hash, _hash(token or ""))
    )
    if not valido or not proceso.documento_verificado or not facial_cumplida(proceso):
        return {"general": ["El enlace no es válido o ya expiró"]}, 400
    return {
        "proceso_id": str(proceso.id),
        "nombre": proceso.nombre_declarado,
        "apellido": proceso.apellido_declarado,
        "tipo_documento": proceso.tipo_documento,
        "numero_documento": proceso.numero_documento_declarado,
        "fecha_nacimiento": proceso.fecha_nacimiento_declarada,
        "documento_verificado": True,
        **_estado(proceso),
    }, 200


def estadoFacialService(proceso_id, tipo_registro="paciente"):
    from users.services import validarProcesoRegistro
    proceso = ProcesoRegistroUsuario.objects.filter(id=proceso_id).first()
    if proceso and proceso.tipo_registro == tipo_registro and proceso.estado_facial == Estado.RECHAZADO:
        return _estado(proceso, {"obligatoria": settings.FACIAL_OBLIGATORIA}), 200
    error = validarProcesoRegistro(proceso, tipo_registro)
    if error:
        return error
    return _estado(proceso, {"obligatoria": settings.FACIAL_OBLIGATORIA}), 200


# ─── Revisión manual (administrador) ─────────────────────────────────────────

ESTADOS_REVISION = (Estado.REVISION, Estado.APROBADO, Estado.RECHAZADO, Estado.ALTERNATIVA)


def _datos_documento(archivo, lado=1100):
    """Imagen del documento reducida y como data URI, sin exponer la URL del almacenamiento."""
    if not archivo:
        return None
    try:
        from PIL import Image
        import io
        with default_storage.open(archivo.storage_key, "rb") as f:
            img = Image.open(f).convert("RGB")
        img.thumbnail((lado, lado))
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=82)
        return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
    except Exception:
        logger.exception("No se pudo leer la imagen del documento %s", archivo.pk)
        return None


def listarRevisionesFacialesService(estado=Estado.REVISION):
    from django.db.models import Count
    if estado not in ESTADOS_REVISION and estado != "posterior":
        estado = Estado.REVISION
    if estado == "posterior":
        procesos = ProcesoRegistroUsuario.objects.filter(revision_posterior="pendiente")
    else:
        procesos = ProcesoRegistroUsuario.objects.filter(estado_facial=estado)
    if estado == Estado.REVISION:
        procesos = procesos.exclude(estado__in=[
            ProcesoRegistroUsuario.Estado.BLOQUEADO, ProcesoRegistroUsuario.Estado.EXPIRADO,
            ProcesoRegistroUsuario.Estado.COMPLETADO,
        ])
    conteos = {e: 0 for e in ESTADOS_REVISION}
    conteos.update({
        f["estado_facial"]: f["n"]
        for f in ProcesoRegistroUsuario.objects.filter(estado_facial__in=ESTADOS_REVISION)
        .values("estado_facial").annotate(n=Count("id"))
    })
    conteos["posterior"] = ProcesoRegistroUsuario.objects.filter(revision_posterior="pendiente").count()
    return {
        "resultados": [{
            "proceso_id": str(p.id), "tipo_registro": p.tipo_registro,
            "nombre": p.nombre_declarado, "apellido": p.apellido_declarado,
            "tipo_documento": p.tipo_documento, "cedula": p.numero_documento_declarado,
            "estado_facial": p.estado_facial, "motivo": p.motivo_facial,
            "similitud": p.similitud_facial, "intentos": p.intentos_facial,
            "correo": p.correo if estado == "posterior" else p.correo_contacto_facial,
            "revision_posterior": p.revision_posterior, "fecha": p.completado_en or p.actualizado_en,
        } for p in procesos.order_by("-actualizado_en")[:200]],
        "conteos": conteos,
    }, 200


def detalleRevisionFacialService(proceso_id, revisor=None):
    p = ProcesoRegistroUsuario.objects.select_related(
        "foto_documento_facial", "selfie_facial", "documento", "documento_reverso", "usuario", "medico"
    ).filter(id=proceso_id, estado_facial__in=ESTADOS_REVISION).first()
    if not p:
        return {"general": ["Revisión no encontrada"]}, 404
    logger.info("Revisión facial del proceso %s consultada por %s", p.id, revisor)
    return {
        "proceso_id": str(p.id), "tipo_registro": p.tipo_registro,
        "nombre": p.nombre_declarado, "apellido": p.apellido_declarado,
        "tipo_documento": p.tipo_documento, "cedula": p.numero_documento_declarado,
        "correo": p.correo_contacto_facial, "correo_cuenta": p.correo, "telefono": p.telefono,
        "fecha_nacimiento": p.fecha_nacimiento_verificada or p.fecha_nacimiento_declarada,
        "registrado_en": p.completado_en, "revision_posterior": p.revision_posterior,
        "acceso_bloqueado": bool((p.medico if p.tipo_registro == "medico" else p.usuario) and
                                 (p.medico if p.tipo_registro == "medico" else p.usuario).acceso_bloqueado),
        "correo_enviado": p.correo_facial_enviado,
        "estado_facial": p.estado_facial, "motivo": p.motivo_facial,
        "similitud": p.similitud_facial, "intentos": p.intentos_facial,
        "consentimiento_en": p.consentimiento_facial_en, "fecha": p.actualizado_en,
        "documento_frente": _datos_documento(p.documento),
        "documento_reverso": _datos_documento(p.documento_reverso),
        "imagen_documento": _url(p.foto_documento_facial.storage_key) if p.foto_documento_facial else None,
        "imagen_selfie": _url(p.selfie_facial.storage_key) if p.selfie_facial else None,
    }, 200


def _enviar_correo_resultado(proceso, aprobada, token=None):
    """Avisa al correo de contacto. Devuelve True si el proveedor aceptó el envío."""
    import resend
    from django.template.loader import render_to_string
    frontend = os.getenv("FRONTEND_URL", "").rstrip("/")
    enlace = (f"{frontend}/register?role={proceso.tipo_registro}"
              f"&reanudar={proceso.id}&token={token}") if aprobada and token else ""
    html = render_to_string("emails/verificacion_facial.html", {
        "nombre": proceso.nombre_declarado, "aprobada": aprobada, "enlace": enlace,
        "dias": settings.FACIAL_REVISION_DIAS,
    })
    try:
        resend.Emails.send({
            "from": os.getenv("RESEND_FROM_EMAIL"),
            "to": [proceso.correo_contacto_facial],
            "subject": ("Tu identidad fue verificada - DocSmart" if aprobada
                        else "Actualización sobre tu verificación - DocSmart"),
            "html": html,
        })
        return True
    except Exception:
        logger.exception("No se pudo enviar el correo de la verificación del proceso %s", proceso.id)
        return False


def resolverRevisionFacialService(proceso_id, decision, revisor):
    token = None
    with transaction.atomic():
        p = (ProcesoRegistroUsuario.objects.select_for_update()
             .select_related("foto_documento_facial", "selfie_facial")
             .filter(id=proceso_id, estado_facial=Estado.REVISION).first())
        if not p:
            return {"general": ["Revisión no encontrada"]}, 404
        aprobar = decision == "aprobar"
        if aprobar and not p.correo_contacto_facial:
            return {"general": ["La persona aún no registró un correo de contacto para avisarle el resultado"]}, 409
        p.revisado_facial_por = str(revisor)[:150]
        p.revisado_facial_en = timezone.now()
        if aprobar:
            if p.selfie_facial_id:
                _fijar(p, Estado.APROBADO, "revision_manual", validada=True)
            else:
                _fijar(p, Estado.ALTERNATIVA, p.motivo_facial)
            # El usuario tiene tiempo para terminar su registro con el enlace del correo.
            token = secrets.token_urlsafe(32)
            limite = timezone.now() + timedelta(days=settings.FACIAL_REVISION_DIAS)
            p.token_reanudacion_hash = _hash(token)
            p.token_reanudacion_expira_en = limite
            p.expira_en = max(p.expira_en, limite)
        else:
            _fijar(p, Estado.RECHAZADO, "revision_manual")
            p.estado = ProcesoRegistroUsuario.Estado.BLOQUEADO
        p.save()
    logger.info("Revisión facial %s del proceso %s por %s", decision, p.id, revisor)
    enviado = _enviar_correo_resultado(p, aprobar, token) if p.correo_contacto_facial else False
    if enviado != p.correo_facial_enviado:
        ProcesoRegistroUsuario.objects.filter(pk=p.pk).update(correo_facial_enviado=enviado)
    return _estado(p, {"correo_enviado": enviado}), 200


@transaction.atomic
def cancelarRegistroEnRevisionService(datos, tipo_registro="paciente"):
    """Cancela un registro en espera de revisión. Exige los mismos datos con que se inició."""
    from users.registros_abandonados import eliminar_proceso, proceso_en_revision
    numero = datos["numero_documento"].strip().upper()
    proceso = proceso_en_revision(tipo_registro, datos["tipo_documento"], numero)
    coincide = bool(
        proceso
        and proceso.nombre_declarado.strip().lower() == datos["nombre"].strip().lower()
        and proceso.apellido_declarado.strip().lower() == datos["apellido"].strip().lower()
        and proceso.fecha_nacimiento_declarada == datos["fecha_nacimiento"]
    )
    if not coincide:
        return {"general": ["No encontramos un registro en revisión con esos datos"]}, 404
    logger.info("Registro %s cancelado por la persona mientras estaba en revisión", proceso.id)
    eliminar_proceso(proceso)
    return {"cancelado": True}, 200


def _enviar_correo_bloqueo(proceso, cuenta, motivo):
    import resend
    from django.template.loader import render_to_string
    destino = proceso.correo or getattr(cuenta, "correo", "")
    if not destino:
        return False
    html = render_to_string("emails/acceso_bloqueado.html", {
        "nombre": proceso.nombre_declarado, "motivo": motivo,
    })
    try:
        resend.Emails.send({
            "from": os.getenv("RESEND_FROM_EMAIL"),
            "to": [destino],
            "subject": "Tu acceso a DocSmart fue bloqueado",
            "html": html,
        })
        return True
    except Exception:
        logger.exception("No se pudo enviar el correo de bloqueo del proceso %s", proceso.id)
        return False


def resolverRevisionPosteriorService(proceso_id, decision, motivo, revisor):
    """Confirma (legitimo) o bloquea el acceso de quien el sistema aprobó automáticamente."""
    motivo = (motivo or "").strip()
    cuenta = None
    with transaction.atomic():
        p = (ProcesoRegistroUsuario.objects.select_for_update()
             .select_related("usuario", "medico")
             .filter(id=proceso_id, revision_posterior="pendiente").first())
        if not p:
            return {"general": ["Revisión no encontrada o ya resuelta"]}, 404
        bloquear = decision == "bloquear"
        if bloquear:
            if len(motivo) < 5:
                return {"motivo": ["Escribe el motivo del bloqueo (mínimo 5 caracteres)"]}, 400
            cuenta = p.medico if p.tipo_registro == "medico" else p.usuario
            if not cuenta:
                return {"general": ["No se encontró la cuenta creada con este registro"]}, 409
            cuenta.acceso_bloqueado = True
            cuenta.motivo_bloqueo = motivo
            cuenta.bloqueado_en = timezone.now()
            cuenta.save(update_fields=["acceso_bloqueado", "motivo_bloqueo", "bloqueado_en"])
            p.revision_posterior = "bloqueado"
        else:
            p.revision_posterior = "legitimo"
        p.revisado_facial_por = str(revisor)[:150]
        p.revisado_facial_en = timezone.now()
        p.save(update_fields=["revision_posterior", "revisado_facial_por", "revisado_facial_en"])
    logger.info("Revisión posterior %s del proceso %s por %s", decision, p.id, revisor)
    enviado = _enviar_correo_bloqueo(p, cuenta, motivo) if bloquear else None
    return {"revision_posterior": p.revision_posterior, "correo_enviado": enviado}, 200
