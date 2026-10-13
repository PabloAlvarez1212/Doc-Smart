- [Regresar - Página Princial](../../README.md)

# 🌐 Catálogo de Endpoints y Servicios Web (API REST & WebSockets) — DocSmart

> **Proyecto:** DocSmart — Plataforma de Gestión Médica y Asistente Clínico Inteligente  
> **Área:** Implementación técnica / Backend  
> **Base URL:** `http://localhost:8000/api` (Desarrollo) | `https://docsmart.site/api` (Producción)  
> **WebSocket URL:** `ws://localhost:8000/ws` | `wss://docsmart.site/ws`  
> **Formato de intercambio:** `application/json`  
> **Autenticación:** JWT (JSON Web Tokens) en cabecera `Authorization: Bearer <token>` o Cookies HTTP-Only seguras  

---

## 📋 1. Convenciones Generales de la API

### 1.1. Estructura de Respuesta Exitosa (2xx)
```json
{
  "ok": true,
  "mensaje": "Operación realizada correctamente",
  "data": {}
}
```
### 1.1. Estructura de Respuesta Exitosa (4xx / 5xx)

```json
{
  "ok": false,
  "mensaje": "Descripción concisa del error",
  "errores": {
    "campo": ["Detalle del error de validación"]
  }
}
```
### 1.3. Códigos de Estado HTTP Utilizados

- `200 OK`: Consulta o actualización exitosa.
- `201 Created`: Recurso creado exitosamente (usuario, cita, registro clínico).
- 204 No Content: Eliminación o acción sin cuerpo de respuesta.
- `400 Bad Request`: Datos de entrada inválidos o faltantes.
- `401 Unauthorized`: No autenticado o token vencido/inválido.
- `403 Forbidden`: Autenticado pero sin permisos para el rol requerido.
- `404 Not Found`: Recurso no encontrado.
- `409 Conflict`: Conflicto de negocio (ej. horario de cita ya ocupado).
- `429 Too Many Requests`: Exceso de peticiones (Rate Limiting).
- `500 Internal Server Error`: Error no controlado en el servidor.

---

## 🔐 2. Autenticación y Control de Acceso (`/api/`)

| Método | Endpoint | Acceso | Descripción |
| :---: | :--- | :---: | :--- |
| `POST` | `/api/login/` | Público | Autentica usuario (correo y contraseña), retorna token JWT y datos de rol. |
| `POST` | `/api/logout/` | Autenticado | Invalida la sesión actual y limpia cookies seguras de autenticación. |
| `POST` | `/api/usuarios/registro/` | Público | Registra un nuevo paciente en la plataforma (Rol Paciente por defecto). |
| `POST` | `/api/solicitar-cambio/` | Público | Solicita restablecimiento de contraseña; envía correo con token de recuperación. |
| `POST` | `/api/cambiar-contraseña/` | Público (Token) | Define una nueva contraseña enviando el token de restablecimiento. |

#### Ejemplo Payload: `POST /api/login/`
```json
{
  "correo": "paciente@correo.com",
  "password": "Password123*"
}
```

---

## 👤 3. Gestión de Usuarios y Perfiles (`/api/usuarios/` & `/api/perfil/`)

| Método | Endpoint | Acceso | Descripción |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/perfil/` | Autenticado | Obtiene la información del perfil del usuario en sesión. |
| `PUT` | `/api/perfil/` | Autenticado | Actualiza datos personales y de contacto del usuario en sesión. |
| `PATCH` | `/api/perfil/foto/` | Autenticado | Sube o reemplaza la foto de perfil (`multipart/form-data`). |
| `DELETE` | `/api/perfil/foto/` | Autenticado | Elimina la foto de perfil actual del usuario. |
| `GET` | `/api/dashboard/inicio/paciente/` | Paciente | Carga métricas y accesos rápidos de la página de inicio del paciente. |
| `GET` | `/api/usuarios/` | Admin | Lista usuarios con paginación y filtros por rol, estado o búsqueda. |
| `GET` | `/api/usuarios/<id>/` | Admin | Detalle de un usuario específico. |
| `PUT` | `/api/usuarios/<id>/` | Admin | Modifica datos o rol de un usuario existente. |
| `PATCH` | `/api/usuarios/<id>/desactivar/` | Admin | Inactiva la cuenta de un usuario requiriendo motivo obligatorio. |

---

## 🩺 4. Módulo Médico y Disponibilidad (`/api/medicos/`)

| Método | Endpoint | Acceso | Descripción |
| :---: | :--- | :---: | :--- |
| `POST` | `/api/medicos/registro/` | Público | Registro inicial de profesional médico con carga de soportes de acreditación. |
| `GET` | `/api/medicos/` | Público / Auth | Lista médicos activos, con filtros por especialidad, ciudad y nombre. |
| `GET` | `/api/medicos/<id>/` | Público / Auth | Perfil público y profesional del médico seleccionado. |
| `GET` | `/api/medicos/dashboard/inicio/` | Médico | Métricas del home médico (citas del día, pacientes atendidos, agenda). |
| `GET` | `/api/medicos/disponibilidad/` | Médico | Consulta la configuración semanal de horarios y duración de consulta. |
| `POST` | `/api/medicos/disponibilidad/` | Médico | Crea o actualiza franjas horarias de atención recurrente. |
| `GET` | `/api/medicos/excepciones/` | Médico | Lista bloqueos de horario (permisos, vacaciones, ausencias). |
| `POST` | `/api/medicos/excepciones/` | Médico | Registra un nuevo bloqueo de fecha/hora en la agenda. |
| `DELETE` | `/api/medicos/excepciones/<id>/` | Médico | Elimina un bloqueo de excepción liberando el horario. |
| `GET` | `/api/medicos/solicitudes/` | Admin | Bandeja administrativa de médicos pendientes de verificación. |
| `POST` | `/api/medicos/<id>/validar/` | Admin | Aprueba o rechaza credenciales médicas (si rechaza, exige motivo). |

---

## 📅 5. Agendamiento y Ciclo de Vida de Citas (`/api/citas/`)

| Método | Endpoint | Acceso | Descripción |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/citas/` | Autenticado | Lista citas del usuario (paciente ve sus citas; médico ve las asignadas). |
| `POST` | `/api/citas/` | Paciente | Reserva una cita médica validando disponibilidad en tiempo real. |
| `GET` | `/api/citas/<id>/` | Autenticado | Consulta el detalle específico de una cita médica. |
| `POST` | `/api/citas/<id>/reprogramar/` | Paciente / Médico | Cambia fecha y hora de la cita sujeta a disponibilidad futura. |
| `POST` | `/api/citas/<id>/cancelar/` | Paciente / Médico | Cancela la cita (Paciente: sujeto a regla de ≥ 24h de antelación). |
| `POST` | `/api/citas/<id>/completar/` | Médico | Cierre clínico de la atención médica con registro de observaciones. |
| `POST` | `/api/citas/<id>/inasistencia/` | Médico | Marca inasistencia del paciente al expirar la ventana de atención. |

#### Ejemplo Payload: `POST /api/citas/`
```json
{
  "id_medico": 14,
  "fecha_cita": "2026-10-20",
  "hora_inicio": "09:30:00",
  "motivo_consulta": "Dolor lumbar persistente"
}
```

---

## 📋 6. Historial Clínico Digital (`/api/historial-medico/`)

| Método | Endpoint | Acceso | Descripción |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/historial-medico/paciente/<id>/` | Paciente / Médico | Consulta cronológica del historial clínico autorizado. |
| `POST` | `/api/historial-medico/` | Médico | Crea una nueva evolución clínica inmutable (*Append-only*). |
| `GET` | `/api/historial-medico/<id>/` | Autenticado | Consulta el detalle y versiones de una entrada clínica específica. |
| `POST` | `/api/historial-medico/<id>/adenda/` | Médico | Anexa una nota aclaratoria o adenda sin alterar el registro original. |

#### Ejemplo Payload: `POST /api/historial-medico/`
```json
{
  "id_cita": 108,
  "id_paciente": 45,
  "diagnostico_principal": "Lumbago no especificado (M54.5)",
  "motivo_consulta": "Paciente refiere dolor agudo de 5 días de evolución",
  "tratamiento": "Reposo relativo, AINEs por 5 días y control si no mejora",
  "observaciones": "Sin signos de alarma neurológica"
}
```
## 🤖 7. Asistente Clínico Inteligente Bymax (/api/chatbot/)

| Método | Endpoint | Acceso | Descripción |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/chatbot/conversaciones/` | Paciente/Médico | Obtiene el historial de sesiones de conversación con Bymax. |
| `POST` | `/api/chatbot/conversaciones/` | Paciente/Médico | Inicializa una nueva sesión conversacional. |
| `POST` | `/api/chatbot/mensaje/` | Paciente/Médico | Envía mensaje de texto; procesa router de LLM, tools y responde. |
| `POST` | `/api/chatbot/audio/` | Paciente/Médico | Carga audio de voz del paciente para transcripción y procesamiento. |
| `POST` | `/api/chatbot/sintesis-voz/` | Paciente/Médico | Solicita audio sintetizado (ElevenLabs) de la respuesta de texto. |
| `GET` | `/api/chatbot/estado-animo/` | Paciente | Consulta histórico de registros emocionales del paciente. |
| `POST` | `/api/chatbot/estado-animo/` | Paciente | Registra el estado anímico diario reportado en la interacción. |

| `DELETE` | `/api/chatbot/conversaciones/<id>/` | Paciente/Médico | Elimina la conversación seleccionada. |

### Ejemplo Payload: POST /api/chatbot/mensaje/
```json
{
    "id_conversacion": 12,
    "mensaje": "Hola Bymax, tengo un dolor de cabeza punzando desde ayer"
}
```

## 💬 8. Chat Privado Médico-Paciente (/api/chat-citas/)

| Método | Endpoint | Acceso | Descripción |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/chat-citas/sala/<id_cita>/` | Paciente/Médico | Retorna el historial de mensajes de la sala vinculada a la cita. |
| `POST` | `/api/chat-citas/mensaje/` | Paciente/Médico | Envío de mensaje vía HTTP fallback (cuando no hay WebSocket activo). |
| `POST` | `/api/chat-citas/lectura/` | Paciente/Médico | Marca mensajes como leídos por el receptor. |
| `POST` | `api/chat-citas/adjunto/` | Paciente/Médico | Carga documento o imagen para compartir dentro del chat |

### Ejemplo Payload: POST /api/chat-citas/mensaje/
```json
{
  "id_cita": 108,
  "mensaje": "Buenas tardes doctor, le adjunto el reporte de laboratorio.",
  "id_adjunto": null
}
```

## 🔔 9. Notificaciones (/api/notificaciones/)

| Método | Endpoint | Acceso | Descripción |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/notificaciones/` | Autenticado | Lista notificaciones del usuario ordenadas por fecha reciente. |
| `PATCH` | `/api/notificaciones/<id>/leer/` | Autenticado | Marca una notificación específica como leída. |
| `PATCH` | `/api/notificaciones/marcar-todas/` | Autenticado | Marca todas las notificaciones pendientes como leídas. |

### Ejemplo Respuesta: GET /api/notificaciones/

```json
{
  "ok": true,
  "mensaje": "Notificaciones obtenidas correctamente",
  "data": [
    {
      "id": 1,
      "tipo": "CITA_CONFIRMADA",
      "titulo": "Cita Confirmada",
      "mensaje": "Tu cita médica ha sido confirmada para mañana a las 09:00 AM.",
      "leido": false,
      "fecha_creacion": "2026-10-13T08:30:00Z"
    }
  ]
}
```

## 📁 10. Custodia y Almacenamiento de Archivos (/api/storage/)

| Método | Endpoint | Acceso | Descripción |
| :---: | :--- | :---: | :--- |
| `POST` | `/api/storage/upload/` | Autenticado | Sube archivo con validación MIME, tamaño (≤ 10MB) y cálculo SHA-256. |
| `PATCH` | `/api/storage/archivo/<id>/` | Autenticado | Descarga o visualiza archivo protegido mediante URL firmada/token. |

### Parámetros multipart/form-data: POST /api/storage/upload/

- **File:** Archivo binario (PDF, JPG, PNG)
- **Categoria:** Tipo de documento ( SOPORTE_MEDICO, HISTORIA_CLINICA, CHAT_ADJUNTO)
 
### 📚 11. Catálogos y Tablas Maestras (`/api/catalogos/`)

| Método | Endpoint | Acceso | Descripción |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/catalogos/departamentos/` | Público | Lista todos los departamentos disponibles de Colombia.[cite: 1] |
| `GET` | `/api/catalogos/departamentos/<id>/ciudades/` | Público | Lista las ciudades pertenecientes a un departamento.[cite: 1] |
| `GET` | `/api/catalogos/ciudades/` | Público | Lista completa de ciudades registradas.[cite: 1] |
| `POST` | `/api/catalogos/ciudades/` | Admin | Registra una nueva ciudad en el catálogo.[cite: 1] |
| `GET` | `/api/catalogos/especialidades/` | Público | Lista de especialidades médicas activas.[cite: 1] |
| `POST` | `/api/catalogos/especialidades/` | Admin | Crea una nueva especialidad médica.[cite: 1] |
| `GET` | `/api/catalogos/roles/` | Admin | Consulta de roles del sistema.[cite: 1] |
| `POST` | `/api/catalogos/roles/` | Admin | Crea un nuevo rol en el catálogo.[cite: 1] |
| `GET` | `/api/catalogos/estados/` | Admin | Consulta de estados maestros de citas y usuarios.[cite: 1] |
| `POST` | `/api/catalogos/estados/` | Admin | Crea un nuevo estado maestro.[cite: 1] |
| `GET` | `/api/catalogos/medios/` | Admin | Consulta de medios de atención o canales.[cite: 1] |
| `GET` | `/api/public/metrics/` | Público | Métricas agregadas para la landing page (total médicos, pacientes, citas). |

---

## ⚡ 12. Protocolos de Tiempo Real (WebSockets / ASGI)

### 12.1. Chat por Cita Médica

- **Ruta De Conexión:** ws://<host>/ws/chat-citas/<id_cita>/?token=<jwt_token>
- **Consumer:** backend/chat_citas/consumers.py
- **Evento Enviar Mensaje (Cliente -> Servidor):**
```json
{
  "type": "chat_message",
  "mensaje": "Doctor, ya tengo listos los resultados de laboratorio.",
  "id_adjunto": null
}
```
- **Evento Recibir Mensaje (Servidor -> Cliente / Broadcast):**
```json
{
  "id_mensaje": 512,
  "remitente_id": 45,
  "nombre_remitente": "Carlos Gómez",
  "mensaje": "Doctor, ya tengo listos los resultados de laboratorio.",
  "fecha_envio": "2026-10-13T10:15:30Z"
}
```

---

### 12.2. Notificaciones en Vivo

- **Ruta de Conexión:** ws://<host>/ws/notificaciones/?token=<jwt_token>
- **Consumer:** backend/notificaciones/consumers.py
- **Payload Evento Entrante (Servidor -> Cliente):**
```json
{
  "tipo": "CITA_CONFIRMADA",
  "titulo": "Cita Confirmada",
  "descripcion": "El Dr. Álvarez ha confirmado su cita para el 20 de Octubre.",
  "timestamp": "2026-10-13T10:16:00Z"
}
```
