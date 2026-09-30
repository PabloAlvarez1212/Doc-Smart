# Cierre de Fase 2: inasistencia del paciente

Implementación manual y explícita de `inasistencia_paciente`. Rama `feat/chat-medico-paciente`; sin commits ni desarrollo de Fase 3.

## Archivos de esta ampliación

Creado:

- `backend/citas/migrations/0007_cita_fecha_inasistencia.py`.
- `backend/chat_citas/test_inasistencia.py`.
- `backend/chat_citas/INASISTENCIA_PACIENTE.md`.

Modificado:

- `backend/citas/models.py`: `fecha_inasistencia`.
- `backend/citas/services.py`: nueva transición y rechazo de operaciones sobre el nuevo estado terminal.
- `backend/chat_citas/services.py`: cierre transaccional interno y reconocimiento del estado cerrado.
- `backend/chat_citas/README.md`: actualización del resultado general de Fase 2.

Los otros cambios sin commit que aparecen en git status pertenecen a tramos anteriores. Se guardaron snapshots previos para revisar esta ampliación aisladamente en `.superpowers/sdd/inasistencia-paciente/` (directorio local ignorado por Git).

## Modelo y migración

`Cita.fecha_inasistencia = DateTimeField(null=True, blank=True)`, sin default ni auto_now. Solo la transición válida escribe el instante real.

Migración `0007_cita_fecha_inasistencia`, dependiente de citas0006 y catalogos0006:

1. Añade el campo nullable.
2. Provisiona el estado de catálogo `inasistencia_paciente` si no existe (comparación sin distinguir mayúsculas), usando modelos históricos y el alias de la conexión de migración.

No se modifican citas/conversaciones históricas, no se asignan fechas artificiales y no se alteran migraciones previas. La reversión del catálogo es noop para no borrar un estado compartido potencialmente referenciado; la reversión del esquema sigue siendo la propia de AddField. Se verificó migrando 0006→0007 en BD temporal con y sin estado de catálogo existente. Nunca se ejecutó migrate sobre la base de trabajo.

## Service y permisos

`citas.services.marcarInasistenciaPacienteService(id, solicitante)` requiere una instancia del médico autenticado, no un ID de actor. El llamador futuro debe resolver ese actor mediante la autenticación existente; este servicio no autentica credenciales ni se expone como endpoint en esta fase.

- Tipo Medico e `is_authenticated` obligatorios.
- Propiedad por PK del médico de la cita, independiente de IDs de Usuario.
- Aprobación vigente según `Medico.esta_aprobado`, leída del propietario en BD; se rechaza rol admin.
- Únicamente confirmada/reprogramada y sin evidencia previa de inasistencia.
- Se permite cuando `ahora UTC >= fecha_programada UTC`, inclusive, sin margen adicional. Fechas naive se rechazan.

Una sola lectura de `timezone.now()` sirve para decidir y persistir ambas marcas. Éxito devuelve el formato serializado de citas existente y 200. Rechazos: 403 para actor no autorizado; 404 cita inexistente para actor médico; 400 estado, hora, fecha o repetición inválidos; 500 catálogo no configurado. No se crea catálogo durante la acción.

No se añadieron endpoint, acción de Bymax, botón, notificación ni mensaje de sistema. La invocación del servicio es explícita; no hay tarea programada ni inferencia por hora, falta de mensajes o inactividad.

## Conversación y atomicidad

`serializar_agenda` abre la transacción y bloquea al médico. La transición bloquea cita, guarda `inasistencia_paciente` y `fecha_inasistencia`, y llama al helper interno `cerrarConversacionPorInasistenciaPacienteService`. Este bloquea solo la conversación existente y guarda `fecha_cierre` con exactamente el mismo instante.

Orden de bloqueos: médico → cita → conversación. Una excepción del helper se propaga y revierte ambas escrituras. Se conserva PK, fecha_creacion y relación; no se crea conversación cuando falta.

Con cierre previo explícito, la primera transición válida fija el cierre al instante de inasistencia para cumplir la igualdad exigida. El segundo intento se rechaza antes de modificar timestamps. No se añade un historial de cierres fuera del alcance solicitado.

El estado derivado es cerrado, visible para paciente propietario y médico propietario aprobado, no escribible. La habilitación anticipada tampoco puede reabrirlo. Confirmar, editar/reprogramar, cancelar y completar rechazan `inasistencia_paciente`, conservando evidencia también a través de las delegaciones existentes de Bymax.

## Pruebas RED → GREEN

32 pruebas nuevas:

- Persistencia/migración: 3. RED por campo y migración ausentes; GREEN3 con MigrationExecutor y conservación de históricos.
- Transición: 22. RED por operación ausente (30 fallos contando subcasos); GREEN junto con las 103 pruebas de chat acumuladas en ese momento. Incluyen ambos estados origen, frontera exacta y microsegundo previo, aware/UTC/Bogotá, roles/aprobación/anonimato/colisiones PK, estados incompatibles, reintento, cita inexistente, catálogo faltante, ausencia de conversación, cierre previo, reloj único, rollback después de cerrar y ver/no escribir.
- Estado terminal: 7. RED6 al detectar que operaciones previas sobrescribían el estado; GREEN tras guardas puntuales. Cubren servicios oficiales y Bymax paciente/médico.

La prueba de rollback ejecuta primero el cierre real y luego lanza una excepción: afirma el estado y ambos timestamps en BD, no solo llamadas a un mock. Las pruebas de lectura con tiempo avanzado comprueban que la cita no cambia automáticamente.

## Comandos y resultados

Desde la raíz, prefijo usado en todas las invocaciones Django:

```powershell
backend/venv/Scripts/python.exe -B .superpowers/sdd/inasistencia-paciente/run.py
```

El lanzador ejecuta manage.py desde backend con credenciales ficticias y conexiones externas bloqueadas; permite loopback para asyncio en Windows. El sandbox devolvió Acceso denegado al iniciar Python, por lo que las ejecuciones requirieron escalación. No se instalaron dependencias.

Argumentos ejecutados con ese prefijo:

```text
test --settings=core.test_settings --noinput
test chat_citas.test_inasistencia --settings=core.test_settings --noinput
test chat_citas.test_inasistencia.TransicionInasistenciaTests --settings=core.test_settings --noinput
test chat_citas.test_inasistencia.InasistenciaTerminalTests --settings=core.test_settings --noinput
test chat_citas --settings=core.test_settings --noinput
test chat_citas citas medicos users core.test_admin_permissions chatbot --settings=core.test_settings --noinput
check --settings=core.test_settings
makemigrations --check --dry-run --settings=core.test_settings
```

También se ejecutaron `git status --short --branch`, `git diff --check` e inspecciones del código/diff real. Logs y snapshots en `.superpowers/sdd/inasistencia-paciente/`.

| Verificación | Resultado |
|---|---|
| Línea base | 260 pruebas; 256 correctas, 1 fallo, 2 errores, 1 omitida |
| Regresión relevante final | 240 pruebas; 239 correctas, 1 omitida |
| Suite backend final | 292 pruebas; 288 correctas, 1 fallo, 2 errores, 1 omitida |
| Pruebas nuevas | 32 correctas |
| Total de chat | 110 correctas, incluidas en la regresión final |
| Django check | Sin incidencias |
| Migraciones check/dry-run | No changes detected |
| git diff --check | Sin errores |

## Fallos anteriores, separados del cambio

Los mismos tres problemas de `historial_medico` aparecen en baseline y suite final:

- `HistorialClinicoSecurityTests.test_periodos_filtran_por_fecha_de_creacion`: fallo de filtrado de fecha.
- `HistorialClinicoConcurrencyTests.test_creaciones_concurrentes_solo_confirman_un_historial_por_cita`: bloqueo de tabla SQLite.
- `HistorialClinicoConcurrencyTests.test_ediciones_concurrentes_conservan_ambas_versiones_sin_perdidas`: bloqueo de tabla SQLite.

No se modificó historial ni se presenta la suite global como verde.

## Limitaciones y decisiones

- SQLite no valida la concurrencia de locks de MySQL. Se verifica el orden estáticamente y la atomicidad con rollback real; queda pendiente una prueba de contención sobre el motor de producción.
- La nueva migración queda por aplicar al desplegar, bajo control del usuario; no se tocó la base de trabajo.
- No hay endpoint/botón para invocar esta acción todavía; la transición existe como servicio explícito del dominio. No se implementa inasistencia médica.
- Las políticas de lectura requieren instancias/relaciones vigentes por solicitud, como las fases anteriores.
- El cierre previo se sustituye únicamente en la primera transición válida por la igualdad temporal pedida; no existe un historial adicional de cierres.
- Se preservaron checkout y cambios anteriores sin commits; scripts de evidencias adaptados a PowerShell y conservados localmente.

## Revisión final independiente

Completada en modo solo lectura contra snapshots anteriores de esta ampliación, no solo HEAD. El revisor examinó servicios, migración, las 32 pruebas nuevas y los logs: no encontró defectos críticos, importantes ni menores en el incremento. La actualización documental indicada durante la revisión quedó realizada.

Decisiones sobre los aspectos que el revisor dejó fuera: concurrencia MySQL sigue pendiente de validación real; escrituras directas que evadan los servicios no forman parte del flujo soportado; endpoints/mensajes/UI/automatismos permanecen fuera del alcance; fallos de historial se conservan separados; el serializer mantiene su formato existente (el nuevo timestamp queda persistido en Cita); el cierre anterior se sustituye en la primera transición válida para cumplir la igualdad temporal solicitada. No hay correcciones ni mejoras menores diferidas de esta revisión.

Fase 3 no iniciada.
