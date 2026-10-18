# Bymax: cambios y mediciones

Se reutilizó el streaming real existente de OpenAI → consumer de Django → WebSocket → una misma respuesta en React. La demora principal estaba antes del primer fragmento (clasificación y preparación) y en esperar el archivo de voz completo. No se sustituyó el streaming por una animación de escritura.

## Cambios

- Cliente OpenAI reutilizado por configuración, cierre del stream y cancelación cooperativa; no se cambiaron modelo, instrucciones, historial de 30 mensajes, límite de salida ni controles de herramientas.
- Cuatro preguntas exactas de ayuda DocSmart evitan la clasificación adicional del router. Las solicitudes de citas y sus confirmaciones conservan su recorrido.
- Preparación fuera de la cola global `thread_sensitive`, con bloqueo por conexión y las transacciones existentes. Reutilización del actor autenticado en las relaciones del chat evita una consulta repetida. Cada respuesta conserva su contexto clínico al persistir, aunque llegue otra solicitud.
- `request_id` y `response_id` en los eventos; cancelar o enviar otra consulta descarta los fragmentos anteriores. Retransmitir el mismo identificador no cancela su generación ni repite la operación.
- La cancelación no revierte una cita ya iniciada. Su resultado real se persiste. Las respuestas de herramientas se envían después de la operación validada; no se anuncia una modificación especulativa.
- ElevenLabs HTTP `/stream`, conexiones reutilizadas por trabajador y respuesta Django asíncrona para evitar que ASGI acumule el audio. Se mantiene la voz y el modelo configurados. Cabeceras `X-Accel-Buffering: no` y `no-transform`.
- Reproducción MPEG mediante MediaSource cuando está soportado; alternativa Blob. Se conserva Axios con credenciales y CSRF. La cola empieza con una frase o cláusula significativa y precarga el segmento siguiente; nunca reproduce dos segmentos a la vez. Abreviaturas y decimales quedan protegidos.
- Botón Detener respuesta; es posible enviar otra consulta durante la generación. Estados de preparación, generación, inicio de audio y reproducción observada. Audio bloqueado expone reproducción manual.
- Al desconectarse, se recupera por HTTP el mismo turno con la misma clave de idempotencia, sin repetir audio parcial. Hasta ocho intentos para respuestas 409, con esperas cancelables crecientes (27 segundos de espera acumulada, más HTTP); otros errores muestran acceso al historial. Cancelar, cambiar de chat o desmontar invalida las respuestas y aborta las solicitudes del cliente.
- Cancelación/cierre liberan audio, lector, URL y descargas actuales y precargadas, también ante fallos de reproducción.

## Mediciones del backend controlado

`application-before.json` se capturó antes de modificar producción. `application-after.json` repite consumer, router y base SQLite temporal con las mismas demoras artificiales: clasificación/extracción 80 ms, primer delta 80 ms y siguientes 60 ms. Tres repeticiones por escenario; valores de la tabla son medianas, en ms. Miden primer fragmento recibido, no pintura de pantalla ni proveedores reales.

| Escenario | Primer texto antes → después | Respuesta completa antes → después | Consultas de preparación antes → después | Llamadas al proveedor antes → después |
|---|---:|---:|---:|---:|
| Ayuda «¿Cómo funciona DocSmart?» | 201,47 → 100,24 | 325,55 → 224,54 | 4 → 3 | 2 → 1 |
| Consulta clínica de prueba | 96,57 → 92,82 | 221,13 → 215,38 | 4 → 3 | 1 → 1 |
| Preferencia para memoria | 329,06 → 254,16 | 503,24 → 377,44 | 8 → 7 | 3 → 3 |
| Consulta del nombre | 32,25 → 10,87 | 36,71 → 12,72 | 2 → 1 | 0 → 0 |
| Listado de médicos | 34,81 → 11,23 | 41,39 → 12,43 | 7 → 6 | 0 → 0 |

La reducción estructural comprobable es una llamada menos en la pregunta exacta de ayuda y una consulta de actor menos. No se atribuye toda la variación temporal a esos cambios: hay ruido de arranque, SQLite y planificación. La primera repetición crea la sesión de memoria. La medición posterior realizada simultáneamente con la compilación salió peor y se conserva en `application-after-loaded.json`; se repitió después de terminar las tareas pesadas.

## Navegador real, transferencia local controlada

Edge 155, Audio.onplaying y MediaSource reales. Mismo MP3 sintético de 183109 bytes servido en bloques de 4096 bytes cada 120 ms; dos fragmentos bajo el mismo identificador de respuesta. El «antes» es una reproducción posterior del controlador anterior desde `0387c23b00ea190680d52e7125e9841897c823e7`, con Blob completo, no una observación previa en producción. Una ejecución por viewport; no son percentiles ni un SLA.

| Viewport | Primer audio antes → después (ms) | Pausa entre segmentos antes → después (ms) | Fin primera descarga antes → después (ms) |
|---|---:|---:|---:|
| Escritorio 1280 × 800 | 6392,0 → 534,1 | 63,8 → 25,8 | 5892,9 → 5798,9 |
| Móvil 390 × 844 | 6788,9 → 263,2 | 66,0 → 32,7 | 6669,6 → 5774,4 |

Ambos comprueban orden, ausencia de solapamiento y cancelación sin nuevos inicios durante la observación de 700 ms. Esto demuestra reproducción antes de completar la transferencia controlada. No mide la interfaz completa, autenticación, ElevenLabs en vivo, micrófono ni un teléfono físico. El harness habilita autoplay expresamente; las restricciones de autoplay y permiso rechazado se cubren con pruebas automatizadas. Los ensayos anteriores con identificadores distintos se conservan en `*-distinct-response-ids.json` y no se usan para comparar pausas de una misma respuesta.

## Proveedores reales desde este equipo

Sólo textos sintéticos, sin datos de pacientes. `providers-before.json`: una muestra previa. `providers-after.json`: tres muestras posteriores. El estado del proveedor, la red, la reutilización y el calentamiento cambian entre llamadas; el tamaño de muestra no permite atribuir causalmente toda la diferencia a la implementación.

- OpenAI anterior: primer texto 5086,74 ms; completo 5459,37 ms.
- OpenAI posterior: primer texto 3466,67 / 2863,63 / 1945,73 ms; completo 3859,74 / 3260,49 / 2334,00 ms.
- ElevenLabs anterior: archivo completo 2977,96 ms; la interfaz anterior no exponía primeros bytes ni reproducción en navegador.
- ElevenLabs posterior: primeros bytes 2237,24 / 1170,97 / 1150,84 ms; archivo completo 2336,21 / 1205,51 / 1220,38 ms. Primeros bytes no equivalen a primer sonido.

`baseline.json` y `after.json` son otra simulación del segmentador/controlador con TTS Blob y audio ficticios. En conversación normal, primer audio 462,49 → 190,73 ms, con texto exacto y sin repeticiones. Los otros escenarios no mejoran uniformemente y algunas pausas aumentan por los deltas/timers artificiales; esos archivos no son evidencia de latencia real.

## Verificación

- `npm run build`: compilación Next.js y 36 páginas generadas.
- `node --test components/bymax/*.test.mjs`, desde frontend: 55 pruebas pasan; incluyen permisos rechazados, autoplay, voz deshabilitada, cola, fragmentos atrasados, abortos, errores posteriores al primer chunk, limpieza y recuperación idempotente.
- `manage.py test chatbot citas users --settings=core.test_settings --noinput`: 203 pruebas, 202 pasan y una omitida (benchmark optativo). Incluye propietario paciente/médico, acceso clínico, WebSocket, herramientas y confirmaciones/notificaciones de citas. La base es de pruebas, no producción.
- Benchmark optativo ejecutado aparte: pasa con 15 mediciones de consumer/router/base de datos.
- `manage.py check --settings=core.test_settings`: sin problemas.
- Revisión independiente corrigió retransmisión del mismo ID, descarga precargada abandonada y contexto clínico mutable. Se añadieron regresiones.
- Dos aserciones existentes contaban callbacks internos de correo/notificación; ahora comprueban dos envíos simulados y ninguna repetición. Se aisló Resend en el runner de pruebas, porque el servicio usa su SDK directamente y no respetaba `EMAIL_BACKEND` local. No cambia el correo de producción.

## Producción y escenarios pendientes

No se desplegó esta versión. Por instrucción del usuario, sólo se hicieron GET públicos a `https://docsmart.site/`, `/login` y `https://api.docsmart.site/`. Inicio/acceso devolvieron 200; la raíz de API devolvió 404. `production-public.json` contiene dos muestras por URL (primer byte del frontend aproximadamente 1,37–2,64 s); no mide Bymax ni permite inferir su velocidad autenticada. No se crearon, confirmaron, reprogramaron ni cancelaron citas de producción.

Para la validación posterior se necesitan cuentas de prueba autorizadas de paciente y médico, y citas/horarios reservados exclusivamente para pruebas. Ejecutar después del despliegue aprobado:

| Escenario preparado | Comprobación |
|---|---|
| Paciente y médico: ayuda general | Primer delta, primer frame, primer audio real, respuesta completa y pausas; una respuesta actualizada sin duplicados |
| Datos propios y datos ajenos | Resultado real autorizado, rechazo de información de otro actor, tiempos de preparación y texto |
| Citas de prueba: propuesta, confirmación y rechazo | No anunciar éxito antes de confirmar backend; exactamente una escritura/notificación ante recarga/reconexión |
| Cancelar antes del primer delta y durante voz | Audio detenido, siguiente respuesta aislada, ninguna reproducción tardía |
| Nuevo mensaje, reconexión y mismo request_id repetido | No perder ni duplicar turno; recuperar resultado completo; operación iniciada sigue disponible en historial |
| Voz rechazada/bloqueada y proveedor caído | Texto utilizable, error visible y reproducción manual sin bucles |
| Safari/iOS/Android físicos y escritorio | Soporte MPEG o Blob, permiso real, Bluetooth, suspensión, teclado y reproducción |

Medir al menos 20 muestras por escenario y red comparable, separar arranque frío/caliente y reportar medianas/p95 sin mezclar entornos. No ejecutar operaciones sobre citas reales. El contenedor del repositorio usa Daphne/ASGI; verificar que CDN/proxy desplegados respeten streaming y no compriman/acumulen el audio.

Para observar una sesión autorizada sin guardar conversaciones, registrar sólo `detail` de los eventos `bymax:latency`: `first_text` (recepción), `first_text_frame` (siguiente frame, aproximación a pintura), `first_audio` (onplaying), `complete`, `audio_gap` y `cancelled`. Los campos son ID efímero y duración, sin texto clínico. El backend registra `Bymax latency` en INFO con preparación/primer texto/total; habilitar ese logger al medir.

## Limitaciones conservadas

La lectura síncrona de OpenAI en curso no puede interrumpirse inmediatamente: se cierra al devolver el evento o alcanzar el timeout. La interfaz descarta lo atrasado desde la cancelación. Lo mismo puede ocurrir al cerrar una lectura HTTP de voz. En HTTP sin WebSocket (incluidas imágenes), el texto sigue llegando completo; la reproducción usa el mismo pipeline de audio. La extracción de memoria y la clasificación de consultas ambiguas siguen pudiendo añadir llamadas: no se paralelizaron escrituras de contexto ni se recortó información necesaria. No se cambió de modelo para ganar velocidad a costa de calidad. Los tiempos reales de proveedores y red no están garantizados.

## Archivos de implementación

- Backend: `chatbot/consumers.py`, `ai/openai_service.py`, `ai/elevenlabs_service.py`, `ai/router.py`, `views.py`.
- Frontend: `BymaxAssistant.jsx`, `BymaxComposer.jsx`, `bymaxPresentation.mjs`, `bymaxSpeechUnits.mjs`, `bymaxVoiceController.mjs`, `src/app/services/bymaxServices.js`; nuevos `bymaxTurn.mjs` y `bymaxProgressiveAudio.mjs`.
- Verificación: nuevos `test_openai_transport.py`, `test_response_lifecycle.py`, `test_progressive_audio.py`, `test_latency.py`; ajuste `test_copiloto.py`; nuevos tests del transporte/turno y ajustes del segmentador/controlador; `core/test_runner.py` y `core/test_settings.py` para correo aislado.
- Medidores: `backend/scripts/benchmark_bymax_providers.py`, `benchmark_bymax_public.py`, `frontend/scripts/benchmark-bymax.mjs`, `test-bymax-browser.mjs` y los JSON de esta carpeta. No se añadieron dependencias ni migraciones.

## Repetir

Desde raíz, sin llamadas a proveedores:

```powershell
backend/venv/Scripts/python.exe backend/manage.py test chatbot citas users --settings=core.test_settings --noinput
$env:BYMAX_RUN_BENCHMARK='1'
$env:BYMAX_BENCHMARK_OUTPUT='docs/benchmarks/bymax/application-run.json'
backend/venv/Scripts/python.exe backend/manage.py test chatbot.test_latency --settings=core.test_settings --noinput
Remove-Item Env:BYMAX_RUN_BENCHMARK
Remove-Item Env:BYMAX_BENCHMARK_OUTPUT
node frontend/scripts/benchmark-bymax.mjs --output docs/benchmarks/bymax/simulation-run.json
```

Para navegador y fixture, ver README de esta carpeta. El probe público usa exclusivamente GET:

```powershell
backend/venv/Scripts/python.exe backend/scripts/benchmark_bymax_public.py
```

Las mediciones reales de proveedores son optativas, consumen las APIs configuradas y sólo usan texto sintético:

```powershell
backend/venv/Scripts/python.exe backend/scripts/benchmark_bymax_providers.py --live-providers --output docs/benchmarks/bymax/providers-run.json
```

Desde frontend: `node --test components/bymax/*.test.mjs` y `npm run build`.
