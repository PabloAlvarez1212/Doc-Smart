from datetime import datetime
from difflib import SequenceMatcher
import re
import unicodedata

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from citas.models import Cita
from citas.services import (
    cancelarCitaService,
    crearCitaService,
    editarCitaService,
    confirmarCitaService,
    completarCitaService,
)
from medicos.models import Medico


class CitaService:

    MESES = {
        "enero": 1,
        "febrero": 2,
        "marzo": 3,
        "abril": 4,
        "mayo": 5,
        "junio": 6,
        "julio": 7,
        "agosto": 8,
        "septiembre": 9,
        "setiembre": 9,
        "octubre": 10,
        "noviembre": 11,
        "diciembre": 12,
    }

    FORMATOS_FECHA = (
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d %H:%M:%S",
        "%d/%m/%Y %H:%M",
    )

    @staticmethod
    def normalizar_fecha(valor):
        if isinstance(valor, datetime):
            fecha = valor
        elif isinstance(valor, str):
            try:
                fecha = parse_datetime(valor.strip())
            except ValueError:
                return None

            if fecha is None:
                for formato in CitaService.FORMATOS_FECHA:
                    try:
                        fecha = datetime.strptime(valor.strip(), formato)
                        break
                    except ValueError:
                        continue

            if fecha is None:
                fecha = CitaService._parsear_fecha_espanol(valor)
        else:
            fecha = None

        if fecha is None:
            return None

        if timezone.is_naive(fecha):
            fecha = timezone.make_aware(
                fecha,
                timezone.get_current_timezone(),
            )

        return fecha

    @staticmethod
    def _parsear_fecha_espanol(valor):
        texto = unicodedata.normalize("NFKD", valor.lower())
        texto = "".join(
            caracter
            for caracter in texto
            if not unicodedata.combining(caracter)
        )
        texto = re.sub(r"\s+", " ", texto).strip()

        patron = re.search(
            r"(?:el\s+|dia\s+)?(?P<dia>\d{1,2})\s+"
            r"(?:de\s+)?(?P<mes>[a-z]+)"
            r"(?:\s+(?:de\s+)?(?P<anio>\d{4}))?",
            texto,
        )

        if patron is None:
            return None

        mes_texto = patron.group("mes")
        mes = CitaService.MESES.get(mes_texto)

        if mes is None:
            coincidencias = sorted(
                (
                    (SequenceMatcher(None, mes_texto, nombre_mes).ratio(), numero)
                    for nombre_mes, numero in CitaService.MESES.items()
                ),
                reverse=True,
            )
            if coincidencias and coincidencias[0][0] >= 0.78:
                mes = coincidencias[0][1]

        if mes is None:
            return None

        hora_encontrada = re.search(
            r"(?:a\s+las\s+)?(?P<hora>\d{1,2})"
            r"(?:[:\.](?P<minuto>\d{2}))?\s*"
            r"(?P<periodo>am|pm|a\.?\s*m\.?|p\.?\s*m\.?)",
            texto,
        )

        periodo_natural = None

        if hora_encontrada is None:
            hora_encontrada = re.search(
                r"(?:a\s+las\s+)?(?P<hora>\d{1,2})"
                r"(?:[:\.](?P<minuto>\d{2}))?\s*"
                r"(?:de\s+la\s+)?(?P<periodo_natural>manana|tarde|noche)",
                texto,
            )
            if hora_encontrada is not None:
                periodo_natural = hora_encontrada.group("periodo_natural")

        formato_24h = False
        if hora_encontrada is None:
            hora_encontrada = re.search(r"a\s+las\s+(?P<hora>\d{1,2}):(?P<minuto>\d{2})\b", texto)
            formato_24h = hora_encontrada is not None
        if hora_encontrada is None:
            return None

        hora = int(hora_encontrada.group("hora"))
        minuto = int(hora_encontrada.group("minuto") or 0)
        periodo = "" if formato_24h else (
            hora_encontrada.groupdict().get("periodo")
            or ("am" if periodo_natural == "manana" else "pm")
        ).replace(".", "").replace(" ", "")

        if not (0 <= hora <= 23 if formato_24h else 1 <= hora <= 12) or not 0 <= minuto <= 59:
            return None

        if periodo == "pm" and hora != 12:
            hora += 12
        elif periodo == "am" and hora == 12:
            hora = 0

        ahora = timezone.localtime()
        anio_explicito = patron.group("anio")
        anio = int(anio_explicito) if anio_explicito else ahora.year

        try:
            fecha = datetime(
                anio,
                mes,
                int(patron.group("dia")),
                hora,
                minuto,
            )
        except ValueError:
            return None

        fecha = timezone.make_aware(
            fecha,
            timezone.get_current_timezone(),
        )

        if not anio_explicito and fecha <= ahora:
            try:
                fecha = fecha.replace(year=fecha.year + 1)
            except ValueError:
                return None

        return fecha

    @staticmethod
    def obtener_medico(id_medico):

        return Medico.objects.filter(
            id=id_medico
        ).first()

    @staticmethod
    def medico_tiene_cita(id_medico, fecha, excluir_cita_id=None):

        citas = Cita.objects.filter(
            id_medico_id=id_medico,
            fecha_programada=fecha
        )

        if excluir_cita_id is not None:
            citas = citas.exclude(id=excluir_cita_id)

        return citas.exists()

    @staticmethod
    def obtener_cita_usuario(id_cita, usuario):
        return (
            Cita.objects
            .select_related(
                "id_medico",
                "id_medico__id_especialidad",
                "id_estado",
            )
            .filter(id=id_cita, id_usuario=usuario)
            .first()
        )

    @staticmethod
    def obtener_citas_medico_modificables(medico_id):
        """Citas operables del médico autenticado, incluidas las atrasadas."""
        return (
            Cita.objects
            .select_related("id_usuario", "id_estado", "id_medico")
            .filter(
                id_medico_id=medico_id,
                id_estado__nombre__in=(
                    "pendiente",
                    "confirmada",
                    "reprogramada",
                ),
            )
            .order_by("fecha_programada", "id")
        )

    @staticmethod
    @transaction.atomic
    def reprogramar_medico(medico_id, id_cita, fecha):
        """Revalida propiedad y disponibilidad justo antes de escribir."""
        if not Medico.objects.select_for_update().filter(pk=medico_id).first():
            return "Médico no disponible", 403
        cita = (
            Cita.objects
            .select_for_update()
            .select_related("id_usuario", "id_medico", "id_estado")
            .filter(id=id_cita, id_medico_id=medico_id)
            .first()
        )

        if cita is None:
            return "La cita no pertenece al médico autenticado", 403

        if cita.id_estado.nombre.strip().lower() in {"cancelada", "completada"}:
            return "No se puede reprogramar una cita cancelada o completada", 400

        if fecha <= timezone.now():
            return "La nueva fecha debe estar en el futuro", 400

        if cita.fecha_programada == fecha:
            return "La cita ya está programada para esa fecha y hora", 400

        if CitaService.medico_tiene_cita(
            medico_id,
            fecha,
            excluir_cita_id=cita.id,
        ):
            return "Ya tienes otra cita programada en esa fecha y hora", 400

        # editarCitaService conserva las reglas, serialización y notificaciones
        # existentes. La propiedad médica ya fue validada de forma inequívoca.
        return editarCitaService(
            cita.id,
            {"fecha_programada": fecha},
            cita.id_medico,
        )

    @staticmethod
    @transaction.atomic
    def operar_medico(medico, id_cita, accion, fecha=None, esperado=None):
        if not isinstance(medico, Medico):
            return "No fue posible modificar esta cita.", 403
        # Serializa también las reservas en fechas que todavía no tienen filas.
        if not Medico.objects.select_for_update().filter(pk=medico.pk).first():
            return "No fue posible modificar esta cita.", 403
        cita = Cita.objects.select_for_update().select_related("id_estado").filter(
            pk=id_cita, id_medico=medico,
        ).first()
        if not cita:
            return "No fue posible modificar esta cita.", 403
        estado = cita.id_estado.nombre.strip().casefold()
        if esperado and (esperado.get("estado_original") != estado or
                         esperado.get("fecha_original") != cita.fecha_programada.isoformat()):
            return "La cita cambió desde la confirmación. Consulta la agenda e inicia de nuevo.", 409
        if estado not in ("pendiente", "confirmada", "reprogramada"):
            return "El estado actual de la cita impide esta operación.", 409
        if accion == "reprogramar":
            if fecha is None or fecha <= timezone.now() or fecha == cita.fecha_programada:
                return "Indica una fecha futura distinta de la actual.", 400
            return CitaService.reprogramar_medico(medico.pk, cita.pk, fecha)
        if accion == "cancelar":
            return cancelarCitaService(cita.pk, medico)
        if accion == "confirmar":
            return confirmarCitaService(cita.pk, medico.pk)
        if accion == "completar":
            return completarCitaService(cita.pk, medico.pk)
        return "Operación no permitida.", 400

    @staticmethod
    def crear_cita(usuario, medico, fecha, estado):

        return Cita.objects.create(
            id_usuario=usuario,
            id_medico=medico,
            fecha_programada=fecha,
            id_estado=estado
        )

    @staticmethod
    def obtener_proximas(usuario):

        return (
            Cita.objects
            .select_related(
                "id_medico",
                "id_medico__id_especialidad",
                "id_estado"
            )
            .filter(
                id_usuario=usuario,
                fecha_programada__gte=timezone.now()
            )
            .exclude(id_estado__nombre__in=["cancelada", "completada"])
            .order_by("fecha_programada")
        )

    @staticmethod
    def agendar(usuario, medico, fecha):
        return crearCitaService(
            {
                "id_medico": medico.id,
                "fecha_programada": fecha,
            },
            usuario.id,
        )

    @staticmethod
    def reprogramar(usuario, cita, fecha):
        # La pertenencia se valida antes de delegar al servicio general.
        if cita.id_usuario_id != usuario.id:
            return "La cita no pertenece al usuario autenticado", 403

        return editarCitaService(
            cita.id,
            {"fecha_programada": fecha},
            usuario.id,
        )

    @staticmethod
    def cancelar(usuario, cita):
        # La pertenencia se valida antes de delegar al servicio general.
        if cita.id_usuario_id != usuario.id:
            return "La cita no pertenece al usuario autenticado", 403

        return cancelarCitaService(cita.id, usuario.id)
