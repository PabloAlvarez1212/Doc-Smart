from chatbot.tools.base_tool import BaseTool
from chatbot.services.medico_service import MedicoService
from chatbot.ai.language import LanguageService


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

        if not medicos.exists():

            return LanguageService.elegir(idioma,
                "No encontré médicos con los criterios indicados.",
                "I couldn't find doctors matching those criteria.",
                "Δεν βρήκα γιατρούς που να ταιριάζουν με αυτά τα κριτήρια.")

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

        for medico in medicos:

            ciudad_nombre = (
                medico.ciudad.nombre
                if medico.ciudad
                else etiquetas["sin_ciudad"]
            )

            respuesta += (
                f"👨‍⚕️ Dr. {medico.nombre} {medico.apellido}\n"
                f"{etiquetas['especialidad']}: {medico.id_especialidad.nombre}\n"
                f"{etiquetas['ciudad']}: {ciudad_nombre}\n"
                f"{etiquetas['telefono']}: {medico.telefono}\n\n"
            )

        return respuesta.strip()
