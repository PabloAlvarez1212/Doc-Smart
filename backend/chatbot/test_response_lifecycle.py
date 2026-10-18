import asyncio
from threading import Event
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from django.test import SimpleTestCase
from chatbot.consumers import BymaxConsumer, _respuesta_contexto
from chatbot.ai import router


class BymaxResponseLifecycleTests(SimpleTestCase):
    async def test_retransmission_preserves_active_generation(self):
        consumer = BymaxConsumer()
        consumer.scope = {'user': SimpleNamespace(is_authenticated=True)}
        consumer.send_json = AsyncMock()
        task = asyncio.create_task(asyncio.sleep(30))
        consumer.tarea_respuesta = task
        state = {'response_id': 'old', 'request_id': 'same', 'mensaje': 'Hola', 'cancel_event': Event(), 'cola': None}
        consumer.respuesta_actual = state
        consumer._responder = AsyncMock()
        try:
            with patch('chatbot.consumers.ActorScopedRateThrottle') as throttle:
                throttle.return_value.allow_request.return_value = True
                await consumer.receive_json({'mensaje': 'Hola', 'request_id': 'same'})
                await consumer.receive_json({'mensaje': 'diferente', 'request_id': 'same'})
            self.assertFalse(state['cancel_event'].is_set())
            consumer._responder.assert_not_called()
            self.assertIs(consumer.respuesta_actual, state)
            self.assertEqual(consumer.send_json.await_args.args[0]['tipo'], 'error')
        finally:
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)

    async def test_disconnect_preserves_generation(self):
        consumer = BymaxConsumer()
        cancel = Event()
        consumer.respuesta_actual = {'cancel_event': cancel}
        await consumer.disconnect(1006)
        self.assertFalse(cancel.is_set())
        self.assertTrue(consumer.desconectado)
    async def test_new_message_cancels_old_response_and_starts_new(self):
        consumer = BymaxConsumer()
        consumer.scope = {'user': SimpleNamespace(is_authenticated=True)}
        consumer.send_json = AsyncMock()
        old_task = asyncio.create_task(asyncio.sleep(30))
        consumer.tarea_respuesta = old_task
        consumer.respuesta_actual = {'response_id': 'old', 'request_id': 'old-request', 'cancel_event': Event(), 'cola': None}
        old = consumer.respuesta_actual
        consumer._responder = AsyncMock()
        with patch('chatbot.consumers.ActorScopedRateThrottle') as throttle:
            throttle.return_value.allow_request.return_value = True
            await consumer.receive_json({'mensaje': 'otra pregunta', 'request_id': 'new-request'})
        await asyncio.sleep(0)
        self.assertTrue(old['cancel_event'].is_set())
        consumer._responder.assert_awaited_once()
        self.assertNotEqual(consumer.respuesta_actual['response_id'], old['response_id'])
        self.assertFalse(old_task.cancelled())
        old_task.cancel()
        await asyncio.gather(old_task, return_exceptions=True)

    async def test_cancel_with_stale_id_does_not_cancel_current_response(self):
        consumer = BymaxConsumer()
        consumer.scope = {}
        consumer.send_json = AsyncMock()
        state = {'response_id': 'current', 'request_id': 'request', 'cancel_event': Event(), 'cola': None}
        consumer.respuesta_actual = state
        await consumer.receive_json({'tipo': 'cancelar', 'response_id': 'obsolete'})
        self.assertFalse(state['cancel_event'].is_set())
        await consumer.receive_json({'tipo': 'cancelar', 'response_id': 'current'})
        self.assertTrue(state['cancel_event'].is_set())

    async def test_stream_passes_cancel_event_and_preserves_prompt(self):
        consumer = BymaxConsumer()
        consumer.chat = SimpleNamespace(id_medico_id=None)
        consumer.send_json = AsyncMock()
        cancel = Event()
        state = {'response_id': 'response', 'request_id': 'request', 'cancel_event': cancel, 'cola': None}
        with patch('chatbot.consumers.preguntar_openai_stream', return_value=iter(['Hola'])) as stream:
            self.assertEqual(await consumer._transmitir_openai([], state), 'Hola')
        stream.assert_called_once_with([], cancel_event=cancel)

    async def test_cancel_ack_uses_original_response_identifiers(self):
        consumer = BymaxConsumer()
        consumer.scope = {}
        consumer.respuesta_actual = {'response_id': 'current', 'request_id': 'request', 'cancel_event': Event(), 'cola': None}
        with patch('channels.generic.websocket.AsyncJsonWebsocketConsumer.send_json', new_callable=AsyncMock) as send:
            await consumer.receive_json({'tipo': 'cancelar', 'response_id': 'current', 'request_id': 'request'})
        self.assertEqual(send.call_args.args[0]['response_id'], 'current')
        self.assertEqual(send.call_args.args[0]['request_id'], 'request')

    async def test_validation_error_contains_request_identifiers(self):
        consumer = BymaxConsumer()
        consumer.scope = {}
        with patch('channels.generic.websocket.AsyncJsonWebsocketConsumer.send_json', new_callable=AsyncMock) as send:
            await consumer.receive_json({'mensaje': '', 'request_id': 'request'})
        self.assertEqual(send.call_args.args[0]['request_id'], 'request')
        self.assertTrue(send.call_args.args[0]['response_id'])

    async def test_cancelled_operation_still_persists_completed_result(self):
        consumer = BymaxConsumer()
        consumer.scope = {'user': SimpleNamespace(pk=1)}
        consumer.id_chat = 1
        chat = SimpleNamespace(id_medico_id=None)
        consumer._obtener_chat = AsyncMock(return_value=chat)
        consumer._guardar_mensaje_usuario = AsyncMock()
        consumer._guardar_mensaje_bymax = AsyncMock()
        consumer.send_json = AsyncMock()
        state = {'response_id': 'response', 'request_id': 'request', 'cancel_event': Event(), 'cola': None}
        turn = SimpleNamespace(estado='procesando')
        def operation(*args, **kwargs):
            state['cancel_event'].set()
            return {'message': 'Cita confirmada', 'success': True, 'data': {'id_cita': 2}}
        with patch('chatbot.consumers.iniciar_turno', return_value=(turn, True)), patch('chatbot.consumers.ConversationManager.procesar', side_effect=operation) as process:
            await consumer._responder('confirmar', 'request', state)
        process.assert_called_once_with(chat, 'confirmar', streaming=True)
        self.assertEqual(consumer._guardar_mensaje_bymax.await_args.args[0], 'Cita confirmada')
        self.assertEqual(consumer._guardar_mensaje_bymax.await_args.args[1], turn)

    async def test_cancelled_context_discards_late_text(self):
        consumer = BymaxConsumer()
        cancel = Event()
        cancel.set()
        token = _respuesta_contexto.set({'response_id': 'old', 'request_id': 'old-request', 'cancel_event': cancel})
        try:
            with patch('channels.generic.websocket.AsyncJsonWebsocketConsumer.send_json', new_callable=AsyncMock) as send:
                await consumer.send_json({'tipo': 'texto', 'contenido': 'viejo'})
                send.assert_not_called()
        finally:
            _respuesta_contexto.reset(token)

    def test_persistence_keeps_response_clinical_context_after_new_message(self):
        from inspect import unwrap
        consumer = BymaxConsumer()
        original = SimpleNamespace(contexto_clinico_id=11)
        consumer.chat = SimpleNamespace(contexto_clinico_id=22)
        token = _respuesta_contexto.set({'chat': original})
        try:
            with patch('chatbot.consumers.Mensaje.objects.create') as create:
                unwrap(BymaxConsumer.__dict__["_guardar_mensaje_bymax"].func)(consumer, 'Respuesta anterior')
            self.assertIs(create.call_args.kwargs['id_chat'], original)
            self.assertEqual(create.call_args.kwargs['contexto_clinico'], 11)
        finally:
            _respuesta_contexto.reset(token)


class DocSmartHelpRouteTests(SimpleTestCase):
    def test_exact_help_stream_skips_router_request(self):
        with patch.object(router, 'obtener_cliente') as client:
            decision = router.procesar_mensaje([], '¿Qué puedes hacer en DocSmart?', streaming=True)
        client.assert_not_called()
        self.assertTrue(decision.parametros['__stream_openai__'])

    def test_help_with_appointment_details_still_routes(self):
        client = MagicMock()
        client.responses.create.return_value.output_text = '{"accion":"flujo","nombre":"agendar_cita","parametros":{}}'
        with patch.object(router, 'obtener_cliente', return_value=client):
            decision = router.procesar_mensaje([], 'Qué puedes hacer en DocSmart, agenda una cita mañana', streaming=True)
        client.responses.create.assert_called_once()
        self.assertTrue(decision.usa_flujo)
