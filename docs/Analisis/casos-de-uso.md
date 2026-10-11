- [Regresar - Página Principal](../../README.md)

# 🧩 Especificación de Casos de Uso — DocSmart

> **Proyecto:** DocSmart  
> **Programa:** Tecnología en Análisis y Desarrollo de Software (ADSO) — SENA  
> **Ficha:** 3142774  
> **Fecha:** 17 de marzo de 2026  
> **Integrantes:** Juan Pablo Alvarez Montoya, Miguel Angel Racero Guerrero, Kleider Yesid Echeverry Lamadrid  

---

## 👥 1. Identificación de Actores

| Actor | Tipo | Descripción |
| :--- | :--- | :--- |
| **Paciente** | Usuario | Persona que busca atención médica, agenda citas y consulta su historial. |
| **Médico** | Usuario | Profesional de salud validado por el administrador; gestiona su agenda, atiende pacientes y revisa métricas. |
| **Asistente de IA (Bymax)** | Sistema | Componente automatizado que brinda orientación médica informativa y responde consultas operativas del sistema. |
| **Administrador** | Usuario | Responsable de validar médicos, asignar roles, gestionar usuarios y mantener el catálogo de servicios. |

---

## 🗺️ 2. Diagrama General de Casos de Uso

![Diagrama de Casos de Uso](../img/Flujo-Proyecto.png)

---

## 📋 3. Plantillas de Casos de Uso

### CU-01: Página de aterrizaje

| Campo | Detalle |
| :--- | :--- |
| **Código y Nombre** | **CU-01: Página de aterrizaje** |
| **Descripción** | El usuario accede a la página principal de DocSmart para conocer la plataforma, sus beneficios y decidir si desea registrarse o iniciar sesión. |
| **Actores** | Visitantes / Usuarios no autenticados |
| **Precondiciones** | 1. El sistema está en línea y desplegado.<br>2. El usuario cuenta con conexión a internet y navegador web. |
| **Postcondiciones** | El usuario decide explorar la plataforma, registrarse o iniciar sesión. |
| **Rendimiento** | Tiempo de carga inicial inferior a 3 segundos. |
| **Frecuencia** | Alta (estimado de 200 a 500 visitas diarias). |
| **Importancia / Urgencia** | Importante / Media |
| **Comentarios** | Debe ser visualmente atractiva, accesible y generar confianza profesional. |

**Secuencia Normal:**

| # | Acción (Actor) | Reacción (Sistema) |
| :-: | :--- | :--- |
| 1 | El usuario ingresa a la URL principal de DocSmart. | El sistema carga y muestra la página de aterrizaje (Landing Page). |
| 2 | El usuario visualiza la información de servicios y especialidades. | El sistema presenta la propuesta de valor, asistente Bymax y beneficios. |
| 3 | El usuario hace clic en "Registrarse" o "Iniciar sesión". | El sistema redirige a la vista de autenticación correspondiente. |

**Excepciones:**

| # | Acción (Actor) | Reacción (Sistema) |
| :-: | :--- | :--- |
| 1 | Falla temporal del servidor web o API. | El navegador muestra mensaje estándar de servicio no disponible temporalmente. |

---

### CU-02: Inicio de sesión

| Campo | Detalle |
| :--- | :--- |
| **Código y Nombre** | **CU-02: Inicio de sesión** |
| **Descripción** | Permite a usuarios y administradores autenticar su identidad mediante credenciales registradas y acceder a la plataforma según su rol asignado. |
| **Actores** | Paciente, Médico, Administrador |
| **Precondiciones** | El usuario está registrado previamente y su cuenta se encuentra activa. |
| **Postcondiciones** | El sistema genera un token/sesión segura y redirige al panel según el rol. |
| **Rendimiento** | Validación y redirección en un tiempo máximo de 2 segundos. |
| **Frecuencia** | Alta (múltiples accesos al día). |
| **Importancia / Urgencia** | Vital / Inmediata |
| **Comentarios** | Las contraseñas viajan bajo HTTPS/TLS y se validan con hash seguro; se mitigan ataques de fuerza bruta. |

**Secuencia Normal:**

| # | Acción (Actor) | Reacción (Sistema) |
| :-: | :--- | :--- |
| 1 | El usuario ingresa su correo electrónico y contraseña. | El sistema captura los datos del formulario de inicio de sesión. |
| 2 | El usuario presiona el botón "Iniciar Sesión". | El sistema valida las credenciales contra la base de datos. |
| 3 | Las credenciales son válidas. | El sistema crea la sesión y redirige al dashboard del rol correspondiente. |

**Excepciones:**

| # | Acción (Actor) | Reacción (Sistema) |
| :-: | :--- | :--- |
| 1 | El usuario ingresa credenciales incorrectas. | El sistema muestra alerta de "Credenciales inválidas" sin revelar si el correo existe. |
| 2 | El médico intenta ingresar pero su cuenta sigue en estado "Pendiente". | El sistema bloquea el acceso a la agenda y notifica que su cuenta está en revisión. |
| 3 | Falla de conexión con la base de datos. | El sistema notifica que el servicio de autenticación no está disponible temporalmente. |

---

### CU-03: Registro de usuario

| Campo | Detalle |
| :--- | :--- |
| **Código y Nombre** | **CU-03: Registro de usuario** |
| **Descripción** | Permite a una persona no registrada crear una cuenta pública. Todo registro público recibe por defecto el rol Paciente. El rol Médico requiere validación administrativa de credenciales. |
| **Actores** | Usuarios no registrados |
| **Precondiciones** | El usuario cuenta con documento de identidad válido, correo accesible y acepta términos y condiciones. |
| **Postcondiciones** | Se crea una cuenta activa con el rol Paciente en la base de datos. |
| **Rendimiento** | Validación de campos en tiempo real (≤ 800 ms) y guardado total ≤ 3 segundos. |
| **Frecuencia** | Media (80 a 300 registros diarios). |
| **Importancia / Urgencia** | Vital / Inmediata |
| **Comentarios** | Ningún usuario puede autoasignarse el rol Médico desde el formulario público. |

**Secuencia Normal:**

| # | Acción (Actor) | Reacción (Sistema) |
| :-: | :--- | :--- |
| 1 | El usuario hace clic en "Registrarse". | El sistema despliega el formulario de registro de paciente. |
| 2 | El usuario diligencia sus datos personales y contraseña. | El sistema valida el formato de correo, documento y robustez de clave en tiempo real. |
| 3 | El usuario marca la casilla de términos y hace clic en "Crear Cuenta". | El sistema registra el nuevo paciente y confirma el registro exitoso. |

**Excepciones:**

| # | Acción (Actor) | Reacción (Sistema) |
| :-: | :--- | :--- |
| 1 | El correo electrónico o número de documento ya existen. | El sistema resalta el campo indicando que ya se encuentra registrado. |
| 2 | Las contraseñas no coinciden o no cumplen la longitud mínima. | El sistema bloquea el envío y muestra los requisitos de seguridad requeridos. |

---

### CU-04 Pantalla De Inicio

| Campo | Detalle |
| :--- | :--- |
| **Código y Nombre** | **CU-05: Pantalla De Inicio** |
| **Descipción** | Permite al usuario autenticado visualizar el panel principal de DocSmart y acceder a los módulos autorizados según su rol (Citas, Pacientes, IA Médica Bymax, Perfil y Cerrar sesión) | 
| **Actores** | Paciente, Médico, Administrador | 
| **Precondiciones** | 1. El usuario ha iniciado sesión correctamente. <br>2. Existe conexión activa con la base de datos y el servidor | 
| **PostCondiciones** | 1. El usuario accede a los módulos habilitados para su rol. <br>2. El sistema presenta la información personalizada del usuario | 
| **Rendimiento** | La carga del panel principal no debe exceder los 3 segundos | 
| **Frecuencia** | Alta (aproximadamente 300 veces al día durante la jornada) | 
| **Importacia/Urgencia** | Vital / Inmediata | 
| **Comentarios** | El contenido y los accesos rápidos cambian según el rol: el medico visualiza su agenda y métricas; el paciente ve sus citas próximas y accesos directos | 

**Secuencia Normal**

| # | Acción (Actor) | Reacción (Sistema) |
| :-: | :--- | :--- |
| 1 | El usuario completa exitosamente el inicio de sesión. | El sistema redirige al panel principal correspondiente a su rol. |
| 2 | El usuario visualiza su panel de control (Dashboard). | El sistema muestra los módulos autorizados (Citas, Pacientes, Bymax, Perfil, etc.). |
| 3 | El usuario selecciona un módulo específico. | El sistema carga y despliega la información del módulo elegido. |
| 4 | El usuario interactúa con las funciones del módulo. | El sistema ejecuta y valida la operación seleccionada. |

**Excepciones**

| # | Acción (Actor) | Reacción (Sistema) |
| :-: | :--- | :--- |
| 1 | La sesion del Usuario Ha expirado Por inactividad | El sistema redirige automáticamenteal formulario de autenticaciÓn (CU-02) |
| 2 | Falla la comunicación  con el servidor o la base de datos | El sistema muestra una alerta indicando que el servidor no se encuentra disponible temporalmente. |


### CU-05: Chatbot de asistencia médica (Bymax)

| Campo | Detalle |
| :--- | :--- |
| **Código y Nombre** | **CU-05: Chatbot de asistencia médica (Bymax)** |
| **Descripción** | Permite al paciente interactuar con el asistente inteligente para recibir orientación informativa de síntomas, estado de ánimo y apoyo operativo para sus citas. |
| **Actores** | Paciente autenticado |
| **Precondiciones** | Paciente con sesión iniciada y conectividad activa con el backend. |
| **Postcondiciones** | La conversación y el contexto clínico quedan almacenados en la sesión del usuario. |
| **Rendimiento** | Respuesta generada en menos de 3 segundos bajo condiciones normales. |
| **Frecuencia** | Continua (aproximadamente 300 interacciones diarias). |
| **Importancia / Urgencia** | Vital / Alta |
| **Comentarios** | Bymax siempre incluye aviso legal de que no sustituye el diagnóstico de un médico profesional. |

**Secuencia Normal:**

| # | Acción (Actor) | Reacción (Sistema) |
| :-: | :--- | :--- |
| 1 | El paciente abre la ventana del asistente Bymax. | El sistema saluda y presenta las opciones de consulta por texto o voz. |
| 2 | El paciente escribe o dicta sus síntomas o consulta de citas. | Bymax analiza la intención mediante el LLM y recupera el contexto del usuario. |
| 3 | El paciente recibe la respuesta y recomendaciones. | Bymax sugiere especialidades o muestra información de citas con descargo médico. |

**Excepciones:**

| # | Acción (Actor) | Reacción (Sistema) |
| :-: | :--- | :--- |
| 1 | El paciente reporta síntomas de emergencia crítica (dolor en pecho, dificultad respiratoria severa). | Bymax emite una alerta prioritaria indicando acudir de inmediato a urgencias. |
| 2 | El servicio externo de IA no responde o supera el tiempo límite. | El sistema activa un mensaje de respaldo disculpándose y sugiriendo agendar directamente. |

---

### CU-06: Gestión integral de citas

| Campo | Detalle |
| :--- | :--- |
| **Código y Nombre** | **CU-06: Gestión integral de citas** |
| **Descripción** | Permite consultar, agendar, reprogramar y cancelar citas médicas aplicando la regla de negocio de cancelación con mínimo 24 horas de antelación. |
| **Actores** | Paciente, Médico |
| **Precondiciones** | Usuario autenticado; médicos con disponibilidad horaria configurada. |
| **Postcondiciones** | La cita cambia de estado (*Pendiente*, *Confirmada*, *Cancelada* o *Completada*) con notificación a las partes. |
| **Rendimiento** | Confirmación y persistencia de la cita en menos de 2 segundos. |
| **Frecuencia** | Muy alta durante toda la jornada. |
| **Importancia / Urgencia** | Vital / Alta |
| **Comentarios** | Las operaciones se procesan bajo transacciones atómicas para prevenir citas duplicadas en el mismo horario. |

**Secuencia Normal:**

| # | Acción (Actor) | Reacción (Sistema) |
| :-: | :--- | :--- |
| 1 | El paciente busca un médico o especialidad y elige una fecha. | El sistema consulta y muestra los bloques horarios disponibles. |
| 2 | El paciente selecciona un horario y confirma la cita. | El sistema reserva la cita, actualiza la agenda y notifica a médico y paciente. |
| 3 | El paciente solicita cancelar una cita existente con > 24 horas de antelación. | El sistema valida el tiempo restante, cancela la cita y libera el bloque horario. |

**Excepciones:**

| # | Acción (Actor) | Reacción (Sistema) |
| :-: | :--- | :--- |
| 1 | El horario seleccionado fue tomado simultáneamente por otro usuario. | El sistema notifica que el turno ya no está disponible y solicita elegir otro. |
| 2 | El paciente intenta cancelar con menos de 24 horas de antelación. | El sistema rechaza la solicitud de cancelación aplicando la regla de negocio RN-01. |

---

### CU-07: Consulta y adición al historial clínico

| Campo | Detalle |
| :--- | :--- |
| **Código y Nombre** | **CU-07: Consulta y adición al historial clínico** |
| **Descripción** | Permite al médico consultar los antecedentes del paciente y agregar nuevas evoluciones clínicas bajo un modelo inmutable (*append-only*). |
| **Actores** | Médico |
| **Precondiciones** | Médico autenticado, validado y con cita asignada con el paciente. |
| **Postcondiciones** | Nueva entrada clínica guardada con autor, fecha, hora y versión inalterable. |
| **Rendimiento** | Carga del historial y guardado de evolución en menos de 2 segundos. |
| **Frecuencia** | Alta durante las consultas médicas. |
| **Importancia / Urgencia** | Alta / Alta |
| **Comentarios** | Las historias clínicas no permiten operaciones `UPDATE` ni `DELETE` sobre registros consolidados para cumplir normativa legal. |

**Secuencia Normal:**

| # | Acción (Actor) | Reacción (Sistema) |
| :-: | :--- | :--- |
| 1 | El médico accede al expediente del paciente en consulta. | El sistema muestra los antecedentes y consultas previas en orden cronológico. |
| 2 | El médico diligencia el diagnóstico, motivo de consulta y tratamiento. | El sistema valida los campos clínicos obligatorios. |
| 3 | El médico presiona "Guardar Registro Clínico". | El sistema almacena la nueva entrada, asocia la versión y cierra la atención. |

**Excepciones:**

| # | Acción (Actor) | Reacción (Sistema) |
| :-: | :--- | :--- |
| 1 | El médico intenta modificar un registro clínico de una consulta pasada. | El sistema bloquea la edición y exige crear una nota aclaratoria o adenda. |


### CU-08: Editar perfil

| Campo | Detalle |
| :--- | :--- |
| **Código y Nombre** | **CU-08: Editar perfil** |
| **Descripción** | Permite al usuario autenticado actualizar sus datos personales y de contacto. Ningún usuario puede modificar su propio rol desde esta sección; cualquier actualización en las credenciales profesionales de un médico requiere validación administrativa. |
| **Actores** | Paciente, Médico, Administrador |
| **Precondiciones** | El usuario ha iniciado sesión correctamente en la plataforma y tiene acceso a su perfil. |
| **Postcondiciones** | La información actualizada se persiste de forma segura en la base de datos y se refleja en la interfaz. |
| **Rendimiento** | La actualización y confirmación deben completarse en un tiempo máximo de 2 segundos. |
| **Frecuencia** | Baja a media (ocasional por usuario). |
| **Importancia / Urgencia** | Importante / Media |
| **Comentarios** | El módulo debe admitir el cambio seguro de contraseña mediante verificación de la clave actual y validación de políticas de seguridad. |

**Secuencia Normal:**

| # | Acción (Actor) | Reacción (Sistema) |
| :-: | :--- | :--- |
| 1 | El usuario selecciona la opción "Perfil" en la navegación. | El sistema carga y muestra los datos personales y de contacto registrados actualmente. |
| 2 | El usuario edita los campos habilitados (teléfono, dirección, foto, etc.). | El sistema valida en tiempo real el formato de los datos modificados. |
| 3 | El usuario hace clic en "Guardar cambios". | El sistema procesa la solicitud, actualiza el registro en la base de datos y muestra un mensaje de confirmación exitosa. |

**Excepciones:**

| # | Acción (Actor) | Reacción (Sistema) |
| :-: | :--- | :--- |
| 1 | El usuario ingresa un dato con formato incorrecto (ej. correo inválido o número incompleto). | El sistema rechaza el guardado, resalta el campo con error y muestra el mensaje correctivo correspondiente. |
| 2 | El usuario intenta forzar el cambio de su rol o modificar campos bloqueados. | El sistema deniega la acción, mantiene inalterados los privilegios y registra el intento para auditoría. |
| 3 | Falla la comunicación con el servidor al momento de guardar. | El sistema notifica que no fue posible guardar los cambios e invita a reintentar la operación. |

---

### CU-09: Desactivar usuario (Administrador)

| Campo | Detalle |
| :--- | :--- |
| **Código y Nombre** | **CU-09: Desactivar usuario (Administrador)** |
| **Descripción** | Permite al administrador inhabilitar la cuenta de un paciente o médico ante una causa justificada, suspendiendo su acceso al sistema sin eliminar los registros clínicos ni la trazabilidad legal obligatoria. |
| **Actores** | Administrador |
| **Precondiciones** | 1. El administrador ha iniciado sesión con privilegios de gestión.<br>2. La cuenta del usuario objetivo existe y se encuentra en estado activo.<br>3. Se cuenta con un motivo documentado para la desactivación. |
| **Postcondiciones** | La cuenta pasa a estado inactivo, se invalidan sus sesiones activas y se registra el evento en el log de auditoría (usuario responsable, fecha, hora y motivo). Los datos clínicos permanecen intactos. |
| **Rendimiento** | El proceso de desactivación e invalidación de sesión debe ejecutarse en un máximo de 3 segundos. |
| **Frecuencia** | Baja (entre 1 y 15 veces al mes por administrador). |
| **Importancia / Urgencia** | Importante / Alta |
| **Comentarios** | La desactivación no constituye un borrado físico de la base de datos (`DELETE`). La información clínica e histórica se mantiene inalterable por normativa de retención legal (Ley 1581 de 2012 y Ley 2015 de 2020). |

**Secuencia Normal:**

| # | Acción (Actor) | Reacción (Sistema) |
| :-: | :--- | :--- |
| 1 | El administrador ingresa al panel de gestión de usuarios y busca la cuenta objetivo. | El sistema lista los resultados coincidentes y permite seleccionar el perfil del usuario. |
| 2 | El administrador selecciona la opción "Desactivar usuario". | El sistema despliega un modal con el resumen del perfil y solicita el motivo de la acción. |
| 3 | El administrador ingresa o selecciona el motivo de la desactivación. | El sistema valida que el campo de motivo no esté vacío y habilita la confirmación. |
| 4 | El administrador confirma la desactivación. | El sistema cambia el estado de la cuenta a inactiva, revoca los tokens de sesión activos, registra la auditoría y notifica el éxito de la operación. |

**Excepciones:**

| # | Acción (Actor) | Reacción (Sistema) |
| :-: | :--- | :--- |
| 1 | El administrador intenta confirmar la acción sin ingresar un motivo. | El sistema bloquea la acción y exige el diligenciamiento obligatorio del motivo. |
| 2 | Falla la conexión con la base de datos durante la transacción. | El sistema revierte los cambios, mantiene el estado previo y notifica que el servicio no está disponible temporalmente. |

---

### CU-10: Agregar nuevo servicio

| Campo | Detalle |
| :--- | :--- |
| **Código y Nombre** | **CU-10: Agregar nuevo servicio** |
| **Descripción** | Permite al administrador parametrizar y habilitar un nuevo servicio o especialidad médica en el catálogo general para que los pacientes puedan consultarlo y agendar citas. |
| **Actores** | Administrador |
| **Precondiciones** | El administrador está autenticado con permisos de administración sobre los catálogos del sistema. |
| **Postcondiciones** | El servicio queda registrado en la base de datos con estado activo y disponible para la asignación de médicos y agendamiento de citas. |
| **Rendimiento** | Registro y respuesta de confirmación en un tiempo máximo de 5 segundos. |
| **Frecuencia** | Ocasional (según la ampliación o actualización de la oferta médica de la plataforma). |
| **Importancia / Urgencia** | Alta / Alta |
| **Comentarios** | El sistema debe validar que el nombre del servicio o especialidad sea único dentro del catálogo para evitar duplicidades en los filtros de búsqueda. |

**Secuencia Normal:**

| # | Acción (Actor) | Reacción (Sistema) |
| :-: | :--- | :--- |
| 1 | El administrador ingresa al módulo de gestión de servicios. | El sistema muestra el listado de servicios activos y el botón "Agregar servicio". |
| 2 | El administrador hace clic en "Agregar servicio". | El sistema despliega el formulario con los campos: nombre, descripción, duración estimada y precio/categoría. |
| 3 | El administrador completa la información solicitada y confirma el registro. | El sistema valida que los campos obligatorios sean correctos y que el nombre no esté duplicado. |
| 4 | Los datos son válidos y se confirma la creación. | El sistema guarda el nuevo servicio en el catálogo, lo activa y muestra un mensaje de confirmación. |

**Excepciones:**

| # | Acción (Actor) | Reacción (Sistema) |
| :-: | :--- | :--- |
| 1 | El administrador intenta registrar el servicio dejando campos obligatorios en blanco. | El sistema resalta los campos vacíos y no permite enviar el formulario. |
| 2 | El nombre del servicio ya existe en el catálogo. | El sistema notifica que ya existe un servicio registrado con ese nombre y solicita modificarlo. |
| 3 | Ocurre un error de persistencia en la base de datos. | El sistema informa que no fue posible guardar el servicio y solicita reintentar. |