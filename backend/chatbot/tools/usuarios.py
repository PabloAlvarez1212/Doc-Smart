from chatbot.ai.context_manager import describir_contexto
from chatbot.services.perfil_usuario_service import PerfilUsuarioService
from chatbot.tools.base_tool import BaseTool


class ConsultarPerfilTool(BaseTool):
    name = "consultar_perfil"
    description = "Consulta datos seguros del perfil del usuario autenticado."
    category = "usuarios"
    requires_authentication = True
    requires_confirmation = False
    enabled = True

    def execute(self, chat, mensaje, parametros):
        tipo = (parametros.get("tipo") or "perfil").lower()
        usuario = chat.id_usuario
        if tipo == "nombre":
            respuesta = PerfilUsuarioService.responder_nombre(usuario)
        elif tipo == "edad":
            respuesta = PerfilUsuarioService.responder_edad(usuario)
        elif tipo == "fecha_nacimiento":
            respuesta = PerfilUsuarioService.responder_fecha_nacimiento(usuario)
        elif tipo == "nombre_edad":
            respuesta = (
                f"{PerfilUsuarioService.responder_nombre(usuario)} "
                f"{PerfilUsuarioService.responder_edad(usuario)}"
            )
        elif tipo == "memoria":
            respuesta = (
                f"{PerfilUsuarioService.describir_perfil(usuario)}\n\n"
                f"{describir_contexto(chat)}"
            )
        else:
            respuesta = PerfilUsuarioService.describir_perfil(usuario)
        return respuesta
