from django.utils import timezone

from chatbot.ai.language import LanguageService
from chatbot.politicas import RESULTADOS_MAX
from chatbot.services.cita_service import CitaService
from chatbot.services.medico_service import MedicoService
from chatbot.tools.base_tool import BaseTool


class BuscarMedicoTool(BaseTool):

    name = "buscar_medico"

    description = "Busca médicos por nombre, especialidad o ciudad."

    category = "medicos"

    requires_authentication = True

    requires_confirmation = False

    enabled = True

    def execute(
        self,
        chat,
        mensaje,
        parametros,
    ):
        """Devuelve texto para mostrar y resultados estructurados acotados.

        ``data.medicos`` permite referencias posteriores («el segundo»,
        «ese médico») sin depender del historial enviado al modelo.
        """
        idioma = LanguageService.detectar(mensaje)
        nombre = parametros.get("nombre")
        apellido = parametros.get("apellido")
        especialidad = parametros.get("especialidad")
        ciudad = parametros.get("ciudad")

        medicos = MedicoService.buscar_medicos(
            nombre=nombre,
            apellido=apellido,
            especialidad=especialidad,
            ciudad=ciudad
        )

        fecha = parametros.get('fecha') or parametros.get('fecha_programada')
        if fecha:
            fecha = CitaService.normalizar_fecha(fecha)
            if fecha is None:
                return {
                    "success": False,
                    "message": 'Necesito la fecha y hora para comprobar la disponibilidad de esos médicos.',
                    "data": {"medicos": []},
                }
            medicos = [medico for medico in medicos if CitaService.horario_disponible(medico, fecha)]

        medicos = list(medicos)
        filtros = {"especialidad": especialidad, "ciudad": ciudad,
                   "fecha": fecha.isoformat() if fecha else None}

        if not medicos:
            if fecha:
                local = timezone.localtime(fecha).strftime("%d/%m/%Y a las %H:%M")
                criterios = " ".join(
                    valor for valor in (
                        f"de {especialidad}" if especialidad else None,
                        f"en {ciudad}" if ciudad else None,
                    ) if valor
                )
                mensaje_vacio = LanguageService.elegir(idioma,
                    f"No encontré médicos {criterios} con disponibilidad el {local}. "
                    "Puedo buscar en otro horario, ciudad o especialidad.",
                    f"I couldn't find doctors {criterios} available on {local}.",
                    f"Δεν βρήκα διαθέσιμους γιατρούς στις {local}.")
            else:
                mensaje_vacio = LanguageService.elegir(idioma,
                    "No encontré médicos con los criterios indicados.",
                    "I couldn't find doctors matching those criteria.",
                    "Δεν βρήκα γιατρούς που να ταιριάζουν με αυτά τα κριτήρια.")
            return {"success": True, "message": mensaje_vacio,
                    "data": {"medicos": [], **filtros}}

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

            respuesta += (
                f"{indice}. 👨‍⚕️ Dr. {medico.nombre} {medico.apellido}\n"
                f"{etiquetas['especialidad']}: {medico.id_especialidad.nombre}\n"
                f"{etiquetas['ciudad']}: {ciudad_nombre}\n"
                f"{etiquetas['telefono']}: {medico.telefono}\n\n"
            )
            if len(estructurados) < RESULTADOS_MAX:
                estructurados.append({
                    "id_medico": medico.id,
                    "nombre": f"{medico.nombre} {medico.apellido}".strip(),
                    "especialidad": medico.id_especialidad.nombre,
                    "ciudad": ciudad_nombre,
                })

        if fecha:
            respuesta += LanguageService.elegir(idioma,
                "Disponibles el " + timezone.localtime(fecha).strftime("%d/%m/%Y a las %H:%M")
                + ". Si quieres agendar con alguno, dímelo.",
                "Available on " + timezone.localtime(fecha).strftime("%d/%m/%Y at %H:%M")
                + ". Tell me if you want to book with one.",
                "Διαθέσιμοι στις " + timezone.localtime(fecha).strftime("%d/%m/%Y %H:%M") + ".")

        return {"success": True, "message": respuesta.strip(),
                "data": {"medicos": estructurados, **filtros}}
