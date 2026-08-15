from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from chatbot.serializers import CrearMensajeSerializer
from chatbot.ai.flow_manager import FlowManager
from chatbot.ai.router_decision import RouterDecision
from chatbot.tools.citas import (
    AgendarCitaTool,
    ConsultarDisponibilidadTool,
)
from chatbot.tools.medicos import BuscarMedicoTool


class CrearMensajeSerializerTests(SimpleTestCase):

    def test_es_bot_no_es_un_campo_aceptado(self):
        serializer = CrearMensajeSerializer(
            data={"contenido": "Hola", "es_bot": True}
        )

        self.assertTrue(serializer.is_valid())
        self.assertNotIn("es_bot", serializer.validated_data)


class ConsultarDisponibilidadToolTests(SimpleTestCase):

    @patch("chatbot.tools.citas.CitaService.obtener_proximas")
    def test_consulta_citas_desde_cita_service(self, obtener_proximas):
        citas = MagicMock()
        citas.exists.return_value = False
        obtener_proximas.return_value = citas
        chat = SimpleNamespace(id_usuario=object())

        resultado = ConsultarDisponibilidadTool().execute(
            chat=chat,
            mensaje="Muéstrame mis citas",
            parametros={},
        )

        obtener_proximas.assert_called_once_with(chat.id_usuario)
        self.assertTrue(resultado["success"])
        self.assertEqual(resultado["data"]["citas"], [])


class BuscarMedicoToolTests(SimpleTestCase):

    @patch("chatbot.tools.medicos.MedicoService.buscar_medicos")
    def test_envia_todos_los_filtros_al_servicio(self, buscar_medicos):
        medicos = MagicMock()
        medicos.exists.return_value = False
        buscar_medicos.return_value = medicos
        parametros = {
            "nombre": "Ana",
            "apellido": "Pérez",
            "especialidad": "Pediatría",
            "ciudad": "Bogotá",
        }

        BuscarMedicoTool().execute(
            chat=SimpleNamespace(id_usuario=object()),
            mensaje="Busca a Ana Pérez",
            parametros=parametros,
        )

        buscar_medicos.assert_called_once_with(**parametros)


class ConfirmacionTests(SimpleTestCase):

    @patch("chatbot.ai.flow_manager.ConversationFlow")
    def test_confirmacion_reconstruye_la_operacion(self, conversation_flow):
        chat = SimpleNamespace(estado_conversacion="confirmar:cancelar_cita")
        conversation_flow.obtener.return_value = {"id_cita": 15}

        decision = FlowManager.continuar(chat, "sí")

        self.assertIsInstance(decision, RouterDecision)
        self.assertEqual(decision.tool_name, "cancelar_cita")
        self.assertEqual(
            decision.parametros,
            {"id_cita": 15, "confirmado": True},
        )
        conversation_flow.finalizar.assert_called_once_with(chat)

    @patch("chatbot.ai.flow_manager.ConversationFlow")
    def test_respuesta_negativa_no_ejecuta_la_operacion(self, conversation_flow):
        chat = SimpleNamespace(estado_conversacion="confirmar:agendar_cita")

        resultado = FlowManager.continuar(chat, "no")

        self.assertIsInstance(resultado, str)
        conversation_flow.finalizar.assert_called_once_with(chat)


class AgendarCitaToolTests(SimpleTestCase):

    @patch("chatbot.tools.citas.CitaService.agendar")
    @patch("chatbot.tools.citas.CitaService.medico_tiene_cita", return_value=False)
    @patch("chatbot.tools.citas.MedicoService.obtener_por_id")
    @patch("chatbot.tools.citas.CitaService.normalizar_fecha")
    def test_solicita_confirmacion_antes_de_crear(
        self,
        normalizar_fecha,
        obtener_medico,
        _medico_tiene_cita,
        agendar,
    ):
        from django.utils import timezone

        normalizar_fecha.return_value = timezone.now() + timedelta(days=1)
        obtener_medico.return_value = SimpleNamespace(
            id=8,
            nombre="Ana",
            apellido="Pérez",
        )

        resultado = AgendarCitaTool().execute(
            chat=SimpleNamespace(id_usuario=SimpleNamespace(id=3)),
            mensaje="Agenda la cita",
            parametros={"id_medico": 8, "fecha": "2026-09-01 10:00"},
        )

        self.assertTrue(resultado["requires_confirmation"])
        agendar.assert_not_called()


class RouterTests(SimpleTestCase):

    @patch("chatbot.ai.router.client.models.generate_content")
    def test_router_recibe_el_historial_para_preguntas_de_seguimiento(
        self,
        generate_content,
    ):
        from chatbot.ai.router import procesar_mensaje

        generate_content.return_value = SimpleNamespace(
            text=(
                '{"accion":"tool","tool":"agendar_cita",'
                '"parametros":{"nombre":"Edilma",'
                '"apellido":"Echeverry",'
                '"fecha":"2026-08-24 10:00"}}'
            )
        )
        historial = [
            {
                "role": "user",
                "parts": [{"text": "Quiero una cita con Edilma Echeverry"}],
            },
            {
                "role": "user",
                "parts": [{"text": "¿Está disponible?"}],
            },
        ]

        decision = procesar_mensaje(historial, "¿Está disponible?")

        self.assertTrue(decision.usa_tool)
        self.assertEqual(decision.tool_name, "agendar_cita")
        self.assertEqual(
            generate_content.call_args.kwargs["contents"],
            historial,
        )


class RespuestaApiTests(SimpleTestCase):

    def test_resultado_de_tool_separa_texto_y_datos(self):
        from chatbot.views import normalizar_respuesta_bymax

        texto, resultado = normalizar_respuesta_bymax(
            {
                "success": True,
                "message": "Encontré disponibilidad.",
                "data": {"id_medico": 8},
            }
        )

        self.assertEqual(texto, "Encontré disponibilidad.")
        self.assertEqual(
            resultado,
            {"success": True, "data": {"id_medico": 8}},
        )
