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
