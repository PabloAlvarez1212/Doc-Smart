from datetime import datetime, timedelta
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
    esHorarioDisponible,
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
            # Una fecha sin hora no autoriza a inventar un slot a medianoche.
            if re.fullmatch(r"\d{4}-\d{2}-\d{2}", valor.strip()):
                return None
            relativo = re.match(r"^(pasado mañana|mañana|hoy)\b(.*)$", valor.strip(), re.I)
            if relativo:
                dias = {"hoy": 0, "mañana": 1, "pasado mañana": 2}[relativo[1].lower()]
                dia = timezone.localdate() + timedelta(days=dias)
                mes = next(nombre for nombre, numero in CitaService.MESES.items() if numero == dia.month)
                valor = f"{dia.day} de {mes} de {dia.year}{relativo[2]}"
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
    def extraer_fecha_relativa(texto):
        """«mañana a las 10 a.m.» → fecha local. Sin hora exacta no inventa un slot."""
        from chatbot.ai.filters import extraer_hora
        dia = CitaService.extraer_dia(texto)
        hora = extraer_hora(texto)
        if dia is None or hora is None or hora[0] == "ambigua":
            return None
        return timezone.make_aware(
            datetime.combine(dia, datetime.min.time()).replace(hour=hora[0], minute=hora[1]),
            timezone.get_current_timezone(),
        )

    DIAS_SEMANA = {"lunes": 0, "martes": 1, "miercoles": 2, "jueves": 3,
                   "viernes": 4, "sabado": 5, "domingo": 6}

    @staticmethod
    def extraer_dia(texto):
        """Día local mencionado: hoy, mañana, pasado mañana, un día de la semana
        o «8 de noviembre». Usa la fecha y la zona horaria configuradas."""
        t = unicodedata.normalize("NFKD", str(texto or "").lower())
        t = "".join(c for c in t if not unicodedata.combining(c))
        t = re.sub(r"\bde la manana\b", " ", t)  # «7 de la mañana» es una hora
        hoy = timezone.localdate()
        iso = re.search(r"\b(\d{4})-(\d{2})-(\d{2})\b", t)
        if iso:
            try:
                return datetime(int(iso.group(1)), int(iso.group(2)), int(iso.group(3))).date()
            except ValueError:
                return None
        if re.search(r"\bpasado manana\b", t):
            return hoy + timedelta(days=2)
        if re.search(r"\bmanana\b", t):
            return hoy + timedelta(days=1)
        if re.search(r"\bhoy\b", t):
            return hoy
        explicita = re.search(r"\b(\d{1,2}) de ([a-z]+)(?: de (\d{4}))?\b", t)
        if explicita and explicita.group(2) in CitaService.MESES:
            anio = int(explicita.group(3) or hoy.year)
            try:
                dia = datetime(anio, CitaService.MESES[explicita.group(2)], int(explicita.group(1))).date()
            except ValueError:
                return None
            if not explicita.group(3) and dia < hoy:
                dia = dia.replace(year=dia.year + 1)
            return dia
        semana = re.search(r"\b(?:el |este |proximo )?(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b", t)
        if semana:
            falta = (CitaService.DIAS_SEMANA[semana.group(1)] - hoy.weekday()) % 7
            return hoy + timedelta(days=falta or 7)
        return None

    @staticmethod
    def horarios_del_dia(medico, dia):
        """Horas (HH:MM) realmente libres del médico ese día, según el servicio oficial."""
        from medicos.services_disponibilidad import generarSlotsDisponibles
        return [slot["hora_inicio"] for slot in generarSlotsDisponibles(medico, dia)]

    @staticmethod
    def alternativas(medico, fecha, limite=4, dias=7):
        """Horarios libres más cercanos a ``fecha`` (misma jornada y días siguientes)."""
        objetivo = timezone.localtime(fecha)
        encontrados = []
        for desplazamiento in range(dias + 1):
            dia = objetivo.date() + timedelta(days=desplazamiento)
            for hhmm in CitaService.horarios_del_dia(medico, dia):
                hora, minuto = (int(parte) for parte in hhmm.split(":"))
                inicio = timezone.make_aware(
                    datetime.combine(dia, datetime.min.time()).replace(hour=hora, minute=minuto),
                    timezone.get_current_timezone(),
                )
                if inicio != objetivo:
                    encontrados.append(inicio)
        cercanos = sorted(encontrados, key=lambda inicio: abs((inicio - objetivo).total_seconds()))[:limite]
        return sorted(cercanos)

    @staticmethod
    def horarios_cercanos(horas, momento=None, n=3):
        """Las ``n`` horas (HH:MM) libres más cercanas a ``momento`` (o las primeras), en orden."""
        if momento is None:
            return list(horas)[:n]
        objetivo = timezone.localtime(momento)
        minutos = objetivo.hour * 60 + objetivo.minute
        distancia = lambda hhmm: abs(int(hhmm[:2]) * 60 + int(hhmm[3:5]) - minutos)
        return sorted(sorted(horas, key=distancia)[:n])

    @staticmethod
    def proximos_horarios(medico, desde, n=3, dias=14):
        """Próximos ``n`` horarios libres del médico a partir de ``desde``, con su fecha."""
        desde = timezone.localtime(desde)
        encontrados = []
        for desplazamiento in range(dias + 1):
            dia = desde.date() + timedelta(days=desplazamiento)
            for hhmm in CitaService.horarios_del_dia(medico, dia):
                hora, minuto = (int(parte) for parte in hhmm.split(":"))
                inicio = timezone.make_aware(
                    datetime.combine(dia, datetime.min.time()).replace(hour=hora, minute=minuto),
                    timezone.get_current_timezone(),
                )
                if inicio >= desde:
                    encontrados.append(inicio)
                if len(encontrados) >= n:
                    return encontrados
        return encontrados

    @staticmethod
    def horario_disponible(medico, fecha, excluir_cita_id=None):
        return esHorarioDisponible(medico, fecha, excluir_cita_id=excluir_cita_id)
    
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
        if isinstance(id_cita, bool) or not re.fullmatch(r'[0-9]+', str(id_cita)):
            return None
        if not 0 < int(id_cita) <= 9223372036854775807:
            return None
        return (
            Cita.objects
            .select_related(
                "id_medico",
                "id_medico__id_especialidad",
                "id_estado",
            )
            .filter(pk=int(id_cita), id_usuario=usuario)
            .first()
        )

    @staticmethod
    def obtener_cita_usuario_codigo(codigo, usuario):

        if not isinstance(codigo, str):
            return None

        codigo = codigo.strip().upper()

        if not re.fullmatch(r"DOC-[A-Z0-9]{8}", codigo):
            return None

        return (
            Cita.objects
            .select_related(
                "id_medico",
                "id_medico__id_especialidad",
                "id_estado",
            )
            .filter(
                codigo_cita__iexact=codigo,
                id_usuario=usuario,
            )
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
    def operar_medico(medico, id_cita, accion, fecha=None, esperado=None, datos_historial=None, motivo_cancelacion=None):
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
            from chatbot.ai.motivos_cancelacion import (normalizar_motivo_cancelacion,)
            motivo = normalizar_motivo_cancelacion(motivo_cancelacion)
            if motivo is None:
                return ("Debes proporcionar un motivo de cancelación válido.",400,)
            return cancelarCitaService(
                cita.pk,
                medico,
                motivo_cancelacion=motivo,
            )
        if accion == "confirmar":
            return confirmarCitaService(cita.pk, medico.pk)
        if accion == "completar":
            if datos_historial is None:
                return "Para completar la cita, registra motivo, diagnóstico y seguimiento en el modal de cierre de tu agenda.", 400
            return completarCitaService(cita.pk, medico.pk, datos_historial)
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
    def agendar(usuario, medico, fecha, motivo_consulta=None):
        from citas.serializers import CrearCitaSerializer

        serializer = CrearCitaSerializer(data={
            "id_medico": medico.id,
            "fecha_programada": fecha,
            "motivo_consulta": motivo_consulta,
        })

        if not serializer.is_valid():
            return serializer.errors, 400

        return crearCitaService(
            serializer.validated_data,
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
            usuario,
        )

    @staticmethod
    def cancelar(usuario, cita, motivo_cancelacion):
        if cita.id_usuario_id != usuario.id:
            return ("La cita no pertenece al usuario autenticado",403,)

        from chatbot.ai.motivos_cancelacion import (
            normalizar_motivo_cancelacion,
        )
        motivo = normalizar_motivo_cancelacion(
            motivo_cancelacion
        )
        if motivo is None:
            return ("Debes proporcionar un motivo de cancelación válido.",400,)

        return cancelarCitaService(
            cita.id,
            usuario,
            motivo_cancelacion=motivo,
        )
