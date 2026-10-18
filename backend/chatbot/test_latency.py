"""Repeatable application benchmark; provider timings below are simulated, not SLA evidence."""
import json
import os
import time
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from unittest import skipUnless
from uuid import uuid4
from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from django.db import connection
from django.test import TransactionTestCase, override_settings
from django.test.utils import CaptureQueriesContext
from chatbot import test_medico as fixtures
from chatbot.models import Chat
from chatbot.consumers import BymaxConsumer
from chatbot.ai.conversation_manager import ConversationManager


@override_settings(CACHES=fixtures.TEST_CACHES, CHANNEL_LAYERS=fixtures.TEST_CHANNEL_LAYERS)
class ApplicationLatencyBenchmark(TransactionTestCase):
    @skipUnless(os.environ.get('BYMAX_RUN_BENCHMARK') == '1', 'Run explicitly with BYMAX_RUN_BENCHMARK=1')
    def test_measure(self):
        fixtures.BymaxMedicoTests.setUpTestData.__func__(type(self))
        records=[]
        original=ConversationManager.procesar
        for scenario, message in [('conversation','¿Cómo funciona DocSmart?'),('clinical','Tengo fiebre y dolor de cabeza.'),('memory','Recuerda que prefiero respuestas claras.'),('data','¿Cuál es mi nombre?'),('appointments','Muéstrame todos los médicos disponibles')]:
            for repetition in range(3):
                chat=Chat.objects.create(id_usuario=self.pacientes[0])
                metrics={'scenario':scenario,'repetition':repetition,'provider_calls':0}
                def create(**kwargs):
                    metrics['provider_calls']+=1
                    if kwargs.get('stream'):
                        def chunks():
                            time.sleep(.08)
                            for index,part in enumerate(['En DocSmart puedes consultar tus citas. ', 'Revisa la sección Mis citas. ', 'Los cambios requieren confirmación.']):
                                if index:time.sleep(.06)
                                yield SimpleNamespace(type='response.output_text.delta',delta=part)
                        return chunks()
                    time.sleep(.08)
                    return SimpleNamespace(output_text='{"accion":"openai"}')
                client=SimpleNamespace(responses=SimpleNamespace(create=create))
                def prepare(*args,**kwargs):
                    start=time.perf_counter()
                    with CaptureQueriesContext(connection) as queries:result=original(*args,**kwargs)
                    metrics['preparation_ms']=round((time.perf_counter()-start)*1000,2)
                    metrics['preparation_queries']=len(queries)
                    return result
                async def measure():
                    async def application(scope,receive,send):
                        scope.update(user=self.pacientes[0],url_route={'kwargs':{'id_chat':chat.pk}})
                        await BymaxConsumer.as_asgi()(scope,receive,send)
                    socket=WebsocketCommunicator(application,'/ws/chatbot/')
                    self.assertTrue((await socket.connect())[0]);await socket.receive_json_from()
                    start=time.perf_counter();first=None
                    await socket.send_json_to({'tipo':'mensaje','mensaje':message,'request_id':str(uuid4())})
                    while True:
                        event=await socket.receive_json_from(timeout=10)
                        if event['tipo']=='texto' and first is None:first=time.perf_counter()-start
                        if event['tipo']=='fin':break
                        self.assertNotEqual(event['tipo'],'error')
                    metrics['first_text_ms']=round(first*1000,2)
                    metrics['complete_ms']=round((time.perf_counter()-start)*1000,2)
                    await socket.disconnect()
                with patch('chatbot.ai.openai_service.obtener_cliente',return_value=client),patch('chatbot.ai.router.obtener_cliente',return_value=client),patch('chatbot.ai.memory_extractor.obtener_cliente',return_value=client),patch('chatbot.ai.language.obtener_cliente',return_value=client),patch('chatbot.consumers.ConversationManager.procesar',side_effect=prepare):
                    async_to_sync(measure)()
                records.append(metrics)
        report={'kind':'controlled_application_replay','provider_simulated':True,'configured_delays_ms':{'router_or_extractor':80,'model_first_delta':80,'subsequent_delta':60},'database':'temporary SQLite','records':records}
        target=Path(os.environ.get('BYMAX_BENCHMARK_OUTPUT',str(Path(__file__).resolve().parents[2] / 'docs/benchmarks/bymax/application-run.json')))
        target.parent.mkdir(parents=True,exist_ok=True);target.write_text(json.dumps(report,indent=2),encoding='utf-8')
        print(json.dumps(report,indent=2))
