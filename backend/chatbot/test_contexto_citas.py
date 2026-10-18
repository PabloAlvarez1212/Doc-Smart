import json
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from chatbot.ai.flow_manager import FlowManager
from chatbot.ai.language import LanguageService
from chatbot.ai.router import procesar_mensaje
from chatbot.ai.conversation_manager import ConversationManager
from chatbot.ai.router_decision import RouterDecision
from chatbot.ai.conversation_flow import ConversationFlow


class ContextoCitasTests(SimpleTestCase):
    @patch('chatbot.ai.router.procesar_mensaje')
    def test_retry_reprogramacion_extrae_fecha_nueva_con_campos_completos(self, router):
        chat = SimpleNamespace(estado_conversacion='reprogramar_cita', contexto_temporal={
            'codigo_cita': 'DOC-A7B2C9D4', 'fecha': '2030-10-20T10:00:00-05:00'}, save=MagicMock())
        router.return_value = RouterDecision(tool=True, tool_name='reprogramar_cita', parametros={'fecha': '2030-10-21T11:00:00-05:00'})
        decision = FlowManager.continuar(chat, 'Mejor el 21 de octubre a las 11')
        self.assertEqual(decision.parametros['fecha'], '2030-10-21T11:00:00-05:00')
        self.assertEqual(decision.parametros['codigo_cita'], 'DOC-A7B2C9D4')

    @patch('chatbot.ai.router.preguntar_openai', return_value='Consulta clínica conservada')
    def test_fallback_no_convierte_pregunta_clinica_en_orden(self, generador):
        decision = procesar_mensaje([], 'Tengo fiebre, ¿debo cancelar la consulta?')
        self.assertFalse(decision.usa_flujo)
        self.assertEqual(decision.respuesta, 'Consulta clínica conservada')
        generador.assert_called_once()

    @patch('chatbot.ai.conversation_manager.extraer_y_guardar_memoria')
    @patch('chatbot.ai.conversation_manager.procesar_mensaje')
    def test_yes_sin_pendiente_no_consulta_modelo(self, router, memoria):
        chat = SimpleNamespace(id_medico_id=None, estado_conversacion='normal', contexto_temporal={}, save=MagicMock())
        self.assertIn('No hay una operación pendiente', ConversationManager.procesar(chat, 'yes'))
        router.assert_not_called()

    @patch('chatbot.ai.router.procesar_mensaje')
    def test_cambiar_hora_conserva_doctor_y_renueva_confirmacion(self, router):
        chat = SimpleNamespace(estado_conversacion='confirmar:agendar_cita', save=MagicMock(),
                               contexto_temporal={'id_medico': 2, 'fecha': '2030-10-06T14:00:00-05:00'})
        router.return_value = RouterDecision(tool=True, tool_name='agendar_cita', parametros={'fecha': '2030-10-06T15:00:00-05:00'})
        resultado = FlowManager.continuar(chat, 'mejor a las 15:00')
        self.assertEqual(resultado.parametros['id_medico'], 2)
        self.assertEqual(resultado.parametros['fecha'], '2030-10-06T15:00:00-05:00')
        self.assertNotIn('confirmado', resultado.parametros)

    def test_finalizar_conserva_idioma_no_confirmacion(self):
        chat = SimpleNamespace(estado_conversacion='confirmar:agendar_cita', save=MagicMock(),
                               contexto_temporal={'_idioma': 'en', 'id_medico': 2, 'confirmado': True})
        ConversationFlow.finalizar(chat)
        self.assertEqual(chat.contexto_temporal, {'_idioma': 'en'})

    @patch('chatbot.ai.router.obtener_cliente')
    def test_busqueda_filtrada_pasa_por_extraccion(self, cliente):
        cliente.return_value.responses.create.return_value.output_text = json.dumps({
            'accion': 'tool', 'tool': 'buscar_medico',
            'parametros': {'nombre': 'Ana', 'ciudad': 'Bogotá'},
        })
        decision = procesar_mensaje([], 'Busca médicos Ana en Bogotá')
        self.assertEqual(decision.parametros['nombre'], 'Ana')
        cliente.assert_called_once()

    @patch('chatbot.ai.router.obtener_cliente')
    def test_modelo_no_puede_confirmar_operacion(self, cliente):
        cliente.return_value.responses.create.return_value.output_text = json.dumps({
            'accion': 'tool', 'tool': 'cancelar_cita',
            'parametros': {'id_cita': 7, 'confirmado': True},
        })
        decision = procesar_mensaje([], 'Cancela mi cita 7')
        self.assertNotIn('confirmado', decision.parametros)

    @patch('chatbot.ai.router.obtener_cliente')
    def test_historial_conserva_sintomas_anteriores(self, cliente):
        cliente.return_value.responses.create.return_value.output_text = '{"accion":"tool","tool":"buscar_medico"}'
        historial = [{'role': 'user', 'parts': [{'text': 'dolor intenso persistente'}]}]
        historial += [{'role': 'model', 'parts': [{'text': 'continuación'}]}] * 15
        procesar_mensaje(historial, 'Busca a Ana Pérez')
        self.assertIn('dolor intenso persistente', str(cliente.return_value.responses.create.call_args))

    @patch('chatbot.ai.language.obtener_cliente')
    def test_si_no_dispara_traduccion(self, cliente):
        self.assertEqual(LanguageService.adaptar('Cita confirmada.', 'sí'), 'Cita confirmada.')
        cliente.assert_not_called()

    def test_seleccion_sin_fecha_pide_dato_faltante(self):
        chat = SimpleNamespace(estado_conversacion='seleccionar_medico:agendar_cita', save=MagicMock(),
                               contexto_temporal={'medicos': [{'id_medico': 2, 'nombre': 'Ana'}]})
        resultado = FlowManager.continuar(chat, '1')
        self.assertIsInstance(resultado, str)
        self.assertIn('fecha', resultado)
        self.assertEqual(chat.contexto_temporal['id_medico'], 2)

    def test_extraer_codigo_cita_alfanumerico(self):
        codigo = FlowManager._extraer_codigo_cita(
            "Quiero cancelar mi cita doc-a7b2c9d4"
        )
        self.assertEqual(
            codigo,
            "DOC-A7B2C9D4",
        )
    def test_codigo_cita_invalido(self):
        self.assertIsNone(
            FlowManager._extraer_codigo_cita(
                "Quiero cancelar la cita 12"
            )
        )
        self.assertIsNone(
            FlowManager._extraer_codigo_cita(
                "DOC-123"
            )
        )
    def test_flujo_cancelacion_solicita_codigo(self):
        chat = SimpleNamespace(
            estado_conversacion="normal",
            contexto_temporal={},
            save=MagicMock(),
        )
        respuesta = FlowManager.iniciar(
            chat,
            "cancelar_cita",
        )
        self.assertIn(
            "código",
            respuesta.lower(),
        )
        respuesta = FlowManager.continuar(
            chat,
            "Mi código es DOC-A7B2C9D4",
        )
        # Ahora ByMax debe solicitar el motivo.
        self.assertIsInstance(
            respuesta,
            str,
        )
        self.assertIn(
            "motivo",
            respuesta.lower(),
        )
        respuesta = FlowManager.continuar(
            chat,
            "No podré asistir por motivos laborales.",
        )
        # Ahora sí debe devolver la decisión
        # para ejecutar la herramienta.
        self.assertIsInstance(
            respuesta,
            RouterDecision,
        )
        self.assertEqual(
            respuesta.tool_name,
            "cancelar_cita",
        )
        self.assertEqual(
            respuesta.parametros["codigo_cita"],
            "DOC-A7B2C9D4",
        )
        self.assertEqual(
            respuesta.parametros["motivo_cancelacion"],
            "No podré asistir por motivos laborales.",
        )
        # El usuario todavía no ha confirmado
        # la cancelación.
        self.assertFalse(
            respuesta.parametros.get("confirmado", False)
        )

    def test_cancelacion_codigo_y_motivo_obligatorio(self):
        chat = SimpleNamespace(
            estado_conversacion="normal",
            contexto_temporal={},
            save=MagicMock(),
        )
        # Tenemos el código, pero falta el motivo.
        respuesta = FlowManager.iniciar(
            chat,
            "cancelar_cita",
            {
                "codigo_cita": "DOC-A7B2C9D4"
            },
        )
        self.assertIn("motivo", respuesta.lower())
        # Un simple "Sí" no es un motivo válido.
        respuesta = FlowManager.continuar(
            chat,
            "Sí",
        )
        self.assertIn("motivo", respuesta.lower())
        # El paciente proporciona el motivo.
        resultado = FlowManager.continuar(
            chat,
            "No podré asistir por motivos laborales.",
        )
        self.assertIsInstance(
            resultado,
            RouterDecision,
        )
        self.assertEqual(
            resultado.parametros["codigo_cita"],
            "DOC-A7B2C9D4",
        )
        self.assertEqual(
            resultado.parametros["motivo_cancelacion"],
            "No podré asistir por motivos laborales.",
        )
        self.assertNotIn(
            "confirmado",
            resultado.parametros,
        )
