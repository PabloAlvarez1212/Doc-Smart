# Chat de citas — resultado de Fase 2

La Fase 2 amplía los servicios de Fase 1 sin publicar API ni implementar mensajes. Trabajo en `feat/chat-medico-paciente`, sin commits. Incluye ahora la transición manual aprobada `inasistencia_paciente`; no incluye inasistencia del médico. [Informe de cierre, migración y verificación de inasistencia](INASISTENCIA_PACIENTE.md).

## 1. Archivos creados en esta fase

- `backend/chat_citas/test_ciclo_vida.py`: 50 pruebas nuevas de ciclo de vida, autorización y atomicidad.
- `backend/chat_citas/test_inasistencia.py`: 32 pruebas de persistencia/migración, transición y protección del estado terminal.
- `backend/citas/migrations/0007_cita_fecha_inasistencia.py`: campo y provisión del estado de catálogo.
- `backend/chat_citas/INASISTENCIA_PACIENTE.md`: informe del cierre de Fase 2.
- `backend/chat_citas/README.md`: comportamiento, resultados y decisiones de esta fase.
- Evidencias locales ignoradas por Git: `.superpowers/sdd/chat-citas-fase2/` contiene plan, registro, snapshots de Fase 1, lanzador y logs RED/GREEN.

## 2. Archivos modificados

- `backend/chat_citas/services.py`: integración interna de cancelación/reprogramación, cálculo de completadas, visibilidad y escritura.
- `backend/citas/services.py`: llamadas a los servicios internos dentro de las transacciones existentes, bloqueo explícito de cita y rechazo de fechas naive al reprogramar.
- `backend/citas/models.py`: campo nullable `fecha_inasistencia`.
- `backend/chatbot/services/cita_service.py`: dos llamadas de Bymax paciente corregidas para pasar la instancia de Usuario que requieren los servicios compartidos, en lugar de su ID.
- `backend/chat_citas/tests.py`: actualización de la expectativa anterior para canceladas/completadas con cierre explícito. Se conserva la cobertura de Fase 1.

Los cambios no confirmados de `backend/core/settings.py`, el modelo, app y migración inicial de chat ya estaban presentes en Fase 1; no son modificaciones nuevas de esta fase.

## 3. Migraciones

La migración nueva `citas/0007_cita_fecha_inasistencia.py` añade el timestamp nullable y provisiona `inasistencia_paciente` sin modificar citas históricas. No se alteraron migraciones anteriores. `makemigrations --check --dry-run` informa `No changes detected`. Se verificó con MigrationExecutor en SQLite temporal; no se ejecutó `migrate` sobre la base de trabajo. No se agregó campo nuevo para completado.

## 4. Cita y el instante real de completado

El único campo nuevo del modelo es `fecha_inasistencia`, independiente del completado. `crearCitaService` guarda inicialmente el fin previsto en `fecha_final`; **`completarCitaService` ya lo sobrescribía con `timezone.now()` dentro de la transición válida**. Las rutas existentes y Bymax delegan en ese servicio. Editar/reprogramar rechaza citas completadas, por lo que la escritura oficial no sustituye posteriormente ese instante por otra previsión.

La ventana posterior usa `fecha_final` exclusivamente cuando la cita está completada. No se deduce del horario previsto. Una completada sin ese timestamp queda no disponible; no se inventa una fecha ni se rellenan datos históricos. Las escrituras directas a la BD que eludan los servicios no acreditan por sí mismas un evento válido.

## 5. Conversacion

No cambió el esquema ni la unicidad OneToOne. Conserva PK, cita y fecha_creacion. No almacena estado ni fechas calculadas. El resultado de `obtenerEstadoConversacionService` añade `fecha_cierre_automatico`, calculado para completadas; `fecha_cierre` continúa representando un cierre explícito persistido.

## 6. Cancelación

Paciente propietario y médico propietario siguen utilizando `cancelarCitaService`. Tras guardar la transición y antes de notificar, se cierra la conversación existente con el mismo instante de `fecha_cancelacion`. Una conversación que ya tenía cierre explícito conserva esa primera evidencia. Rechazos y reintentos no alteran marcas ni agregan notificaciones. Si no había conversación, no se crea una.

## 7. Reprogramación

Una nueva fecha válida conserva la misma conversación y limpia `fecha_habilitacion_anticipada`. La cita sigue usando el estado existente `reprogramada`; el dominio del chat reconoce ese estado para calcular la nueva ventana, sin exigir una reconfirmación adicional para la conversación existente.

- Más de 24 horas: programado.
- Exactamente 24 horas o menos: activo.
- El médico propietario aprobado puede habilitar anticipadamente de nuevo.
- Fecha igual, edición sin fecha o rechazo: la habilitación anterior permanece.
- Se preserva un cierre explícito deliberado; reprogramar no reabre ese caso excepcional. Las citas canceladas/completadas siguen sin poder reprogramarse por las reglas existentes.

## 8. Completada

Sin cierre explícito, el chat está activo antes de `fecha_final UTC + 24h` y cerrado desde ese instante, inclusive. La habilitación anticipada anterior no prolonga ese plazo. Repetir completar se rechaza y no extiende la ventana. No se escribe `fecha_cierre` al vencer el plazo ni se necesita un proceso programado.

Las fechas se validan como aware; las 24 horas son tiempo transcurrido en UTC, incluso durante cambios horarios. Una cita confirmada cuya hora pasó sigue activa: no se infiere inasistencia.

## 9. Inasistencia del paciente

Tras aprobación explícita, `marcarInasistenciaPacienteService(id, solicitante)` permite al médico propietario autenticado y aprobado marcar manualmente una cita confirmada/reprogramada desde su inicio programado, inclusive, sin gracia adicional. Rechaza pacientes, ajenos, administradores y médicos no aprobados.

Guarda `fecha_inasistencia` aware y cierra la conversación existente exactamente con ese instante, dentro de la misma transacción. Si había cierre previo, esta primera transición válida fija ambos timestamps iguales según el requisito aprobado; repetir se rechaza y conserva evidencia. No crea conversación faltante ni notificaciones. Los participantes conservan visualización, sin escritura.

Confirmar, cancelar, completar y reprogramar rechazan este nuevo estado terminal, también a través de las delegaciones de Bymax. La transición se expone únicamente como servicio de dominio; no se añadieron endpoints, acciones Bymax, botones ni automatismos. [Detalles y pruebas](INASISTENCIA_PACIENTE.md).

## 10. Visualización

`puedeVerConversacionService`: paciente propietario con rol paciente o médico propietario aprobado puede ver estados programado, activo y cerrado. No disponible (`None`) no concede visualización. Actores ajenos, administradores, anónimos y médicos no aprobados no reciben acceso. Se verifica tipo y PK por separado.

## 11. Escritura

`puedeEscribirConversacionService`: mismo participante autorizado, exclusivamente en estado activo. `puedeAccederConversacionService` conserva la semántica anterior mediante delegación a escritura; no se amplían silenciosamente sus permisos. Todavía no existe operación de envío.

## 12. Atomicidad y bloqueos

Se conserva `serializar_agenda`: transacción y bloqueo del médico. Los servicios modificados bloquean después la cita y, cuando deben actualizarla, su conversación. Orden: médico → cita → conversación. Los helpers del chat son internos: reciben la cita ya validada, guardada y bloqueada dentro de esa transacción; no son APIs de autorización independientes.

Cancelación/reprogramación actualizan chat antes de emitir las notificaciones existentes. Las excepciones se propagan. Pruebas inyectan fallos después de escrituras reales para comprobar rollback de cita, conversación, notificaciones y callbacks `on_commit`. Completar no necesita modificar la conversación: el estado deriva del evento guardado en Cita en la misma transacción.

## 13. Pruebas nuevas

82 pruebas de Fase 2: cancelación (9), reprogramación (15), completada (13), visualización/escritura (10), integración de Bymax paciente (3), inasistencia (32). Incluyen actores válidos/ajenos, colisiones PK, identidad/creación, UTC/Bogotá/DST, límites por microsegundo, sin escrituras temporales, rechazo naive, idempotencia, callbacks, ausencia de conversación, migración sin backfill y delegación de Bymax médico/paciente. Total de pruebas de chat: 110.

## 14. Comandos ejecutados

Desde la raíz, con el Python existente:

```powershell
backend/venv/Scripts/python.exe -B .superpowers/sdd/chat-citas-fase2/run.py test --settings=core.test_settings --noinput
backend/venv/Scripts/python.exe -B .superpowers/sdd/chat-citas-fase2/run.py test chat_citas.test_ciclo_vida.CancelacionChatTests --settings=core.test_settings --noinput
backend/venv/Scripts/python.exe -B .superpowers/sdd/chat-citas-fase2/run.py test chat_citas.test_ciclo_vida.ReprogramacionChatTests --settings=core.test_settings --noinput
backend/venv/Scripts/python.exe -B .superpowers/sdd/chat-citas-fase2/run.py test chat_citas.test_ciclo_vida.CompletadaChatTests --settings=core.test_settings --noinput
backend/venv/Scripts/python.exe -B .superpowers/sdd/chat-citas-fase2/run.py test chat_citas.test_ciclo_vida.VisibilidadEscrituraTests --settings=core.test_settings --noinput
backend/venv/Scripts/python.exe -B .superpowers/sdd/chat-citas-fase2/run.py test chat_citas.test_ciclo_vida.BymaxPacienteCicloTests --settings=core.test_settings --noinput
backend/venv/Scripts/python.exe -B .superpowers/sdd/chat-citas-fase2/run.py test chat_citas --settings=core.test_settings --noinput
backend/venv/Scripts/python.exe -B .superpowers/sdd/chat-citas-fase2/run.py test chat_citas medicos.test_permisos_aprobacion users core.test_admin_permissions --settings=core.test_settings --noinput
backend/venv/Scripts/python.exe -B .superpowers/sdd/chat-citas-fase2/run.py test chat_citas citas medicos users core.test_admin_permissions chatbot --settings=core.test_settings --noinput
backend/venv/Scripts/python.exe -B .superpowers/sdd/chat-citas-fase2/run.py check --settings=core.test_settings
backend/venv/Scripts/python.exe -B .superpowers/sdd/chat-citas-fase2/run.py makemigrations --check --dry-run --settings=core.test_settings
git diff --check
git status --short --branch
```

El lanzador local ejecuta `backend/manage.py` con credenciales ficticias y bloquea conexiones externas; permite loopback para asyncio Windows. No instala dependencias. El Python requirió ejecución fuera del sandbox por `Acceso denegado`. Equivalente funcional desde backend: `venv/Scripts/python.exe -B manage.py <argumentos>`, conservando el aislamiento de credenciales/red utilizado aquí.

## 15. Resultados exactos

La tabla siguiente conserva las ejecuciones del primer tramo de Fase 2. Para el cierre con inasistencia: 240 pruebas relevantes (239 correctas, 1 omitida); suite global 292 (288 correctas, 1 fallo, 2 errores preexistentes, 1 omitida). Evidencia actualizada en [el informe de inasistencia](INASISTENCIA_PACIENTE.md).

| Ejecución | Resultado |
|---|---|
| Línea base, antes de Fase 2 | 210 pruebas; 1 fallo, 1 error, 1 omitida |
| Cancelación RED | 9 pruebas, 4 fallos esperados |
| Cancelación GREEN + chat previo | 37/37 correctas |
| Reprogramación RED | 15 pruebas, 8 fallos esperados |
| Reprogramación GREEN + chat previo | 52/52 correctas |
| Completada RED | 13 pruebas; 14 fallos en casos/subcasos y 1 error por metadato ausente |
| Completada GREEN + chat previo | 65/65 correctas |
| Permisos RED | 10 pruebas, 19 fallos en casos/subcasos por servicios ausentes |
| Permisos GREEN + chat/permisos existentes | 85/85 correctas |
| Revisión Bymax paciente RED | 3 pruebas; 2 fallos esperados (403 en operaciones válidas) |
| Regresión final chat/citas/médicos/users/admin/Bymax | 208 pruebas; 207 correctas, 1 omitida |
| Suite backend completa final | 260 pruebas; 256 correctas, 1 fallo, 2 errores, 1 omitida |
| Django check | Sin incidencias |
| Migraciones check/dry-run | Sin cambios |
| git diff --check | Sin errores |

## 16. Fallos preexistentes

En `historial_medico.tests`:

- `HistorialClinicoSecurityTests.test_periodos_filtran_por_fecha_de_creacion`: fallo de pertenencia en filtrado anual.
- `HistorialClinicoConcurrencyTests.test_creaciones_concurrentes_solo_confirman_un_historial_por_cita`: error de bloqueo SQLite.
- `HistorialClinicoConcurrencyTests.test_ediciones_concurrentes_conservan_ambas_versiones_sin_perdidas`: error de bloqueo SQLite.

Los dos errores de concurrencia ya se observaron en Fase 1. En la línea base de esta fase solo reapareció el de ediciones; en la ejecución final reaparecieron ambos. Su aparición varía por planificación de hilos. No se modificó historial para ocultarlos ni se declara la suite global verde.

## 17. Limitaciones y decisiones

- Concurrencia real de MySQL no validada mediante SQLite; `select_for_update` requiere verificación sobre el motor de producción.
- Consultas futuras deben cargar relaciones vigentes por solicitud; no reutilizar instancias cacheadas entre peticiones. El envío futuro necesitará revalidación transaccional del permiso.
- El instante real de completado depende de usar el servicio oficial; completadas sin timestamp permanecen no disponibles.
- Un cierre explícito previo no se borra al reprogramar ni completar. Esto conserva auditoría y evita una reapertura no solicitada.
- Inasistencia del paciente implementada exclusivamente por acción explícita. No hay inferencia por falta de mensajes, hora o actividad; no se implementó inasistencia del médico.
- Se conserva el checkout solicitado y los cambios sin commit. Los scripts de registro se adaptaron a PowerShell; no se crearon worktrees ni se borraron evidencias.
- Sin mensajes, nuevos endpoints, REST de conversaciones, WebSockets, frontend, adjuntos, notificaciones de chat ni backfill.

## 18. Revisión final independiente

Realizada en modo solo lectura contra snapshots de Fase 1, no solo HEAD, porque esa fase aún no tiene commit. No encontró problemas críticos o importantes en el diff de Fase 2.

El revisor sí señaló un defecto previo en los adaptadores de Bymax paciente: pasaban `usuario.id` donde cancelar/editar esperan una instancia. Se consideró importante para el alcance solicitado, porque impedía cancelar/reprogramar desde esa entrada. Dos pruebas reales reprodujeron los 403 incorrectos (RED), se corrigieron únicamente las dos llamadas y se repitieron las suites relevantes y completa (GREEN en lo relacionado, mismos fallos conocidos de historial). La corrección posterior se verificó mediante TDD, sin una segunda ronda de revisión. No hay mejoras menores diferidas.

Decisiones de aquella revisión: cierres explícitos no se reabren; no se sanea ni rellena historial; futuras escrituras de mensajes deben revalidar permisos bajo transacción; concurrencia del motor real queda pendiente. Inasistencia, inicialmente diferida, se implementó posteriormente con la aprobación y reglas precisas del usuario; su revisión independiente se documenta en el informe enlazado. El motor configurado es MySQL, verificado en settings; no se atribuye validación a PostgreSQL. El segundo error SQLite se contrastó con el log final de Fase 1, donde ya aparece.

## 19. Recomendación para Fase 3

Después de revisar el cierre de Fase 2, definir mensajes persistidos y una API mínima de lectura/envío. Reutilizar visibilidad para lectura y revalidar escritura dentro de la transacción que guarde cada mensaje, con relaciones vigentes y el mismo orden de bloqueos. Diseñar idempotencia del envío y paginación antes de agregar tiempo real. No se inició esa fase.
