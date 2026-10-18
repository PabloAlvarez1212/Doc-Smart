# Bymax voice benchmarks

`baseline.json` and `after.json` are simulations using the real speech segmenter/controller and a complete mock Blob. They do not measure real TTS, browser audio, or production latency. Run from the repository root:

```powershell
node frontend/scripts/benchmark-bymax.mjs --output docs/benchmarks/bymax/after.json
```

`browser.json` uses real Edge Audio events and MediaSource, with a valid synthetic MP3 served locally in 4096-byte chunks every 120 ms. `browser-before.json`, when present, replays the controller from recorded baseline revision `0387c23b00ea190680d52e7125e9841897c823e7` and waits for a complete Blob using the same local transfer. This baseline replay happens after implementation and is not an earlier production observation. Host load and browser startup introduce jitter; these values are not an SLA.

```powershell
node frontend/scripts/test-bymax-browser.mjs --audio C:/path/to/synthetic.mp3
node frontend/scripts/test-bymax-browser.mjs --baseline --audio C:/path/to/synthetic.mp3
```

The MP3 is intentionally outside Git. Supply an MPEG audio fixture containing only synthetic content; never include patient data. The measured fixture was generated once with the existing configured ElevenLabs service using this nonclinical sentence: “Esta es una prueba sintética del audio progresivo de Bymax. Comprobamos que la voz comienza antes de terminar la descarga y que la cancelación detiene la reproducción.” To create an equivalent fixture deliberately, run the following from the repository root (one provider request, requires configured backend credentials, which are never printed):

```powershell
backend/venv/Scripts/python.exe -c "import os,sys,tempfile,pathlib;sys.path.insert(0,'backend');os.environ.setdefault('DJANGO_SETTINGS_MODULE','core.settings');import django;django.setup();from chatbot.ai.elevenlabs_service import generar_audio_bymax;p=pathlib.Path(tempfile.gettempdir())/'bymax-synthetic-browser.mp3';p.write_bytes(generar_audio_bymax('Esta es una prueba sintética del audio progresivo de Bymax. Comprobamos que la voz comienza antes de terminar la descarga y que la cancelación detiene la reproducción.'));print(str(p))"
```

Without `--audio`, the browser harness uses `%TEMP%/bymax-synthetic-browser.mp3`. The harness requires installed Edge and Playwright at the Codex runtime path declared at the top of the script. No provider request is made by the browser harness.

Browser scope: the actual voice controller and MediaSource transport, two ordered segments, no overlapping audio, and cancellation with a 700 ms late-playback observation window; desktop and mobile-sized viewports. It does not render the Assistant/Composer UI, exercise application authentication/CSRF, the microphone, mobile device hardware, or the full production conversation flow. Autoplay is explicitly enabled for the harness. A mobile viewport is not a physical mobile browser.

The current browser harness queues two fragments with the same response ID, matching a streamed response. `segmentIndex` identifies playback order. Earlier runs with separate response IDs are preserved as `*-distinct-response-ids.json`; their gaps do not describe fragments of one response. Run baseline and current harness sequentially with the same MP3 and local chunk configuration for comparison. Baseline is a replay of the recorded baseline revision after implementation, not an earlier production observation.

Use `--baseline-ref <commit>` to deliberately select another baseline; changing it makes the saved comparison a different experiment.
