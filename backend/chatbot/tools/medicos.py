from chatbot.tools.base_tool import BaseTool
from chatbot.services.medico_service import MedicoService


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

            return (
                "No encontré médicos con los criterios indicados."
            )

        respuesta = "Encontré los siguientes médicos:\n\n"

        for medico in medicos:

            ciudad_nombre = (
                medico.ciudad.nombre
                if medico.ciudad
                else "No registrada"
            )

            respuesta += (
                f"👨‍⚕️ Dr. {medico.nombre} {medico.apellido}\n"
                f"Especialidad: {medico.id_especialidad.nombre}\n"
                f"Ciudad: {ciudad_nombre}\n"
                f"Teléfono: {medico.telefono}\n\n"
            )

        return respuesta.strip()
