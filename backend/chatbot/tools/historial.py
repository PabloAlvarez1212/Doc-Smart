from chatbot.tools.base_tool import BaseTool
from chatbot.services.historial_service import HistorialService


class ConsultarHistorialTool(BaseTool):

    name = "consultar_historial"

    description = "Consulta el historial clínico del usuario autenticado."

    category = "historial"

    requires_authentication = True

    requires_confirmation = False

    enabled = True

    def execute(
        self,
        chat,
        mensaje,
        parametros,
    ):

        limite = parametros.get("limite", 5)

        historial = HistorialService.obtener_historial(
            usuario=chat.id_usuario,
            limite=limite
        )

        if not historial.exists():

            return {
                "success": True,
                "message": "No encontré registros en tu historia clínica.",
                "data": {
                    "historial": []
                }
            }

        registros = []

        for registro in historial:

            registros.append({

                "fecha": registro.fecha,

                "medico": (
                    f"{registro.id_medico.nombre} "
                    f"{registro.id_medico.apellido}"
                ),

                "diagnostico": registro.diagnostico,

                "tratamiento": registro.tratamiento,

                "observaciones": registro.observaciones

            })

        return {

            "success": True,

            "message": "Historial clínico encontrado.",

            "data": {
                "historial": registros
            }

        }