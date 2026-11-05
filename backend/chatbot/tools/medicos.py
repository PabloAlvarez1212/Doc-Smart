import re
from datetime import date

from django.utils import timezone

from chatbot.ai.language import LanguageService
from chatbot.politicas import ALTERNATIVAS_MAX, HORARIOS_POR_MEDICO, RESULTADOS_MAX
from chatbot.services.cita_service import CitaService
from chatbot.services.medico_service import MedicoService
from chatbot.tools.base_tool import BaseTool


def _formato(fecha):
    return timezone.localtime(fecha).strftime("%d/%m/%Y a las %H:%M")


class BuscarMedicoTool(BaseTool):

    name = "buscar_medico"

    description = "Busca médicos por nombre, especialidad o ciudad."

    category = "medicos"

    requires_authentication = True

    requires_confirmation = False

    enabled = True

    @staticmethod
    def _momento_y_dia(valor):
        """(fecha con hora o None, día o None). Un día sin hora consulta toda la agenda de ese día."""
        momento = CitaService.normalizar_fecha(valor)
        if momento is not None:
            return momento, timezone.localtime(momento).date()
        texto = str(valor or "").strip()
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", texto):
            try:
                return None, date.fromisoformat(texto)
            except ValueError:
                return None, None
        return None, CitaService.extraer_dia(texto)

    def execute(
        self,
        chat,
        mensaje,
        parametros,
    ):
        """Devuelve texto para mostrar y resultados estructurados acotados.

        ``data.medicos`` permite referencias posteriores («el segundo»,
        «ese médico») sin depender del historial enviado al modelo. Con fecha,
        muestra los horarios realmente libres según el servicio oficial.
        """
        idioma = LanguageService.detectar(mensaje)
        nombre = parametros.get("nombre")
        apellido = parametros.get("apellido")
        especialidad = parametros.get("especialidad")
        ciudad = None if parametros.get("ciudad_omitida") else parametros.get("ciudad")

        consulta = MedicoService.buscar_medicos(
            nombre=nombre,
            apellido=apellido,
            especialidad=especialidad,
            ciudad=ciudad
        )
        if parametros.get("listar_ciudades"):
            ciudades = sorted(set(consulta.exclude(ciudad__isnull=True).values_list("ciudad__nombre", flat=True)))
            detalle = f" de {especialidad}" if especialidad else ""
            return {"success": True,
                    "message": (f"Hay médicos{detalle} en: " + ", ".join(ciudades) + ". ¿En qué ciudad prefieres buscar?"
                                if ciudades else f"No encontré ciudades con médicos{detalle} registrados."),
                    "data": {"ciudades": ciudades, "medicos": [], "especialidad": especialidad,
                             "ciudad": None, "fecha": None}}
        medicos = list(consulta)

        valor_fecha = parametros.get('fecha') or parametros.get('fecha_programada')
        momento = dia = None
        if valor_fecha:
            momento, dia = self._momento_y_dia(valor_fecha)
            if dia is None:
                return {
                    "success": False,
                    "message": 'Necesito la fecha (y, si quieres, la hora) para comprobar la disponibilidad de esos médicos.',
                    "data": {"medicos": []},
                }

        filtros = {"especialidad": especialidad, "ciudad": ciudad,
                   "fecha": (momento.isoformat() if momento else (dia.isoformat() if dia else None))}
        criterios = " ".join(
            valor for valor in (f"de {especialidad}" if especialidad else None,
                                f"en {ciudad}" if ciudad else None) if valor
        )

        if dia is not None:
            return self._con_agenda(medicos, momento, dia, filtros, criterios, idioma)

        if not medicos:
            mensaje_vacio = LanguageService.elegir(idioma,
                "No encontré médicos con los criterios indicados.",
                "I couldn't find doctors matching those criteria.",
                "Δεν βρήκα γιατρούς που να ταιριάζουν με αυτά τα κριτήρια.")
            return {"success": True, "message": mensaje_vacio,
                    "data": {"medicos": [], **filtros}}

        return self._listado(medicos, filtros, idioma, {})

    def _con_agenda(self, medicos, momento, dia, filtros, criterios, idioma):
        """Médicos con sus horarios libres ese día; alternativas reales si no hay."""
        agenda = {m.pk: CitaService.horarios_del_dia(m, dia) for m in medicos[:RESULTADOS_MAX * 2]}
        etiqueta_dia = dia.strftime("%d/%m/%Y")
        if momento is not None:
            hhmm = timezone.localtime(momento).strftime("%H:%M")
            libres = [m for m in medicos if hhmm in agenda.get(m.pk, [])]
        else:
            libres = [m for m in medicos if agenda.get(m.pk)]

        if libres:
            return self._listado(libres, filtros, idioma, agenda, dia=dia, momento=momento)

        referencia = momento or timezone.make_aware(
            timezone.datetime.combine(dia, timezone.datetime.min.time()).replace(hour=8),
            timezone.get_current_timezone())
        alternativas = []
        for medico in medicos[:RESULTADOS_MAX]:
            for inicio in CitaService.alternativas(medico, referencia, limite=ALTERNATIVAS_MAX):
                alternativas.append((abs((inicio - referencia).total_seconds()), medico, inicio))
        alternativas.sort(key=lambda item: item[0])
        alternativas = alternativas[:ALTERNATIVAS_MAX]
        cuando = f"el {etiqueta_dia}" + (f" a las {timezone.localtime(momento).strftime('%H:%M')}" if momento else "")
        if not medicos:
            texto = "No encontré médicos con esos criterios."
        elif not alternativas:
            texto = (f"Ningún médico {criterios} tiene horarios disponibles {cuando} "
                     "ni en los próximos días. Puedo buscar con otra ciudad o especialidad.")
        else:
            lineas = [f"Ningún médico {criterios} tiene disponible {cuando}. Horarios reales más cercanos:"]
            for indice, (_, medico, inicio) in enumerate(alternativas, start=1):
                lineas.append(f"{indice}. Dr(a). {medico.nombre} {medico.apellido} — {_formato(inicio)}")
            lineas.append("Indícame cuál prefieres o dime otra fecha.")
            texto = "\n".join(lineas)
        return {
            "success": True,
            "message": texto,
            "data": {
                "medicos": [], **filtros,
                "alternativas": [{"id_medico": m.pk, "nombre": f"{m.nombre} {m.apellido}".strip(),
                                  "fecha": inicio.isoformat()} for _, m, inicio in alternativas],
            },
        }

    def _listado(self, medicos, filtros, idioma, agenda, dia=None, momento=None):
        respuesta = LanguageService.elegir(idioma,
            "Encontré los siguientes médicos:\n\n",
            "I found the following doctors:\n\n",
            "Βρήκα τους ακόλουθους γιατρούς:\n\n")
        etiquetas = {
            "especialidad": LanguageService.elegir(idioma, "Especialidad", "Specialty", "Ειδικότητα"),
            "ciudad": LanguageService.elegir(idioma, "Ciudad", "City", "Πόλη"),
            "telefono": LanguageService.elegir(idioma, "Teléfono", "Phone", "Τηλέφωνο"),
            "sin_ciudad": LanguageService.elegir(idioma, "No registrada", "Not registered", "Δεν έχει καταχωρηθεί"),
        }
        estructurados = []

        for indice, medico in enumerate(medicos, start=1):

            ciudad_nombre = (
                medico.ciudad.nombre
                if medico.ciudad
                else etiquetas["sin_ciudad"]
            )
            horarios = CitaService.horarios_cercanos(agenda.get(medico.pk, []), momento, HORARIOS_POR_MEDICO)

            respuesta += (
                f"{indice}. 👨‍⚕️ Dr. {medico.nombre} {medico.apellido}\n"
                f"{etiquetas['especialidad']}: {medico.id_especialidad.nombre}\n"
                f"{etiquetas['ciudad']}: {ciudad_nombre}\n"
                f"{etiquetas['telefono']}: {medico.telefono}\n"
            )
            if dia is not None:
                respuesta += f"Horarios libres el {dia.strftime('%d/%m/%Y')}: {', '.join(horarios)}\n"
            respuesta += "\n"
            if len(estructurados) < RESULTADOS_MAX:
                estructurados.append({
                    "id_medico": medico.id,
                    "nombre": f"{medico.nombre} {medico.apellido}".strip(),
                    "especialidad": medico.id_especialidad.nombre,
                    "ciudad": ciudad_nombre,
                    "horarios": horarios,
                })

        if dia is not None:
            respuesta += "Si quieres agendar con alguno, dime el médico y la hora."

        return {"success": True, "message": respuesta.strip(),
                "data": {"medicos": estructurados, **filtros}}
