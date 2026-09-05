import logging
import time

from chatbot.ai.language import LanguageService
from chatbot.ai.tool_executor import ejecutar_tool
from chatbot.models import ToolLog


logger = logging.getLogger(__name__)

CLAVES_PARAMETROS_AUDITABLES = {
    'apellido',
    'ciudad',
    'confirmado',
    'especialidad',
    'fecha',
    'fecha_programada',
    'id_cita',
    'id_medico',
    'limite',
    'nombre',
    'tipo',
}
NOMBRES_TOOL_AUDITABLES = {
    'agendar_cita',
    'buscar_medico',
    'cancelar_cita',
    'consultar_disponibilidad',
    'consultar_historial',
    'consultar_perfil',
    'reprogramar_cita',
}


class ToolManager:

    @staticmethod
    def _nombre_tool_auditable(nombre_tool):
        if isinstance(nombre_tool, str) and nombre_tool in NOMBRES_TOOL_AUDITABLES:
            return nombre_tool
        return 'tool_desconocida'

    @staticmethod
    def _valores_respuesta(valor):
        if isinstance(valor, dict):
            valores = []
            for elemento in valor.values():
                valores.extend(ToolManager._valores_respuesta(elemento))
            return valores
        if isinstance(valor, (list, tuple)):
            valores = []
            for elemento in valor:
                valores.extend(ToolManager._valores_respuesta(elemento))
            return valores
        return [valor] if valor not in (None, '', True, False) else []

    @staticmethod
    def _localizar(respuesta, mensaje):
        if isinstance(respuesta, dict) and isinstance(respuesta.get('message'), str):
            respuesta = dict(respuesta)
            valores = ToolManager._valores_respuesta(respuesta.get('data', {}))
            respuesta['message'] = LanguageService.adaptar(
                respuesta['message'], mensaje, valores
            )
        elif isinstance(respuesta, str):
            respuesta = LanguageService.adaptar(respuesta, mensaje)
        return respuesta

    @staticmethod
    def _resumir_parametros(parametros):
        if not isinstance(parametros, dict):
            return {'tipo': type(parametros).__name__, 'cantidad': 0}
        claves = sorted(
            str(clave)
            for clave in parametros
            if clave in CLAVES_PARAMETROS_AUDITABLES
        )
        return {
            'claves_permitidas': claves,
            'cantidad': len(parametros),
        }

    @staticmethod
    def _resumir_respuesta(respuesta):
        resumen = {'tipo': type(respuesta).__name__}
        if isinstance(respuesta, dict):
            resumen['correcto'] = bool(respuesta.get('success', True))
            resumen['requiere_confirmacion'] = bool(
                respuesta.get('requires_confirmation', False)
            )
            resumen['requiere_seleccion'] = bool(
                respuesta.get('requires_selection', False)
            )
        return resumen

    @staticmethod
    def _registrar_log(**datos):
        try:
            ToolLog.objects.create(**datos)
        except Exception as error:
            logger.error(
                'No se pudo guardar auditoria de herramienta tipo=%s tool=%s',
                type(error).__name__,
                datos.get('nombre_tool'),
            )

    @staticmethod
    def ejecutar(nombre_tool, chat, mensaje, parametros):
        inicio = time.monotonic()

        try:
            respuesta = ejecutar_tool(
                nombre_tool=nombre_tool,
                chat=chat,
                mensaje=mensaje,
                parametros=parametros,
            )
            respuesta = ToolManager._localizar(respuesta, mensaje)
            ToolManager._registrar_log(
                usuario=chat.id_usuario,
                nombre_tool=ToolManager._nombre_tool_auditable(nombre_tool),
                parametros=ToolManager._resumir_parametros(parametros),
                respuesta=ToolManager._resumir_respuesta(respuesta),
                correcto=True,
                latencia=time.monotonic() - inicio,
            )
            return respuesta

        except Exception as error:
            ToolManager._registrar_log(
                usuario=chat.id_usuario,
                nombre_tool=ToolManager._nombre_tool_auditable(nombre_tool),
                parametros=ToolManager._resumir_parametros(parametros),
                respuesta={
                    'tipo': 'error',
                    'error_tipo': type(error).__name__,
                },
                correcto=False,
                latencia=time.monotonic() - inicio,
            )
            raise
