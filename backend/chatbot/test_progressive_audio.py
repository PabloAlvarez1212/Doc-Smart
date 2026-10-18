from types import SimpleNamespace
from unittest.mock import Mock, patch
from asgiref.sync import async_to_sync
from django.test import TestCase, override_settings
from rest_framework.test import APIRequestFactory, force_authenticate
from chatbot import test_medico as fixtures
from chatbot.views import BymaxVoiceView

class ProgressiveAudioTests(TestCase):
    setUpTestData = classmethod(fixtures.BymaxMedicoTests.setUpTestData.__func__)

    def test_streaming_audio_is_async_and_does_not_wait_for_completion(self):
        consumed=[]
        async def chunks():
            consumed.append('first');yield b'ID3-first'
            consumed.append('last');yield b'last'
        request=APIRequestFactory().post('/api/chatbot/voz/',{'texto':'Hola.','stream':True},format='json')
        force_authenticate(request,user=self.pacientes[0])
        with patch('chatbot.views.generar_audio_bymax_stream',create=True,return_value=chunks()),patch('chatbot.views.generar_audio_bymax',return_value=b'complete'):
            response=BymaxVoiceView.as_view()(request)
        self.assertTrue(response.streaming)
        self.assertTrue(response.is_async)
        self.assertEqual(consumed,[])
        async def first():
            iterator=response.streaming_content
            self.assertEqual(await anext(iterator),b'ID3-first')
            self.assertEqual(consumed,['first'])
            await iterator.aclose()
        async_to_sync(first)()
        self.assertEqual(response['X-Accel-Buffering'],'no')

    def test_legacy_blob_audio_remains_supported(self):
        request=APIRequestFactory().post('/api/chatbot/voz/',{'texto':'Hola.'},format='json')
        force_authenticate(request,user=self.pacientes[0])
        with patch('chatbot.views.generar_audio_bymax',return_value=b'complete'):
            response=BymaxVoiceView.as_view()(request)
        self.assertFalse(response.streaming)
        self.assertEqual(response.content,b'complete')

    def test_stream_service_yields_before_consuming_full_upstream_and_closes(self):
        from chatbot.ai.elevenlabs_service import generar_audio_bymax_stream
        consumed=[]
        def upstream():
            consumed.append('first');yield b'first'
            consumed.append('last');yield b'last'
        response=Mock()
        response.iter_content.return_value=upstream()
        with patch('chatbot.ai.elevenlabs_service._solicitar_audio',return_value=response):
            stream=generar_audio_bymax_stream('Hola.')
        self.assertEqual(consumed,[])
        async def consume():
            self.assertEqual(await anext(stream),b'first')
            self.assertEqual(consumed,['first'])
            await stream.aclose()
        async_to_sync(consume)()
        response.close.assert_called_once()

    def test_streaming_voice_still_requires_authentication(self):
        request=APIRequestFactory().post('/api/chatbot/voz/',{'texto':'Hola.','stream':True},format='json')
        with patch('chatbot.views.generar_audio_bymax_stream') as synthesize:
            response=BymaxVoiceView.as_view()(request)
        self.assertIn(response.status_code,[401,403])
        synthesize.assert_not_called()

    def test_upstream_failure_keeps_http_error_before_audio_headers(self):
        from chatbot.ai.elevenlabs_service import ElevenLabsError
        request=APIRequestFactory().post('/api/chatbot/voz/',{'texto':'Hola.','stream':True},format='json')
        force_authenticate(request,user=self.pacientes[0])
        with patch('chatbot.views.generar_audio_bymax_stream',side_effect=ElevenLabsError('Unavailable',503)):
            response=BymaxVoiceView.as_view()(request)
        self.assertEqual(response.status_code,503)
        self.assertFalse(response.streaming)
