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
import math
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
MAX_FOTOGRAMAS = 6
MAX_BYTES_FOTOGRAMA = 3 * 1024 * 1024
MAX_BYTES_PREVIEW = 600 * 1024  # la guía en vivo envía fotogramas reducidos
MAX_HUELLAS = 32  # huellas SHA-256 de los últimos fotogramas; no se guarda ninguna imagen

# Solo estos documentos no traen fotografía. En los demás, no detectar el rostro nunca
# habilita una alternativa automática: pasa a revisión manual.
TIPOS_SIN_FOTO = {"RC"}

MOTIVOS_OMISION = {"camara_no_disponible", "accesibilidad", "sin_consentimiento"}

MENSAJES = {
    "sin_rostro": "No detectamos tu rostro. Ubícate de frente y con buena luz.",
    "varios_rostros": "Se detectó más de un rostro. Debes aparecer solo frente a la cámara.",
    "rostro_cortado": "Tu rostro queda cortado en el borde. Céntralo dentro de la imagen.",
    "rostro_pequeno": "Acércate un poco más a la cámara.",
    "rostro_grande": "Estás muy cerca. Aléjate un poco de la cámara.",
    "rostro_a_la_izquierda": "Tu rostro está desplazado. Céntralo dentro del óvalo.",
    "rostro_a_la_derecha": "Tu rostro está desplazado. Céntralo dentro del óvalo.",
    "rostro_arriba": "Tu rostro está muy arriba. Céntralo dentro del óvalo.",
    "rostro_abajo": "Tu rostro está muy abajo. Céntralo dentro del óvalo.",
    "inclinado": "Mantén la cabeza recta, sin inclinarla hacia un lado.",
    "no_frontal": "Mira de frente a la cámara, sin girar la cabeza.",
    "cabeza_levantada": "Baja un poco la barbilla y mira de frente.",
    "cabeza_baja": "Levanta un poco la barbilla y mira de frente.",
    "luz_baja": "Hay poca luz. Busca un lugar más iluminado, con la luz frente a ti.",
    "luz_excesiva": "Hay demasiada luz o brillo. Evita luces directas o ventanas detrás de ti.",
    "luz_desigual": "La luz cae solo de un lado. Busca una luz suave y uniforme de frente.",
    "mala_iluminacion": "La iluminación no es adecuada. Busca un lugar con luz uniforme.",
    "imagen_borrosa": "La imagen salió borrosa. Mantén el dispositivo firme e inténtalo de nuevo.",
    "posible_oclusion": "Parte de tu rostro parece cubierta. Quita gafas oscuras, mascarilla o gorra.",
    "sin_movimiento": "Mueve ligeramente la cabeza mientras se toma la captura, para comprobar que eres tú en vivo.",
    "pocos_fotogramas": "No logramos capturar suficientes imágenes claras. Inténtalo de nuevo con buena luz.",
    "alineacion_dudosa": "No logramos ubicar bien tus rasgos. Mira de frente, con el rostro completo visible y sin nada que lo cubra.",
    "no_coincide": "El rostro no coincide con la fotografía del documento.",
    "similitud_baja": "No pudimos confirmar tu identidad. Mira de frente, con buena luz y sin accesorios que cubran tu rostro.",
}

# Umbrales de calidad de la captura. Se calibraron midiendo caras frontales de un conjunto público de
# pruebas: inclinación hasta ±15°, giro lateral hasta 0,14, relación nariz/boca entre 0,49 y 0,67 y
# nitidez desde 87. Los límites están al doble del máximo medido para no rechazar capturas normales, y la
# nitidez en un valor que separa esas caras de las mismas imágenes con desenfoque medio (mediana 14).
CALIDAD = {
    "ancho_min": 0.18,        # ancho del rostro / ancho del fotograma
    "ancho_max": 0.80,
    "margen_borde": 0.05,     # parte del rostro que puede salir del fotograma
    "descentrado_x": 0.20,    # desvío del centro, en fracción del ancho / alto del fotograma
    "descentrado_y": 0.22,
    "roll_max": 20.0,         # grados de inclinación de la línea de los ojos
    "yaw_max": 0.28,          # desplazamiento de la nariz respecto al punto medio de los ojos / distancia entre ojos
    "pitch_min": 0.40,        # posición vertical de la nariz entre los ojos y la boca
    "pitch_max": 0.80,
    "brillo_min": 55,
    "brillo_max": 210,
    "luz_desigual_max": 0.65,  # diferencia entre mitades del rostro / brillo medio
    "nitidez_min": 12,        # varianza del laplaciano del rostro normalizado a 160 px (la guía avisa por debajo)
    "confianza_min": 0.80,    # confianza del detector: por debajo suele haber oclusión o rostro parcial
    "ojos_oscuros": 0.45,     # brillo de los ojos / brillo del rostro (gafas oscuras)
    # Con la malla de puntos reales (medidos en 57 rostros públicos: giro -0,18..0,14, relación nariz/mentón
    # 0,26..0,43, desacuerdo con el detector hasta 0,27).
    "presencia_malla_min": 0.5,  # probabilidad del modelo de malla de que el recorte contiene un rostro
    "coherencia_max": 0.35,   # desacuerdo máximo entre la malla y los 5 puntos del detector / distancia entre ojos
    "roll_malla_max": 25.0,   # con la malla se mide la línea de los ojos con 8 puntos; la alineación corrige el giro
    "yaw_malla_max": 0.25,    # giro lateral: la nariz respecto al centro entre los bordes de la cara (0 = de frente)
    "pitch_malla_min": 0.20,  # distancia nariz-ojos / ojos-mentón
    "pitch_malla_max": 0.50,
    "fuera_contorno_max": 2,  # puntos del contorno que pueden quedar fuera de la imagen
    "region_oscura": (50, 12),  # (media, desviación) por debajo de las cuales una región está tapada
    "region_uniforme": 0.08,  # desviación / media de nariz y boca por debajo de la cual parece cubierta (mascarilla)
}
# Límites que de verdad impiden comparar. La guía en vivo pide la calidad ideal (CALIDAD); pero una captura que la
# incumple sin pasar estos límites sí se compara, porque el embedding tolera esas diferencias. Si el parecido no
# alcanza para aprobar, esa captura se repite en lugar de tomarse como otra persona.
CALIDAD_BLOQUEO = {
    **CALIDAD,
    "ancho_min": 0.12, "ancho_max": 0.92, "margen_borde": 0.15, "descentrado_x": 0.35, "descentrado_y": 0.35,
    "roll_max": 30.0, "roll_malla_max": 35.0, "yaw_max": 0.40, "yaw_malla_max": 0.33,
    "pitch_min": 0.30, "pitch_max": 0.90, "pitch_malla_min": 0.12, "pitch_malla_max": 0.60,
    "brillo_min": 35, "brillo_max": 235, "luz_desigual_max": 1.2, "nitidez_min": 5, "confianza_min": 0.65,
    "coherencia_max": 0.45, "fuera_contorno_max": 5,
}
# El documento trae una foto pequeña y frontal por norma: se tolera más antes de pedir una revisión.
CALIDAD_DOCUMENTO = {
    "ancho_min_px": 40, "nitidez_min": 4,
    "roll_max": 30.0, "yaw_malla_max": 0.32, "coherencia_max": 0.45,
    "fuera_contorno_max": 7,  # el recorte de la foto puede cortar el contorno; los rasgos interiores no
}
PROBLEMAS_DETECCION = {"sin_rostro", "varios_rostros"}
PROBLEMAS_ALINEACION = {
    "rostro_cortado", "rostro_pequeno", "rostro_grande", "rostro_a_la_izquierda", "rostro_a_la_derecha",
    "rostro_arriba", "rostro_abajo", "inclinado", "no_frontal", "cabeza_levantada", "cabeza_baja", "alineacion_dudosa",
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
    # La malla se guarda en el mismo diccionario y puede cargarse antes que estos dos modelos.
    if "detector" not in _modelos:
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


def _unitario(v):
    v = np.asarray(v, np.float32).ravel()
    norma = float(np.linalg.norm(v))
    return v / norma if norma else v


def _similitud(a, b):
    """Similitud coseno entre dos embeddings (la misma que calcula `FaceRecognizerSF.match`)."""
    return float(np.dot(_unitario(a), _unitario(b)))


def _fila_espejo(cara, ancho):
    """La detección de la imagen volteada: mismo rostro, con los puntos izquierdo y derecho intercambiados."""
    (rx, ry), (lx, ly), (nx, ny), (rmx, rmy), (lmx, lmy) = _puntos(cara)
    espejo = cara.copy()
    espejo[0] = ancho - float(cara[0]) - float(cara[2])
    for i, (px, py) in enumerate([(ancho - lx, ly), (ancho - rx, ry), (ancho - nx, ny), (ancho - lmx, lmy), (ancho - rmx, rmy)]):
        espejo[4 + 2 * i], espejo[5 + 2 * i] = px, py
    return espejo


def _fila_con_puntos(cara, puntos):
    fila = cara.copy()
    for i, (px, py) in enumerate(puntos):
        fila[4 + 2 * i], fila[5 + 2 * i] = float(px), float(py)
    return fila


def _embedding(img, cara, malla=None):
    """Vector unitario del rostro: promedio de varias lecturas del MISMO rostro.

    Cada lectura alinea la imagen original una sola vez (nunca se alinea una imagen ya alineada) con los 5 puntos
    que espera SFace: los del detector y, si la malla coincide con ellos, los de la malla; y cada una también en
    espejo. Promediar lecturas reduce el ruido de un solo detector y de un solo recorte, sin tocar los umbrales.
    """
    lecturas = [cara]
    if malla is not None and malla.coherencia <= CALIDAD["coherencia_max"]:
        ojo_d = malla.grupo("ojo_derecho")[0].mean(axis=0)
        ojo_i = malla.grupo("ojo_izquierdo")[0].mean(axis=0)
        boca = malla.grupo("boca")[0]
        lecturas.append(_fila_con_puntos(cara, [ojo_d, ojo_i, malla.grupo("nariz")[0][1], boca[0], boca[2]]))
    vectores, espejada = [], None
    for lectura in lecturas:
        vectores.append(_unitario(_vector(img, lectura)))
        if espejada is None:
            espejada = cv2.flip(img, 1)
        vectores.append(_unitario(_vector(espejada, _fila_espejo(lectura, img.shape[1]))))
    return _unitario(np.mean(vectores, axis=0))


def _jpeg(img, calidad=88):
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, calidad])
    return buf.tobytes() if ok else b""


def _recorte(img, cara, margen=0.35):
    h, w = img.shape[:2]
    x, y, ancho, alto = (int(v) for v in cara[:4])
    mx, my = int(ancho * margen), int(alto * margen)
    return img[max(0, y - my):min(h, y + alto + my), max(0, x - mx):min(w, x + ancho + mx)]


class RostroDocumento(tuple):
    """(vector, recorte_jpeg) del rostro del documento, con los datos reales de la detección."""

    def __new__(cls, vector, recorte, **datos):
        obj = super().__new__(cls, (vector, recorte))
        obj.__dict__.update(datos)
        return obj


def _puntos(cara):
    """Ojo derecho, ojo izquierdo, nariz y comisuras de la boca, tal como los entrega el detector."""
    return [(float(cara[i]), float(cara[i + 1])) for i in range(4, 14, 2)]


def pose_aproximada(cara):
    """Inclinación (grados), giro lateral y cabeceo, estimados con los 5 puntos del detector.

    Son proporciones geométricas: sirven para pedir una captura más frontal, no para medir ángulos exactos.
    """
    (rx, ry), (lx, ly), (nx, ny), (rmx, rmy), (lmx, lmy) = _puntos(cara)
    distancia = math.hypot(lx - rx, ly - ry) or 1e-6
    roll = math.degrees(math.atan2(ly - ry, lx - rx))
    mx, my = (rx + lx) / 2, (ry + ly) / 2
    yaw = (nx - mx) / distancia
    pitch = (ny - my) / max(1e-6, (rmy + lmy) / 2 - my)
    return roll, yaw, pitch


def _recorte_con_origen(img, cara, margen=0.35):
    h, w = img.shape[:2]
    x, y, ancho, alto = (int(v) for v in cara[:4])
    mx, my = int(ancho * margen), int(alto * margen)
    x0, y0 = max(0, x - mx), max(0, y - my)
    return img[y0:min(h, y + alto + my), x0:min(w, x + ancho + mx)], x0, y0


def _ojos_oscuros(gris, cara):
    """True si la zona de los ojos es mucho más oscura que el resto del rostro (gafas oscuras)."""
    h, w = gris.shape[:2]
    (rx, ry), (lx, ly) = _puntos(cara)[:2]
    lado = max(4, int(math.hypot(lx - rx, ly - ry) * 0.35))
    medias = []
    for x, y in ((rx, ry), (lx, ly)):
        zona = gris[max(0, int(y) - lado):min(h, int(y) + lado), max(0, int(x) - lado):min(w, int(x) + lado)]
        if zona.size:
            medias.append(float(zona.mean()))
    x, y, ancho, alto = (int(v) for v in cara[:4])
    rostro = gris[max(0, y):min(h, y + alto), max(0, x):min(w, x + ancho)]
    if not medias or not rostro.size:
        return False
    ojos = sum(medias) / len(medias)
    return ojos < 55 and ojos < CALIDAD["ojos_oscuros"] * float(rostro.mean())


# ─── Malla facial: puntos de referencia reales ───────────────────────────────

# Modelo: MediaPipe Face Mesh V2 (478 puntos, Apache 2.0) convertido a ONNX; se ejecuta con cv2.dnn. Solo ubica
# puntos del rostro: no identifica personas ni verifica que el documento sea auténtico. De los 478 puntos se usan
# 32 estables (esquinas y puntos medios de ojos, cejas, nariz, boca y contorno), en el orden en que se dibujan.
PUNTOS_MALLA = {
    "ojo_derecho": (33, 159, 133, 145),
    "ojo_izquierdo": (362, 386, 263, 374),
    "ceja_derecha": (70, 105, 107),
    "ceja_izquierda": (336, 334, 300),
    "nariz": (168, 1, 2, 98, 327),
    "boca": (61, 0, 291, 17, 13, 14),
    "contorno": (234, 132, 172, 152, 397, 361, 454),
}
INDICES_MALLA = tuple(i for grupo in PUNTOS_MALLA.values() for i in grupo)
MALLA_ESCALA = 1.5  # el modelo espera el rostro con margen dentro de un recorte cuadrado de 256 px
MALLA_LADO = 256


def _grupos_malla():
    """Rangos [inicio, fin) de cada grupo dentro de la lista de puntos que se entrega al cliente."""
    rangos, inicio = {}, 0
    for nombre, indices in PUNTOS_MALLA.items():
        rangos[nombre] = [inicio, inicio + len(indices)]
        inicio += len(indices)
    return rangos


def _cargar_malla():
    """Red de la malla, o None si falta el archivo (entonces solo se usan los 5 puntos del detector)."""
    if "malla" not in _modelos:
        try:
            _modelos["malla"] = cv2.dnn.readNetFromONNX(os.path.join(MODELOS, "face_landmarks.onnx"))
        except Exception:
            logger.warning("No se pudo cargar el modelo de malla facial; se usarán solo los 5 puntos del detector")
            _modelos["malla"] = None
    return _modelos["malla"]


class Malla:
    """Puntos reales de una detección, medidos en la imagen original, y lo que se deduce de ellos."""

    def __init__(self, puntos, z, presencia, roll, yaw, pitch, coherencia, fuera, ancho_ojos):
        self.puntos = puntos            # (32, 2), orden de PUNTOS_MALLA
        self.z = z                      # profundidad relativa de los 32 puntos
        self.presencia = presencia      # probabilidad que da el modelo de que el recorte contiene un rostro
        self.roll = roll                # grados: inclinación de la línea de los ojos
        self.yaw = yaw                  # 0 = frontal; desplazamiento de la nariz entre los bordes de la cara (-0,5..0,5)
        self.pitch = pitch              # distancia nariz-ojos / ojos-mentón
        self.coherencia = coherencia    # mayor desacuerdo con los 5 puntos del detector / distancia entre ojos
        self.fuera = fuera              # por punto: True si queda fuera de la imagen
        self.ancho_ojos = ancho_ojos    # distancia entre los centros de los ojos, en píxeles

    def grupo(self, nombre):
        inicio, fin = _grupos_malla()[nombre]
        return self.puntos[inicio:fin], self.fuera[inicio:fin]


def _malla_facial(img, cara):
    """Calcula la malla del rostro detectado. Debe llamarse con el candado de los modelos tomado.

    El recorte nivelado solo alimenta a este modelo: los puntos se devuelven a las coordenadas de la imagen
    original y la alineación para el embedding la sigue haciendo una única vez `alignCrop` con los 5 puntos
    del detector.
    """
    red = _cargar_malla()
    if red is None:
        return None
    (rx, ry), (lx, ly) = _puntos(cara)[:2]
    x, y, w, h = (float(v) for v in cara[:4])
    cx, cy = x + w / 2, y + h / 2
    giro = math.degrees(math.atan2(ly - ry, lx - rx))
    m = cv2.getRotationMatrix2D((cx, cy), giro, MALLA_LADO / (max(w, h) * MALLA_ESCALA))
    m[0, 2] += MALLA_LADO / 2 - cx
    m[1, 2] += MALLA_LADO / 2 - cy
    recorte = cv2.warpAffine(img, m, (MALLA_LADO, MALLA_LADO), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0))
    red.setInput(cv2.cvtColor(recorte, cv2.COLOR_BGR2RGB).astype(np.float32)[None] / 255.0)
    salidas = red.forward(red.getUnconnectedOutLayersNames())
    puntos3d = salidas[0].reshape(-1, 3)
    if puntos3d.shape[0] != 478:
        return None
    logit = float(np.clip(salidas[1].ravel()[0], -30, 30))
    presencia = 1 / (1 + math.exp(-logit))
    inv = cv2.invertAffineTransform(m)
    xy = puntos3d[:, :2] @ inv[:, :2].T + inv[:, 2]
    z = puntos3d[:, 2] * float(math.hypot(inv[0, 0], inv[1, 0]))

    ojo_d = xy[list(PUNTOS_MALLA["ojo_derecho"])].mean(axis=0)
    ojo_i = xy[list(PUNTOS_MALLA["ojo_izquierdo"])].mean(axis=0)
    dx, dy = ojo_i - ojo_d
    ancho_ojos = float(math.hypot(dx, dy)) or 1e-6
    roll = math.degrees(math.atan2(dy, dx))
    medio = (ojo_d + ojo_i) / 2
    c, s = math.cos(math.radians(-roll)), math.sin(math.radians(-roll))

    def nivelar(p):
        q = p - medio
        return c * q[0] - s * q[1], s * q[0] + c * q[1]

    nariz, borde_d, borde_i, menton = nivelar(xy[1]), nivelar(xy[234]), nivelar(xy[454]), nivelar(xy[152])
    ancho_cara = (borde_i[0] - borde_d[0]) or 1e-6
    yaw = (nariz[0] - borde_d[0]) / ancho_cara - 0.5
    pitch = nariz[1] / (menton[1] or 1e-6)

    referencia = np.array(_puntos(cara))
    propios = np.array([ojo_d, ojo_i, xy[1], xy[61], xy[291]])
    coherencia = float(np.max(np.hypot(*(propios - referencia).T)) / ancho_ojos)

    alto_img, ancho_img = img.shape[:2]
    seleccion = xy[list(INDICES_MALLA)]
    fuera = ((seleccion[:, 0] < -2) | (seleccion[:, 0] > ancho_img + 2)
             | (seleccion[:, 1] < -2) | (seleccion[:, 1] > alto_img + 2))
    return Malla(seleccion, z[list(INDICES_MALLA)], presencia, roll, yaw, pitch, coherencia, fuera, ancho_ojos)


def _hay_varios(cara, caras):
    ancho, alto = float(cara[2]), float(cara[3])
    return any(o[14] >= 0.7 and o[2] * o[3] > 0.3 * ancho * alto for o in list(caras)[1:])


def _region(gris, malla, grupos):
    """(media, desviación) de la luminancia en el rectángulo que cubre los puntos de los grupos indicados."""
    puntos = np.vstack([malla.grupo(g)[0] for g in grupos])
    margen = malla.ancho_ojos * 0.15
    x0, y0 = puntos.min(axis=0) - margen
    x1, y1 = puntos.max(axis=0) + margen
    zona = gris[max(0, int(y0)):max(0, int(y1)), max(0, int(x0)):max(0, int(x1))]
    if zona.size == 0:
        return 255.0, 255.0
    return float(zona.mean()), float(zona.std())


def _regiones_tapadas(gris, malla, brillo_rostro=None):
    """True si ojos, nariz o boca están cubiertos por algo oscuro, o si nariz y boca son una superficie lisa.

    El modelo de malla coloca sus puntos aunque haya algo encima, así que la visibilidad se comprueba mirando la
    imagen bajo los puntos. Es una comprobación de luminancia: no distingue todos los tipos de oclusión.
    """
    oscura_media, oscura_desv = CALIDAD["region_oscura"]
    ojos = _region(gris, malla, ("ojo_derecho", "ojo_izquierdo"))
    nariz = _region(gris, malla, ("nariz",))
    boca = _region(gris, malla, ("boca",))
    # Con poca luz todo el rostro es oscuro: solo cuenta una región mucho más oscura que el resto.
    relativa = 0.6 * brillo_rostro if brillo_rostro is not None else 255
    if any(m < oscura_media and m < relativa and d < oscura_desv for m, d in (ojos, nariz, boca)):
        return True
    liso = CALIDAD["region_uniforme"]
    return nariz[1] < liso * nariz[0] and boca[1] < liso * boca[0]


def problemas_malla(malla, ancho, alto, tolerancias=CALIDAD):
    """Problemas de alineación que se deducen de los puntos reales: encuadre, postura y coherencia con el detector."""
    def t(clave):
        return tolerancias.get(clave, CALIDAD[clave])

    problemas = []
    if malla.presencia < CALIDAD["presencia_malla_min"] or malla.coherencia > t("coherencia_max"):
        problemas.append("alineacion_dudosa")
    contorno_fuera = int(malla.grupo("contorno")[1].sum())
    interior_fuera = int(malla.fuera.sum()) - contorno_fuera
    if interior_fuera or contorno_fuera > t("fuera_contorno_max"):
        problemas.append("rostro_cortado")
    if abs(malla.roll) > tolerancias.get("roll_malla_max", tolerancias.get("roll_max")):
        problemas.append("inclinado")
    if abs(malla.yaw) > t("yaw_malla_max"):
        problemas.append("no_frontal")
    if malla.pitch < t("pitch_malla_min"):
        problemas.append("cabeza_levantada")
    elif malla.pitch > t("pitch_malla_max"):
        problemas.append("cabeza_baja")
    return problemas


def problemas_calidad(img, cara, caras=(), malla=None, T=CALIDAD):
    """Códigos de los problemas de la captura, del más importante al menos. Lista vacía = calidad adecuada.

    Mala calidad nunca se interpreta como identidad distinta: estas capturas se repiten, no se comparan.
    Con `malla` (puntos reales) la postura y el encuadre salen de ella; sin ella, de los 5 puntos del detector.
    `T` son los límites: CALIDAD (ideal, para guiar) o CALIDAD_BLOQUEO (lo mínimo para poder comparar).
    """
    h, w = img.shape[:2]
    x, y, ancho, alto = (float(v) for v in cara[:4])
    if _hay_varios(cara, caras):
        return ["varios_rostros"]

    problemas = []
    holgura = T["margen_borde"]
    if x < -holgura * ancho or y < -holgura * alto or x + ancho > w + holgura * ancho or y + alto > h + holgura * alto:
        problemas.append("rostro_cortado")
    relativo = ancho / w
    if relativo < T["ancho_min"]:
        problemas.append("rostro_pequeno")
    elif relativo > T["ancho_max"]:
        problemas.append("rostro_grande")
    dx, dy = (x + ancho / 2) / w - 0.5, (y + alto / 2) / h - 0.5
    if dx < -T["descentrado_x"]:
        problemas.append("rostro_a_la_izquierda")
    elif dx > T["descentrado_x"]:
        problemas.append("rostro_a_la_derecha")
    if dy < -T["descentrado_y"]:
        problemas.append("rostro_arriba")
    elif dy > T["descentrado_y"]:
        problemas.append("rostro_abajo")

    if malla is not None:
        problemas += [p for p in problemas_malla(malla, w, h, T) if p not in problemas]
    else:
        roll, yaw, pitch = pose_aproximada(cara)
        if abs(roll) > T["roll_max"]:
            problemas.append("inclinado")
        if abs(yaw) > T["yaw_max"]:
            problemas.append("no_frontal")
        if pitch < T["pitch_min"]:
            problemas.append("cabeza_levantada")
        elif pitch > T["pitch_max"]:
            problemas.append("cabeza_baja")

    gris = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    rostro = gris[max(0, int(y)):min(h, int(y + alto)), max(0, int(x)):min(w, int(x + ancho))]
    if rostro.size == 0:
        return ["sin_rostro"]
    brillo = float(rostro.mean())
    if brillo < T["brillo_min"]:
        problemas.append("luz_baja")
    elif brillo > T["brillo_max"]:
        problemas.append("luz_excesiva")
    else:
        mitad = rostro.shape[1] // 2
        izq, der = float(rostro[:, :mitad].mean()), float(rostro[:, mitad:].mean())
        if abs(izq - der) / max(1.0, (izq + der) / 2) > T["luz_desigual_max"]:
            problemas.append("luz_desigual")
    if cv2.Laplacian(cv2.resize(rostro, (160, 160)), cv2.CV_64F).var() < T["nitidez_min"]:
        problemas.append("imagen_borrosa")
    if (float(cara[14]) < T["confianza_min"] or _ojos_oscuros(gris, cara)
            or (malla is not None and _regiones_tapadas(gris, malla, brillo))):
        problemas.append("posible_oclusion")
    return problemas


def evaluar_rostro(img, caras):
    """Detecta la malla del rostro principal y devuelve (malla, problemas). Debe llamarse con el candado tomado."""
    cara = caras[0]
    malla = None if _hay_varios(cara, caras) else _malla_facial(img, cara)
    return malla, problemas_calidad(img, cara, caras, malla)


def evaluar_captura(img, caras):
    """(malla, ideales, bloqueantes): lo que la guía pide, y lo que de verdad impide comparar la captura."""
    cara = caras[0]
    malla = None if _hay_varios(cara, caras) else _malla_facial(img, cara)
    return (malla, problemas_calidad(img, cara, caras, malla),
            problemas_calidad(img, cara, caras, malla, CALIDAD_BLOQUEO))


def _zona_foto(img):
    """Recorte del cuadro de la fotografía (mitad izquierda del documento), ampliado si es pequeño."""
    h, w = img.shape[:2]
    zona = img[:, : int(w * ZONA_FOTO)]
    if zona.shape[1] < LADO_ZONA_MIN:
        escala = LADO_ZONA_MIN / zona.shape[1]
        zona = cv2.resize(zona, None, fx=escala, fy=escala, interpolation=cv2.INTER_CUBIC)
    return zona


def _lista_puntos(malla, cara, x0=0.0, y0=0.0, escala=1.0):
    """Puntos reales para mostrar: los de la malla si hay, o los 5 del detector, en las coordenadas pedidas."""
    origen = malla.puntos if malla is not None else _puntos(cara)
    return [[round((float(px) - x0) * escala, 1), round((float(py) - y0) * escala, 1)] for px, py in origen]


def _buscar_rostro_documento(img):
    """(fuente, cara, dudosa): el rostro de la fotografía del documento, o (None, None, False) si no aparece.

    Primero la zona de la fotografía y luego toda la imagen; si no hay rostro, las demás orientaciones, porque la
    cédula suele fotografiarse de lado o al revés. Solo como último recurso se acepta una detección menos segura,
    y entonces se marca `dudosa` para que el servicio no apruebe ni rechace por sí solo."""
    vertical = img.shape[0] > img.shape[1]
    giros = ([cv2.ROTATE_90_CLOCKWISE, cv2.ROTATE_90_COUNTERCLOCKWISE, None, cv2.ROTATE_180] if vertical
             else [None, cv2.ROTATE_90_CLOCKWISE, cv2.ROTATE_90_COUNTERCLOCKWISE, cv2.ROTATE_180])
    for minimo in (0.7, 0.55):
        candidatos = []
        for giro in giros:
            base = img if giro is None else cv2.rotate(img, giro)
            for en_zona, fuente in ((True, _zona_foto(base)), (False, base)):
                caras = [c for c in _rostros(fuente) if c[14] >= minimo]
                if not caras:
                    continue
                (rx, ry), (lx, ly), (_, ny), (_, rmy), (_, lmy) = _puntos(caras[0])
                inclinacion = abs(math.degrees(math.atan2(ly - ry, lx - rx)))
                if not (min(ry, ly) < ny < max(rmy, lmy)):
                    inclinacion += 180  # nariz fuera de lugar: el rostro está al revés
                derecho = inclinacion <= 25
                if derecho and en_zona and caras[0][14] >= 0.85 and not vertical:
                    return fuente, caras[0], minimo < 0.7   # detección clara en la zona de la foto, en la orientación normal: no hace falta seguir
                candidatos.append((derecho, float(caras[0][14]), -inclinacion, fuente, caras[0]))
                break
        if candidatos:
            # Se prefiere el rostro derecho y, entre esos, el de mayor seguridad: así un falso positivo en una
            # orientación incorrecta no gana a la fotografía real en la orientación correcta.
            _, _, _, fuente, cara = max(candidatos, key=lambda c: c[:3])
            return fuente, cara, minimo < 0.7
    return None, None, False


def rostro_documento(contenido):
    """Rostro de la fotografía del documento, o None si no se detecta.

    Primero se analiza el cuadro de la fotografía (a la izquierda en la cédula, el pasaporte y la tarjeta de
    identidad), lo que evita confundirlo con la imagen fantasma pequeña del documento. Si ahí no hay rostro,
    se busca en toda la imagen y se toma el más grande. Devuelve (vector, recorte_jpeg) con los datos de la
    detección real: `puntos` y `caja` dentro de la miniatura, `ancho`/`alto` de la miniatura, `calidad_baja`
    (foto pequeña o poco nítida) y `alineacion_incierta` (postura o puntos poco fiables). Ninguna de las dos
    rechaza: el servicio deriva esos casos a revisión manual.
    """
    _dependencias()
    img = _decodificar(contenido, LADO_DOCUMENTO)
    if img is None:
        return None
    with _candado:
        fuente, cara, dudosa = _buscar_rostro_documento(img)
        if cara is not None:
            recorte, x0, y0 = _recorte_con_origen(fuente, cara)
            gris = cv2.cvtColor(fuente, cv2.COLOR_BGR2GRAY)
            x, y, ancho, alto = (int(v) for v in cara[:4])
            parte = gris[max(0, y):y + alto, max(0, x):x + ancho]
            nitidez = float(cv2.Laplacian(cv2.resize(parte, (160, 160)), cv2.CV_64F).var()) if parte.size else 0.0
            baja = ancho < CALIDAD_DOCUMENTO["ancho_min_px"] or nitidez < CALIDAD_DOCUMENTO["nitidez_min"]
            malla = _malla_facial(fuente, cara)
            avisos = problemas_malla(malla, fuente.shape[1], fuente.shape[0], CALIDAD_DOCUMENTO) if malla is not None else []
            if malla is not None and _regiones_tapadas(gris, malla):
                avisos.append("posible_oclusion")
            # El recorte se reduce para mostrarlo al usuario; los puntos se expresan en esa misma escala.
            escala = min(1.0, 240 / max(recorte.shape[:2]))
            miniatura = cv2.resize(recorte, None, fx=escala, fy=escala, interpolation=cv2.INTER_AREA) if escala < 1 else recorte
            return RostroDocumento(
                _embedding(fuente, cara, malla), _jpeg(_recorte(fuente, cara)),
                imagen=_jpeg(miniatura, 82),
                ancho=int(miniatura.shape[1]), alto=int(miniatura.shape[0]),
                puntos=_lista_puntos(malla, cara, x0, y0, escala),
                grupos=_grupos_malla() if malla is not None else None,
                caja=[round((x - x0) * escala, 1), round((y - y0) * escala, 1), round(ancho * escala, 1), round(alto * escala, 1)],
                calidad_baja=bool(baja),
                alineacion_incierta=bool(avisos) or dudosa,
                alineacion="no_evaluada" if malla is None and not dudosa else ("dudosa" if avisos or dudosa else "adecuada"),
            )
    return None


def resumen_documento(documento):
    """Datos del rostro del documento que se muestran al usuario (puntos reales, nunca simulados)."""
    imagen = getattr(documento, "imagen", None)
    if not imagen:
        return None
    return {
        "imagen": "data:image/jpeg;base64," + base64.b64encode(imagen).decode(),
        "ancho": documento.ancho, "alto": documento.alto,
        "puntos": documento.puntos, "caja": documento.caja,
        "grupos": getattr(documento, "grupos", None),
        "calidad_baja": documento.calidad_baja,
        "alineacion": getattr(documento, "alineacion", "no_evaluada"),
    }


def analizar_fotograma(contenido):
    """Detección, alineación y calidad de UN fotograma en vivo, para guiar la captura.

    No compara identidades ni guarda nada: la verificación de identidad solo ocurre en `comparar`, con las
    capturas que el servidor recibe después. Devuelve el estado de cada etapa por separado:
    `deteccion` (detectado|no_detectado|varios), `alineacion` y `calidad` (adecuada|ajustar|sin_evaluar).
    """
    _dependencias()
    img = _decodificar(contenido, LADO_SELFIE)
    sin_rostro = {"estado": "buscando", "problemas": ["sin_rostro"], "deteccion": "no_detectado",
                  "alineacion": "sin_evaluar", "calidad": "sin_evaluar", "pose": None}
    if img is None:
        return {**sin_rostro, "rostro": None}
    h, w = img.shape[:2]
    with _candado:
        caras = [c for c in _rostros(img) if c[14] >= 0.6]
        if not caras:
            return {**sin_rostro, "rostro": {"ancho": w, "alto": h, "puntos": [], "caja": None, "grupos": None}}
        malla, problemas, bloqueantes = evaluar_captura(img, caras)
    cara = caras[0]
    rostro = {
        "ancho": w, "alto": h,
        "caja": [round(float(v), 1) for v in cara[:4]],
        "puntos": _lista_puntos(malla, cara),
        "grupos": _grupos_malla() if malla is not None else None,
    }
    varios = "varios_rostros" in problemas
    alineacion = "sin_evaluar" if varios else ("ajustar" if PROBLEMAS_ALINEACION & set(problemas) else "adecuada")
    calidad = "sin_evaluar" if varios else (
        "ajustar" if set(problemas) - PROBLEMAS_ALINEACION - PROBLEMAS_DETECCION else "adecuada")
    estado = "varios" if varios else ("ajusta" if problemas else "ok")
    pose = None if malla is None else {
        "roll": round(malla.roll, 1), "yaw": round(malla.yaw, 3), "pitch": round(malla.pitch, 3)}
    return {"estado": estado, "problemas": problemas, "deteccion": "varios" if varios else "detectado",
            "alineacion": alineacion, "calidad": calidad, "pose": pose, "rostro": rostro,
            "capturable": not bloqueantes}


def _miniatura(img):
    return cv2.resize(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), (64, 48)).astype(np.float32)


def _movimiento_puntos(a, b):
    """Desplazamiento del rostro y giro entre dos fotogramas, medido con puntos reales (en distancias entre ojos)."""
    (rax, ray), (lax, lay) = _puntos(a)[:2]
    (rbx, rby), (lbx, lby) = _puntos(b)[:2]
    distancia = math.hypot(lax - rax, lay - ray) or 1e-6
    centro = math.hypot((rax + lax - rbx - lbx) / 2, (ray + lay - rby - lby) / 2) / distancia
    return max(centro, abs(pose_aproximada(a)[1] - pose_aproximada(b)[1]))


def _mas_frecuente(codigos):
    return max(dict.fromkeys(codigos), key=codigos.count) if codigos else None


def _selfie_sin_documento(usables):
    """El documento no tiene un rostro legible: no hay con qué comparar, pero la captura en vivo sí se exige
    (un solo rostro, calidad mínima y presencia) y una persona la compara con el documento."""
    if len(usables) < MIN_FOTOGRAMAS:
        return {"decision": "reintento", "motivo": "pocos_fotogramas", "similitud": None, "selfie": None}
    pares = [(a, b) for i, a in enumerate(usables) for b in usables[i + 1:]]
    diferencia = max((float(np.abs(_miniatura(a[0]) - _miniatura(b[0])).mean()) for a, b in pares), default=0.0)
    movimiento = max((_movimiento_puntos(a[2], b[2]) for a, b in pares), default=0.0)
    if diferencia < 0.3 and movimiento < 0.012:
        return {"decision": "reintento", "motivo": "sin_movimiento", "similitud": None, "selfie": None}
    mejor = min(range(len(usables)), key=lambda i: len(usables[i][3]))
    return {"decision": "revision", "motivo": "rostro_documento_no_detectado", "similitud": None,
            "selfie": _jpeg(usables[mejor][0])}


def comparar(vector_documento, fotogramas):
    """Analiza los fotogramas de la selfie contra el vector del documento.

    Devuelve {"decision": aprobado|revision|rechazado|reintento, "motivo", "similitud", "selfie"}.

    Cada fotograma se evalúa con los puntos reales antes de calcular nada. Solo los problemas que de verdad
    impiden comparar (CALIDAD_BLOQUEO) descartan el fotograma; las imperfecciones leves no. El embedding se calcula
    alineando la imagen original una sola vez por lectura (ver `_embedding`) y la decisión sale de la similitud
    coseno entre embeddings, nunca de distancias entre puntos:

    - parecido alto: se aprueba, aunque la captura no sea ideal;
    - parecido intermedio: revisión manual, o repetir si la captura tuvo imperfecciones que lo expliquen;
    - parecido bajo: se rechaza; si hubo imperfecciones, se repite, salvo que sea tan bajo que ninguna lo explique
      (por debajo de FACIAL_UMBRAL_DESCARTE se rechaza siempre).
    """
    _dependencias()
    usables, bloqueos = [], []
    with _candado:
        for contenido in fotogramas:
            img = _decodificar(contenido, LADO_SELFIE)
            if img is None:
                bloqueos.append("sin_rostro")
                continue
            caras = [c for c in _rostros(img) if c[14] >= 0.6]
            if not caras:
                bloqueos.append("sin_rostro")
                continue
            malla, ideales, bloqueantes = evaluar_captura(img, caras)
            if bloqueantes:
                bloqueos.append(bloqueantes[0])
                continue
            usables.append((img, _embedding(img, caras[0], malla), caras[0], ideales))

        if not usables:
            return {"decision": "reintento", "motivo": _mas_frecuente(bloqueos) or "sin_rostro", "similitud": None, "selfie": None}

        if vector_documento is None:
            return _selfie_sin_documento(usables)

        similitudes = [_similitud(vector, vector_documento) for _, vector, _, _ in usables]
        consistencia = min(
            (_similitud(a[1], b[1]) for i, a in enumerate(usables) for b in usables[i + 1:]),
            default=1.0,
        )

    mejor = int(np.argmax(similitudes))
    puntaje = float(np.mean(sorted(similitudes, reverse=True)[:2]))
    pares = [(a, b) for i, a in enumerate(usables) for b in usables[i + 1:]]
    diferencia = max((float(np.abs(_miniatura(a[0]) - _miniatura(b[0])).mean()) for a, b in pares), default=0.0)
    movimiento = max((_movimiento_puntos(a[2], b[2]) for a, b in pares), default=0.0)
    leves = _mas_frecuente([p for u in usables for p in u[3]])

    def resultado(decision, motivo=""):
        con_selfie = decision != "reintento"
        return {"decision": decision, "motivo": motivo, "similitud": round(puntaje, 4) if con_selfie else None,
                "selfie": _jpeg(usables[mejor][0]) if con_selfie else None}

    if puntaje < settings.FACIAL_UMBRAL_DESCARTE:
        return resultado("rechazado", "no_coincide")      # ninguna imperfección de la captura explica tan poco parecido
    if puntaje >= settings.FACIAL_UMBRAL_REVISION:
        # Presencia: una imagen fija no varía entre fotogramas. No es una prueba de vida certificada; se pide repetir.
        if len(usables) < MIN_FOTOGRAMAS:
            return resultado("reintento", "pocos_fotogramas")
        if diferencia < 0.3 and movimiento < 0.012:
            return resultado("reintento", "sin_movimiento")
        if consistencia < settings.FACIAL_UMBRAL_REVISION:
            return resultado("revision", "rostros_inconsistentes")
    if puntaje >= settings.FACIAL_UMBRAL_APROBADO:
        return resultado("aprobado")
    if leves:
        return resultado("reintento", leves)               # no se confunde una mala captura con otra persona
    if puntaje >= settings.FACIAL_UMBRAL_REVISION:
        return resultado("revision", "similitud_intermedia")
    return resultado("rechazado", "no_coincide")


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
    """Guarda la selfie y, si se pudo recortar, el rostro del documento (sin él la compara una persona)."""
    anteriores = [proceso.selfie_facial]
    if recorte_documento:
        anteriores.append(proceso.foto_documento_facial)
        proceso.foto_documento_facial = _archivo(proceso, "documento", recorte_documento, "validacion_facial_documento")
    proceso.selfie_facial = _archivo(proceso, "selfie", selfie, "validacion_facial_selfie")
    for viejo in anteriores:
        _quitar_archivo(viejo)


# ─── Reglas del proceso ──────────────────────────────────────────────────────

def facial_cumplida(proceso, permitir_revision=False):
    """True si el registro puede continuar respecto a la verificación facial.

    En el registro de médicos (`permitir_revision`) la identidad pendiente de revisión no detiene
    el registro: el administrador la resuelve junto con la solicitud médica."""
    if not settings.FACIAL_OBLIGATORIA:
        return True
    if proceso.validacion_facial or proceso.estado_facial == Estado.ALTERNATIVA:
        return True
    return permitir_revision and proceso.estado_facial == Estado.REVISION


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
        documento = rostro_documento(_contenido_documento(proceso))
    except FacialNoDisponible:
        return NO_DISPONIBLE, 503
    except Exception:
        logger.exception("Error leyendo la fotografía del documento")
        return {"general": ["No fue posible preparar la verificación facial"]}, 500

    ahora = timezone.now()
    proceso.consentimiento_facial_version = settings.FACIAL_CONSENTIMIENTO_VERSION
    proceso.consentimiento_facial_en = ahora
    if documento is None and proceso.tipo_documento in TIPOS_SIN_FOTO:
        _fijar_sin_rostro(proceso)
        proceso.save()
        return _estado(proceso), 200
    # Un documento con fotografía cuyo rostro no se pudo leer NO exime de la verificación: la selfie se
    # captura igual y una persona la compara con el documento.

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
        # Rostro y puntos reales detectados en el documento, para mostrarlos al usuario.
        "documento_rostro": resumen_documento(documento),
        "sin_rostro_documento": documento is None,
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
        huellas = [hashlib.sha256(c).hexdigest() for c in contenidos]
        previas = set(proceso.capturas_huellas.split())
        reutilizada = any(h in previas for h in huellas)
        proceso.capturas_huellas = " ".join((proceso.capturas_huellas.split() + huellas)[-MAX_HUELLAS:])
        consumo.append("capturas_huellas")
        sin_foto = not documento and proceso.tipo_documento in TIPOS_SIN_FOTO
        resultado = None if reutilizada or sin_foto else comparar(documento[0] if documento else None, contenidos)
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

    if reutilizada:
        # Un fotograma idéntico a uno enviado antes no es una captura nueva: lo revisa una persona.
        _a_revision(proceso, "captura_reutilizada")
        proceso.save()
        return _estado(proceso), 200

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

    if not documento:
        _guardar_imagenes(proceso, None, resultado["selfie"])
        _a_revision(proceso, "rostro_documento_no_detectado")
        proceso.save()
        return _estado(proceso), 200

    foto_baja = getattr(documento, "calidad_baja", False)
    if (foto_baja or getattr(documento, "alineacion_incierta", False)) and resultado["decision"] == "rechazado":
        # La foto del documento es pequeña, poco nítida o su rostro está girado o mal ubicado: con tan poco parecido
        # no se puede afirmar que sea otra persona, así que no se rechaza. Lo revisa una persona sin gastar un
        # intento. Con mucho parecido sí se aprueba (queda para la confirmación posterior del administrador).
        _guardar_imagenes(proceso, documento[1], resultado["selfie"])
        _a_revision(proceso, "foto_documento_poco_nitida" if foto_baja else "alineacion_documento_dudosa",
                    resultado["similitud"])
        proceso.save()
        return _estado(proceso), 200

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


def previsualizarRostroService(proceso_id, desafio, fotograma, tipo_registro="paciente"):
    """Guía en vivo de UN fotograma: detección y calidad reales, sin decidir nada.

    Exige un proceso en curso y un desafío vigente, pero NO lo consume ni cuenta como intento; no compara
    identidades, no guarda la imagen ni devuelve similitud. La decisión final es solo de verificarRostroService.
    """
    from users.services import validarProcesoRegistro
    proceso = (ProcesoRegistroUsuario.objects.select_related("documento").filter(id=proceso_id).first())
    error = validarProcesoRegistro(proceso, tipo_registro)
    if error:
        return error
    if proceso.estado_facial != Estado.PENDIENTE or not (
        proceso.desafio_facial_hash and proceso.desafio_facial_expira_en
        and proceso.desafio_facial_expira_en > timezone.now()
        and hmac.compare_digest(proceso.desafio_facial_hash, _hash(desafio))
    ):
        return {"desafio": ["El desafío no es válido o expiró. Inicia la captura de nuevo"]}, 400
    contenido = fotograma.read()
    if len(contenido) > MAX_BYTES_PREVIEW:
        return {"fotograma": ["El fotograma supera el tamaño permitido"]}, 400
    try:
        analisis = analizar_fotograma(contenido)
    except FacialNoDisponible:
        return NO_DISPONIBLE, 503
    except Exception:
        logger.exception("Error en la guía de captura facial")
        return {"general": ["No fue posible analizar la imagen"]}, 500
    return {**analisis, "mensajes": [MENSAJES[c] for c in analisis["problemas"][:1] if c in MENSAJES]}, 200


@transaction.atomic
def omitirValidacionFacialService(proceso_id, motivo, tipo_registro="paciente"):
    proceso, error = _bloquear(proceso_id, tipo_registro)
    if error:
        return error
    if proceso.estado_facial in (Estado.APROBADO, Estado.ALTERNATIVA, Estado.REVISION):
        return _estado(proceso), 200

    if motivo == "sin_foto_documento":
        if proceso.tipo_documento not in TIPOS_SIN_FOTO:
            return {"motivo": ["Tu documento tiene fotografía; debes completar la verificación"]}, 400
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
    # Los médicos se revisan dentro de su solicitud médica, no en este panel.
    pacientes = ProcesoRegistroUsuario.objects.filter(tipo_registro="paciente")
    if estado == "posterior":
        procesos = pacientes.filter(revision_posterior="pendiente")
    else:
        procesos = pacientes.filter(estado_facial=estado)
    if estado == Estado.REVISION:
        procesos = procesos.exclude(estado__in=[
            ProcesoRegistroUsuario.Estado.BLOQUEADO, ProcesoRegistroUsuario.Estado.EXPIRADO,
            ProcesoRegistroUsuario.Estado.COMPLETADO,
        ])
    conteos = {e: 0 for e in ESTADOS_REVISION}
    conteos.update({
        f["estado_facial"]: f["n"]
        for f in pacientes.filter(estado_facial__in=ESTADOS_REVISION)
        .values("estado_facial").annotate(n=Count("id"))
    })
    conteos["posterior"] = pacientes.filter(revision_posterior="pendiente").count()
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
        "umbrales": {"aprobado": settings.FACIAL_UMBRAL_APROBADO, "revision": settings.FACIAL_UMBRAL_REVISION},
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


# ─── Médicos: la identidad se resuelve dentro de la solicitud médica ─────────

def _proceso_del_medico(medico):
    return ProcesoRegistroUsuario.objects.filter(medico=medico).select_related("selfie_facial").first()


def identidad_pendiente_medico(medico):
    """True si la identidad del médico aún espera la decisión del administrador."""
    proceso = _proceso_del_medico(medico)
    return bool(proceso and (proceso.estado_facial == Estado.REVISION or proceso.revision_posterior == "pendiente"))


def cerrar_identidad_medico(medico, aprobada, revisor="solicitud médica"):
    """Al aprobar o rechazar la solicitud médica queda resuelta también la verificación de identidad."""
    proceso = _proceso_del_medico(medico)
    if not proceso:
        return
    if proceso.estado_facial == Estado.REVISION:
        if aprobada and proceso.selfie_facial_id:
            _fijar(proceso, Estado.APROBADO, "revision_manual", validada=True)
        elif aprobada:
            _fijar(proceso, Estado.ALTERNATIVA, proceso.motivo_facial)
        else:
            _fijar(proceso, Estado.RECHAZADO, "revision_manual")
    if proceso.revision_posterior == "pendiente":
        # "bloqueado" aquí significa identidad no confirmada; el rechazo de la solicitud ya impide el uso.
        proceso.revision_posterior = "legitimo" if aprobada else "bloqueado"
    proceso.revisado_facial_por = str(revisor)[:150]
    proceso.revisado_facial_en = timezone.now()
    proceso.save()
    logger.info("Identidad del médico %s cerrada con la solicitud: aprobada=%s", medico.pk, aprobada)


def identidadSolicitudService(solicitud_id, revisor=None):
    """Evidencia de identidad (selfie, foto del documento, similitud y documentos) de una solicitud."""
    from medicos.models import SolicitudValidacionMedico
    solicitud = SolicitudValidacionMedico.objects.select_related("medico").filter(id=solicitud_id).first()
    if not solicitud:
        return {"general": ["Solicitud no encontrada"]}, 404
    proceso = _proceso_del_medico(solicitud.medico)
    if not proceso or proceso.estado_facial == Estado.PENDIENTE:
        return {"disponible": False}, 200
    datos, estado = detalleRevisionFacialService(proceso.id, revisor)
    if estado != 200:
        return {"disponible": False}, 200
    datos["disponible"] = True
    datos["pendiente"] = proceso.estado_facial == Estado.REVISION or proceso.revision_posterior == "pendiente"
    return datos, 200
