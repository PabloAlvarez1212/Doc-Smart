import json,time,os
from pathlib import Path
os.chdir(Path(__file__).resolve().parents[2])
import requests
rows=[]
for url in ['https://docsmart.site/','https://docsmart.site/login','https://api.docsmart.site/']:
    for repeat in range(2):
        start=time.perf_counter()
        try:
            with requests.get(url,stream=True,timeout=(8,20)) as response:
                headers=time.perf_counter();size=0;first=None
                for chunk in response.iter_content(1024):
                    if chunk and first is None:first=time.perf_counter()
                    size+=len(chunk)
                rows.append({'url':url,'repeat':repeat,'status':response.status_code,'headers_ms':round((headers-start)*1000,2),'first_byte_ms':round(((first or headers)-start)*1000,2),'complete_ms':round((time.perf_counter()-start)*1000,2),'bytes':size})
        except Exception as exc:rows.append({'url':url,'repeat':repeat,'error_type':type(exc).__name__})
report={'scope':'public HTTP only; not authenticated Bymax latency; no deployment performed','rows':rows}
Path('docs/benchmarks/bymax/production-public-run.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report,indent=2))
