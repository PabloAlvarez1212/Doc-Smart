"""Registros que no se guardan: los procesos incompletos se eliminan junto con sus archivos.

Solo se conservan los registros completados, los bloqueados por una decisión del administrador y los
que esperan esa decisión con un correo de contacto registrado (o la aprobación y el regreso de la persona).
"""
import logging

from django.core.files.storage import default_storage
from django.utils import timezone

from users.models import ProcesoRegistroUsuario

logger = logging.getLogger(__name__)

Estado = ProcesoRegistroUsuario.Estado
EstadoFacial = ProcesoRegistroUsuario.EstadoFacial

ESTADOS_PROTEGIDOS = (Estado.COMPLETADO, Estado.BLOQUEADO)


def en_espera_de_revision(proceso):
    """True si el proceso quedó guardado a la espera de la decisión del administrador."""
    return (
        proceso.estado_facial == EstadoFacial.REVISION
        and bool(proceso.correo_contacto_facial)
        and proceso.estado not in ESTADOS_PROTEGIDOS
    )


def _borrar_archivo(archivo, facial=False):
    if not archivo:
        return
    try:
        if facial:
            from users.validacion_facial import _borrar
            _borrar(archivo.storage_key)
        elif archivo.categoria == "hoja_vida":
            from storage_app.services import eliminar_archivo
            eliminar_archivo(archivo.storage_key)
        else:
            default_storage.delete(archivo.storage_key)
    except Exception:
        logger.exception("No se pudo eliminar el archivo %s del almacenamiento", archivo.storage_key)


def eliminar_proceso(proceso):
    """Elimina el proceso, sus imágenes del documento y las de la verificación facial."""
    archivos = [(proceso.documento, False), (proceso.documento_reverso, False),
                (proceso.foto_documento_facial, True), (proceso.selfie_facial, True),
                (proceso.hoja_vida, False)]
    ids = [a.pk for a, _ in archivos if a]
    for archivo, facial in archivos:
        _borrar_archivo(archivo, facial)
    proceso.delete()
    from storage_app.models import Archivo
    Archivo.objects.filter(pk__in=ids).delete()


def _sin_guardar(consulta):
    # Tampoco se tocan los aprobados por el administrador que aún pueden retomar su registro.
    return consulta.exclude(estado__in=ESTADOS_PROTEGIDOS).exclude(
        estado_facial=EstadoFacial.REVISION, correo_contacto_facial__gt="",
    ).exclude(token_reanudacion_expira_en__gt=timezone.now())


def purgar_abandonados(documento=None, solo_vencidos=True):
    """Elimina los procesos sin guardar. `documento` = (tipo_registro, tipo_documento, numero)
    limita la limpieza a los de una misma persona. Devuelve la cantidad eliminada."""
    consulta = ProcesoRegistroUsuario.objects.select_related(
        "documento", "documento_reverso", "foto_documento_facial", "selfie_facial", "hoja_vida")
    if documento:
        tipo_registro, tipo_documento, numero = documento
        consulta = consulta.filter(tipo_registro=tipo_registro, tipo_documento=tipo_documento,
                                   numero_documento_declarado=numero)
    if solo_vencidos:
        consulta = consulta.filter(expira_en__lt=timezone.now())
    total = 0
    for proceso in _sin_guardar(consulta):
        eliminar_proceso(proceso)
        total += 1
    return total


def proceso_en_revision(tipo_registro, tipo_documento, numero):
    return ProcesoRegistroUsuario.objects.filter(
        tipo_registro=tipo_registro, tipo_documento=tipo_documento,
        numero_documento_declarado=numero, estado_facial=EstadoFacial.REVISION,
        correo_contacto_facial__gt="",
    ).exclude(estado__in=ESTADOS_PROTEGIDOS).order_by("-creado_en").first()


def proceso_reanudable(tipo_registro, tipo_documento, numero, datos):
    """Proceso ya verificado por el administrador que la persona puede retomar sin repetir el
    documento ni el reconocimiento facial. Exige que los datos del primer paso coincidan."""
    from users.validacion_facial import facial_cumplida
    proceso = ProcesoRegistroUsuario.objects.filter(
        tipo_registro=tipo_registro, tipo_documento=tipo_documento,
        numero_documento_declarado=numero, documento_verificado=True,
        token_reanudacion_expira_en__gt=timezone.now(), expira_en__gt=timezone.now(),
    ).exclude(estado__in=ESTADOS_PROTEGIDOS + (Estado.EXPIRADO,)).order_by("-creado_en").first()
    if not proceso or not facial_cumplida(proceso):
        return None
    coincide = (
        proceso.nombre_declarado.strip().lower() == datos["nombre"].strip().lower()
        and proceso.apellido_declarado.strip().lower() == datos["apellido"].strip().lower()
        and proceso.fecha_nacimiento_declarada == datos["fecha_nacimiento"]
    )
    return proceso if coincide else None
