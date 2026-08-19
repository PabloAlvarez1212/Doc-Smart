from chatbot.ai.tool_definition import ToolDefinition

from chatbot.tools.citas import (
    ConsultarDisponibilidadTool,
    AgendarCitaTool,
    ReprogramarCitaTool,
    CancelarCitaTool,
)

from chatbot.tools.medicos import (
    BuscarMedicoTool
)

from chatbot.tools.historial import (
    ConsultarHistorialTool
)
from chatbot.tools.usuarios import ConsultarPerfilTool

TOOLS = {

    "consultar_perfil": ToolDefinition(
        nombre="consultar_perfil",
        descripcion=(
            "Consulta exclusivamente el perfil y la memoria del usuario "
            "autenticado. Parámetro tipo: nombre, edad, fecha_nacimiento, "
            "nombre_edad, perfil o memoria. Úsala en cualquier idioma para "
            "preguntas como "
            "mi nombre, mi edad, mis datos o todo lo que sabes de mí."
        ),
        funcion=ConsultarPerfilTool(),
        categoria="usuarios",
    ),

    "consultar_disponibilidad": ToolDefinition(
        nombre="consultar_disponibilidad",
        descripcion=(
            "Consulta las próximas citas médicas del usuario autenticado "
            "e incluye el id necesario para reprogramarlas o cancelarlas."
        ),
        funcion=ConsultarDisponibilidadTool(),
        categoria="citas",
    ),

    "agendar_cita": ToolDefinition(
        nombre="agendar_cita",
        descripcion=(
            "Solicita una cita nueva. Usa fecha en formato ISO y filtros "
            "del médico como especialidad, ciudad, nombre o id_medico."
        ),
        funcion=AgendarCitaTool(),
        categoria="citas",
        requiere_confirmacion=True,
    ),

    "reprogramar_cita": ToolDefinition(
        nombre="reprogramar_cita",
        descripcion=(
            "Reprograma una cita del paciente autenticado; "
            "requiere el id de la cita y la nueva fecha."
        ),
        funcion=ReprogramarCitaTool(),
        categoria="citas",
        requiere_confirmacion=True,
    ),

    "cancelar_cita": ToolDefinition(
        nombre="cancelar_cita",
        descripcion=(
            "Cancela una cita del paciente autenticado; "
            "requiere el id de la cita."
        ),
        funcion=CancelarCitaTool(),
        categoria="citas",
        requiere_confirmacion=True,
    ),
    
    "buscar_medico":

        ToolDefinition(

            nombre="buscar_medico",

            descripcion=(
                "Busca médicos por nombre, especialidad o ciudad."
            ),

            funcion=BuscarMedicoTool(),

            categoria="medicos"

        ),

    "consultar_historial":

        ToolDefinition(

            nombre="consultar_historial",

            descripcion=(
                "Consulta el historial clínico del usuario autenticado."
            ),

            funcion=ConsultarHistorialTool(),

            categoria="historial"

        ),

}
