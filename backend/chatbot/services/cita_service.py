from datetime import datetime
from difflib import SequenceMatcher
import re
import unicodedata

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from citas.models import Cita
from citas.services import (
    cancelarCitaService,
    crearCitaService,
    editarCitaService,
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
            fecha = parse_datetime(valor.strip())

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

        if hora_encontrada is None:
            return None

        hora = int(hora_encontrada.group("hora"))
        minuto = int(hora_encontrada.group("minuto") or 0)
        periodo = (
            hora_encontrada.groupdict().get("periodo")
            or ("am" if periodo_natural == "manana" else "pm")
        ).replace(".", "").replace(" ", "")

        if not 1 <= hora <= 12 or not 0 <= minuto <= 59:
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
