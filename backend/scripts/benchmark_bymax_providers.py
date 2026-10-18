import argparse,asyncio,json,os,sys,time
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument("--live-providers",action="store_true",required=True,help="Explicitly permit synthetic requests to configured paid providers")
parser.add_argument("--output",default="docs/benchmarks/bymax/providers-run.json")
args=parser.parse_args()
os.chdir(Path(__file__).resolve().parents[2])
sys.path.insert(0,str(Path('backend').resolve()))
os.environ.setdefault('DJANGO_SETTINGS_MODULE','core.test_settings')
import django
django.setup()
from chatbot.ai.openai_service import preguntar_openai_stream
from chatbot.ai.elevenlabs_service import generar_audio_bymax_stream
result={'kind':'live_providers_from_local_host','synthetic_input':True,'production_authenticated':False,'browser_playback_measured':False,'openai':[],'elevenlabs':[]}
contents=[{'role':'user','parts':[{'text':'Explica brevemente cómo consultar mis citas en DocSmart, sin afirmar que consultaste datos.'}]}]
for repetition in range(3):
    start=time.perf_counter();first=None;count=0
    try:
        for fragment in preguntar_openai_stream(contents):
            count+=1
            if first is None:first=time.perf_counter()-start
        result['openai'].append({'first_text_ms':round(first*1000,2) if first else None,'complete_ms':round((time.perf_counter()-start)*1000,2),'fragments':count})
    except Exception as error:result['openai'].append({'error_type':type(error).__name__})
    start=time.perf_counter()
    try:
        stream=generar_audio_bymax_stream('Hola. Soy Bymax, el asistente de DocSmart.')
        async def consume():
            first=None;size=0
            async for chunk in stream:
                if first is None:first=time.perf_counter()-start
                size+=len(chunk)
            return first,size
        first,size=asyncio.run(consume())
        result['elevenlabs'].append({'first_audio_byte_ms':round(first*1000,2) if first else None,'complete_ms':round((time.perf_counter()-start)*1000,2),'bytes':size})
    except Exception as error:result['elevenlabs'].append({'error_type':type(error).__name__})
Path(args.output).write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))
