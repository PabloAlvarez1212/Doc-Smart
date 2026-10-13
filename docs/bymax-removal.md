# Retirada de los flujos de estado de ánimo

## Resultado

No quedan preguntas, selectores, registro, posposición, eventos ni personalización del chat basados en el ánimo en el código activo. La identidad autenticada, la bienvenida general, el chat, la voz, el micrófono y las citas se conservan.

`GET /api/chatbot/identidad/` mantiene identidad, saludo, permisos, autorización de diagnóstico y contexto médico opcional. Ya no expone datos de ánimo. Se retiró el método POST exclusivo del registro: los clientes antiguos reciben 405 y no escriben históricos. Las rutas de chat, voz y citas no se eliminaron.

## Archivos y artefactos eliminados

- `frontend/components/bymax/BymaxMood.jsx`
- `frontend/components/bymax/AnimatedMoodOption.jsx`
- `frontend/components/bymax/moodVoice.mjs`
- `frontend/components/bymax/moodVoice.test.mjs`
- `frontend/scripts/verify-mood.cjs`
- `frontend/public/emoji/twemoji/` (diez SVG, licencia y atribución exclusivos de la escala)
- `.impeccable/mood/` y `frontend/.impeccable/mood/` (capturas y resultados de esa función)
- `backend/chatbot/test_daily_mood.py`
- `docs/bymax-daily-mood.md` (documentación de la implementación retirada)

También se eliminaron las pruebas de registro diario del archivo compartido `test_copiloto.py`, conservando sus pruebas de citas, diagnóstico y conversación.

## Cambios

- `frontend/components/bymax/useBymaxIdentity.js`: solo consulta identidad; elimina escrituras, puntuación, estado diario, guardado y efectos ligados a abrir el chat.
- `frontend/components/bymax/BymaxAssistant.jsx` y `BymaxChatWindow.jsx`: reciben identidad directamente; conservan saludo, nombre y especialidad sin el objeto diario.
- `frontend/src/app/services/bymaxServices.js`: retira preguntar/guardar ánimo y conserva identidad, conversaciones, WebSocket y generación de voz.
- `frontend/components/bymax/BymaxAssistant.module.css`: retira los estilos de los selectores y paneles antiguos. Conserva controles de confirmación de citas y panel clínico.
- `backend/chatbot/identity_views.py` y `services/identity_service.py`: retiran consultas históricas, reclamación diaria, guardado y tono basado en puntuación.
- `backend/chatbot/ai/conversation_manager.py` y `ai/doctor_conversation.py`: retiran las instrucciones de tono tomadas del ánimo; conservan historial, idioma, perfil, identidad profesional y contexto clínico.
- `backend/chatbot/models.py`: retira `EstadoAnimoDiario` y `SesionBymax.escala_animo` del ORM activo.
- Nueva migración `backend/chatbot/migrations/0010_retire_tracking_preserve_history.py`.
- Nuevas pruebas de identidad, rechazo de clientes antiguos y conservación histórica en `backend/chatbot/test_identity.py`.
- `frontend/scripts/verify-bymax.cjs`: prueba los flujos generales de acceso, conversación, voz y citas, sin implementar ni conservar prototipos de la función retirada.

No había una dependencia npm exclusiva de emojis instalada; se eliminaron sus gráficos locales. Las dependencias compartidas, como Motion, se conservaron.

## Conservación de datos

Se conservaron las migraciones anteriores, incluida 0009. La nueva 0010 usa `SeparateDatabaseAndState`: retira modelo/campo del estado de Django, pero mantiene la tabla histórica, sus columnas, las puntuaciones y las fechas. Desvincula las claves foráneas del archivo de usuarios y médicos, conservando los IDs numéricos, para que retirar el modelo no impida eliminar una cuenta ni borre sus registros históricos.

En SQLite Django reconstruye la tabla mediante una copia de todas las columnas; las pruebas verifican los valores antes/después. El campo antiguo de sesión también permanece físicamente. No se modificaron registros reales durante esta tarea.

Se verificó la reversión con actores existentes. Si después de la retirada se eliminan actores, restaurar las antiguas claves foráneas durante una reversión podría requerir resolver esas referencias. La migración no elimina el histórico para conseguir una reversión.

Aplicar la migración al desplegar el backend actualizado:

```powershell
cd backend
venv/Scripts/python.exe manage.py migrate
```

Se ejecutó en bases temporales de prueba; no se aplicó a la base configurada de la aplicación.

## Verificaciones

- `npm run build`: compilación de producción correcta, 36 páginas generadas.
- `node --test components/bymax/*.test.mjs` desde frontend: 43 pruebas de voz, micrófono, streaming, presentación y cierre de sesión aprobadas.
- Django `check --settings=core.test_settings`: sin errores.
- Django `makemigrations --check --dry-run --settings=core.test_settings`: sin cambios pendientes.
- Django `test chatbot citas users --settings=core.test_settings --noinput`: 178 pruebas aprobadas.
- Django `test chatbot.test_identity --settings=core.test_settings --noinput`: 7 pruebas aprobadas, incluyendo autenticación, identidad sin seguimiento, POST antiguos rechazados sin nuevas filas, ausencia del modelo/campo activo, conservación tras eliminar paciente/médico y migración/reversión con valores históricos intactos.
- Edge con build de producción: acceso, bienvenida general, chat WebSocket, respuesta alternativa HTTP, activación de micrófono desde Configuración, reproducción/detención de voz, navegación de citas y recarga. Paciente y médico en 1440×1000 y 390×844, con servicios, reconocimiento y audio simulados. Cero POST a identidad y ningún error JavaScript/hidratación en las cuatro combinaciones. No se probó hardware ni un proveedor de voz en vivo.
- Búsqueda de referencias en frontend y prototipos ocultos: no quedan referencias de la función. En backend solo quedan nombres históricos dentro de migraciones y pruebas de retirada/conservación.
- `git diff --check`: correcto.

La suite ampliada `test chatbot citas users medicos` ejecutó 228 pruebas: seis errores ajenos a esta retirada y una prueba omitida. Los seis errores corresponden a `medicos.test_estadisticas_dashboard.TiempoPromedioValidacionTests`: el servicio existente `obtenerEstadisticasMedicosService()` recibe `anio=None` y llama a `datetime.replace(year=None)`. El servicio y esas pruebas no se modificaron; las suites de Bymax, citas y usuarios sí quedaron aprobadas.

Revisión independiente: veredicto **ship** sobre el diff funcional suministrado; sin bugs materiales confirmados dentro de ese alcance. El revisor no inspeccionó archivos ni ejecutó las suites por su cuenta.
