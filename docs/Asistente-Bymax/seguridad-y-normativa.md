# Seguridad, memoria y normativa de Bymax

Este documento resume los controles técnicos de Bymax y la normativa colombiana consultada.
**No constituye una declaración de cumplimiento legal.** Requiere revisión jurídica y clínica.

## Alcance de Bymax
Bymax ofrece orientación informativa de salud y bienestar emocional, y gestiona citas con los
servicios oficiales de DocSmart. No diagnostica, no prescribe y no interpreta imágenes de forma
definitiva. Ante señales de alarma antepone la orientación urgente a cualquier trámite.

## Normativa consultada (verificar el texto vigente en fuente oficial)
| Norma | Relevancia para Bymax | Fuente consultada |
|---|---|---|
| Ley 1581 de 2012, arts. 5 y 6 | Los datos de salud son sensibles. Su tratamiento requiere autorización explícita del titular, salvo excepciones legales. | [Colombia Compra Eficiente](https://relatoria.colombiacompra.gov.co/normativa/ley-1581-de-2012/) |
| Decreto 1377 de 2013 | Informar que los datos sensibles son opcionales y su finalidad; no condicionar actividades a entregarlos. | [Texto del decreto](https://www.cchuila.org/wp-content/uploads/Decreto_1377_de_2013.pdf) |
| Ley 2015 de 2020 | Historia clínica electrónica interoperable. Bymax no debe crear una memoria clínica paralela. | [Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=105472) |
| Resolución 2654 de 2019 | Telesalud y telemedicina. Solo aplica si DocSmart presta servicios de telemedicina; Bymax no es profesional de la salud. Hay un proyecto de resolución en consulta pública que la derogaría (verificar estado). | [Minsalud](https://www.minsalud.gov.co/sites/rid/Lists/BibliotecaDigital/RIDE/DE/DIJ/resolucion-2654-de-2019.pdf) |

No se verificaron en esta revisión: Resolución 1995 de 1999 (conservación de la historia clínica),
Ley 23 de 1981, Ley 1751 de 2015 ni las guías de la SIC sobre inteligencia artificial.

## Controles técnicos implementados
- **Memoria por usuario autenticado**: solo categorías mínimas (`perfil`, `preferencias`, `salud_declarada`),
  con procedencia (`declarado_por_usuario`) y fecha. Se comparte entre chats de la misma cuenta y nunca entre usuarios.
- **Preferencia de memoria**: «no guardes mi información» desactiva guardado y uso; «activa mi memoria» la reactiva.
- **Supresión**: «olvida que tomo X» borra un dato; «olvida todo lo que sabes de mí» borra todo y conserva la preferencia.
- **Datos que cambian** (medicamentos, condiciones): se entregan al modelo marcados como «confirmar vigencia».
- **Sin instrucciones almacenadas**: los recuerdos con patrones de inyección de instrucciones se descartan y los textos se reducen a una línea.
- **Memoria ≠ historial clínico**: la memoria es declarada por el usuario y no verificada.
- **Menores**: se añade una nota de precauciones (sin exponer la fecha de nacimiento).
- **Citas**: confirmación explícita, de un solo uso y con expiración, vinculada a médico, fecha y `motivo_consulta`.
- **Registros**: auditoría solo con nombres de campos; sin conversaciones ni motivos médicos.

## Pendiente de decisión jurídica, clínica u organizacional
- Texto de autorización y política de tratamiento de datos de salud mostrados al usuario.
- Plazos de conservación y supresión frente a la normativa de historia clínica.
- Si el servicio constituye telemedicina o telesalud.
- Evaluación de menores (representante legal) y de proveedores externos de IA y voz (transferencia de datos).
- Alcance clínico validado para cualquier orientación farmacológica.

## Supuestos de diseño académico (configurables en `backend/chatbot/politicas.py`)
Este proyecto es una demostración con datos de prueba. Se asumen como decisiones de diseño, **no como autorizaciones reales ni validaciones jurídicas o clínicas**:
- La memoria está activa por defecto y el usuario puede desactivarla, corregirla o borrarla (`BYMAX_MEMORIA_ACTIVA_POR_DEFECTO`).
- Máximo de antecedentes recordados por usuario y de antecedentes enviados al modelo (`BYMAX_MEMORIA_MAX_HECHOS`, `BYMAX_MEMORIA_MAX_HECHOS_EN_PROMPT`).
- Autorización de citas de un solo uso, vigente 2 minutos (`BYMAX_CONFIRMACION_EXPIRA_MINUTOS`).
- Resultados de búsqueda conservados para referencias («el segundo»): máximo 10 y 30 minutos (`BYMAX_RESULTADOS_MAX`, `BYMAX_RESULTADOS_VIGENCIA_MINUTOS`).
- Precauciones adicionales por debajo de los 18 años (`BYMAX_EDAD_MAYORIA`).
- OpenAI y ElevenLabs se tratan como proveedores externos de la demostración; no se envían correo, teléfono ni fecha de nacimiento.
- Horas sin am/pm: de 7 a 12 se entienden como mañana; de 1 a 6 se pregunta.

## Memoria longitudinal
Cada antecedente declarado se guarda como un hecho con: texto, categoría, **fecha de comunicación**, **fecha del acontecimiento** (solo si el usuario la dijo; nunca se infiere de la fecha del mensaje), estado (`vigente`, `resuelto`, `sin_confirmar`), datos pendientes, procedencia y fecha de actualización.
- Al declarar un antecedente con datos faltantes, Bymax pregunta por ellos (cuándo, qué zona, indicaciones recibidas).
- En otro chat, los antecedentes llegan al modelo como datos declarados, con antigüedad e incertidumbre, junto con reglas: relacionarlos solo si pertinentes, no suponer que siguen activos ni que sanaron por el tiempo, confirmar lo que pueda haber cambiado y no autorizar actividades.
- La relevancia final la juzga el modelo; el código solo garantiza que los saludos y los comandos de memoria no los incluyan.
- «Ya sané de mi fractura» marca el antecedente como resuelto según el usuario; «borra la fractura de mi memoria» lo elimina.
- No sustituye la historia clínica ni se alimenta de ella.

## Protección contra promesas sin ejecución
Un filtro por frases (`FiltroPromesas`) retira del texto del modelo, también en streaming, expresiones como «voy a buscar», «un momento» o «ya quedó agendada». Si se retiró una promesa, Bymax ejecuta la búsqueda con criterios verificables o pide los datos que faltan.

## Limitaciones conocidas
- No existe memoria de preferencias personales del médico (requeriría un modelo y una migración nuevos); los chats de médicos no usan la memoria de pacientes.
- La voz del navegador depende de los permisos y del soporte de reconocimiento del dispositivo; no se verificó con micrófono real en esta revisión.
