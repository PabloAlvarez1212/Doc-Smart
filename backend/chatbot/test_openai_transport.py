from threading import Event
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings
from chatbot.ai import openai_service as service


class OpenAITransportTests(SimpleTestCase):
    contents = [{'role': 'user', 'parts': [{'text': 'Hola'}]}]

    def setUp(self):
        cached = getattr(service, '_cliente_compartido', None)
        if cached:
            cached.cache_clear()

    def tearDown(self):
        self.setUp()

    @override_settings(OPENAI_API_KEY='test-key')
    def test_reuses_client_and_changes_with_key(self):
        with patch.object(service, 'OpenAI', side_effect=[MagicMock(), MagicMock()]) as factory:
            first = service.obtener_cliente()
            self.assertIs(service.obtener_cliente(), first)
            with override_settings(OPENAI_API_KEY='other-key'):
                self.assertIsNot(service.obtener_cliente(), first)
            self.assertEqual(factory.call_count, 2)
            factory.assert_any_call(api_key='test-key', timeout=30.0, max_retries=0)

    def test_closes_finished_stream_and_preserves_request(self):
        stream = MagicMock()
        stream.__iter__.return_value = iter([SimpleNamespace(type='response.output_text.delta', delta='Hola')])
        client = MagicMock()
        client.responses.create.return_value = stream
        with patch.object(service, 'obtener_cliente', return_value=client):
            self.assertEqual(list(service.preguntar_openai_stream(self.contents)), ['Hola'])
        stream.close.assert_called_once_with()
        client.close.assert_not_called()
        request = client.responses.create.call_args.kwargs
        self.assertEqual(request['max_output_tokens'], 1000)
        self.assertFalse(request['store'])
        self.assertEqual(request['model'], service.OPENAI_MODEL)
        self.assertEqual(request['instructions'], service.SYSTEM_PROMPT)

    def test_precancelled_request_never_opens_stream(self):
        cancel = Event()
        cancel.set()
        with patch.object(service, 'obtener_cliente') as factory:
            self.assertEqual(list(service.preguntar_openai_stream(self.contents, cancel_event=cancel)), [])
        factory.assert_not_called()

    def test_cancel_after_delta_closes_stream(self):
        cancel = Event()
        stream = MagicMock()
        stream.__iter__.return_value = iter([SimpleNamespace(type='response.output_text.delta', delta='Hola'), SimpleNamespace(type='response.output_text.delta', delta='otra')])
        client = MagicMock()
        client.responses.create.return_value = stream
        with patch.object(service, 'obtener_cliente', return_value=client):
            iterator = service.preguntar_openai_stream(self.contents, cancel_event=cancel)
            self.assertEqual(next(iterator), 'Hola')
            cancel.set()
            self.assertEqual(list(iterator), [])
        stream.close.assert_called_once_with()
        client.responses.create.assert_called_once()

    def test_late_transient_error_does_not_repeat_text(self):
        def events():
            yield SimpleNamespace(type='response.output_text.delta', delta='Hola')
            raise service.APIConnectionError(request=MagicMock())
        stream = MagicMock()
        stream.__iter__.return_value = events()
        client = MagicMock()
        client.responses.create.return_value = stream
        with patch.object(service, 'obtener_cliente', return_value=client):
            iterator = service.preguntar_openai_stream(self.contents)
            self.assertEqual(next(iterator), 'Hola')
            with self.assertRaises(service.APIConnectionError):
                next(iterator)
        stream.close.assert_called_once_with()
        client.responses.create.assert_called_once()

    def test_cancellation_interrupts_retry_backoff(self):
        cancel = MagicMock()
        cancel.is_set.return_value = False
        cancel.wait.return_value = True
        client = MagicMock()
        client.responses.create.side_effect = service.APIConnectionError(request=MagicMock())
        with patch.object(service, 'obtener_cliente', return_value=client):
            self.assertEqual(list(service.preguntar_openai_stream(self.contents, cancel_event=cancel)), [])
        cancel.wait.assert_called_once_with(1.5)
        client.responses.create.assert_called_once()
