- [Regresar - Página Princiapl](../../README.md)


# 💬 Flujo Conversacional y Lógica de Negocio - Bymax

## 📌 1. Visión General
El módulo conversacional de **Bymax** administra el ciclo de vida de la interacción textual y multimodal con los usuarios (Pacientes, Doctores y Administradores) dentro de la plataforma DocSmart[cite: 11]. Su objetivo principal es procesar las intenciones (*intents*), recopilar información de síntomas o consultas operativas de citas, y entregar respuestas contextualizadas acompañadas de los avisos legales de responsabilidad médica obligatorios.

---

## 📂 2. Mapeo Archivo por Archivo (Frontend & Backend)

### 🎨 Frontend (Next.js / React)

#### 1. `components/bymax/BymaxLauncher.jsx`
* **Responsabilidad**: Botón flotante y gatillador de la interfaz.
* **Flujo**:
  - Renderiza el icono flotante del asistente en la esquina de la pantalla.
  - Escucha el evento `onClick` del usuario para alternar la visibilidad de la ventana del chat.
  - Consulta `useBymaxIdentity.js` para verificar si el usuario tiene sesión activa antes de abrir el modal.

#### 2. `components/bymax/BymaxAssistant.jsx`
* **Responsabilidad**: Orquestador y contenedor principal del estado conversacional.
* **Flujo**:
  - Mantiene el estado global del chat (lista de mensajes, estado de carga `isTyping`, sesión activa).
  - Coordina la interacción entre la barra de entrada (`BymaxComposer.jsx`), la ventana de mensajes (`BymaxChatWindow.jsx`) y el selector de estado de ánimo (`BymaxMood.jsx`).
  - Llama a `bymaxServices.js` para enviar el mensaje y gestionar la promesa de respuesta.

#### 3. `components/bymax/BymaxComposer.jsx`
* **Responsabilidad**: Barra de entrada de texto y control multimedia.
* **Flujo**:
  - Captura el texto introducido por el usuario mediante teclado.
  - Contiene el botón de micrófono que se vincula con `useBymaxVoice.js` para alternar la grabación de voz.
  - Al presionar *Enter* o *Enviar*, emite el payload del mensaje al componente padre `BymaxAssistant.jsx`.

#### 4. `components/bymax/BymaxChatWindow.jsx` & `BymaxMessage.jsx`
* **Responsabilidad**: Renderizado visual del historial de la conversación.
* **Flujo**:
  - `BymaxChatWindow`: Mapea el arreglo de mensajes, aplicando un scroll automático hacia abajo cada vez que llega una nueva respuesta.
  - `BymaxMessage`: Renderiza individualmente cada burbuja con estilos diferenciados por emisor (`user`, `bymax`, `system`). Incluye badges de sugerencias y tarjetas de aviso legal.

#### 5. `components/bymax/BymaxMood.jsx` & `AnimatedMoodOption.jsx`
* **Responsabilidad**: Módulo de seguimiento del estado de ánimo (Mood Tracker).
* **Flujo**:
  - Permite al paciente seleccionar una emoción/estado anímico (ej. *Ansioso*, *Neutral*, *Adolorido*).
  - Añade la variable `mood` al contexto que se enviará en el payload al backend para que el modelo adapte la empatía de su respuesta.

#### 6. `components/bymax/BymaxDoctorContext.jsx` & `BymaxDiagnostics.jsx`
* **Responsabilidad**: Panel contextual para el rol de Médico/Doctor.
* **Flujo**:
  - Detecta si el rol activo es `Doctor`.
  - Inyecta la información del paciente en consulta activa (sintomatología previa, historial) al prompt del asistente para ofrecer sugerencias clínicas y soporte en decisiones.

#### 7. `src/app/services/bymaxServices.js`
* **Responsabilidad**: Cliente HTTP de comunicación con la API.
* **Flujo**:
  - Recibe el texto, estado de ánimo y contexto de rol desde el frontend.
  - Realiza la petición HTTP `POST /api/v1/bymax/chat` utilizando Axios.
  - Incluye automáticamente las cookies de autenticación JWT y maneja reintentos en caso de fallos de red.

---

### ⚙️ Backend (Django REST Framework)

#### 8. `backend/chatbot/urls.py`
* **Responsabilidad**: Enrutamiento de URLs de la API del chatbot.
* **Flujo**: Mapea la ruta `/api/v1/bymax/chat/` hacia la vista correspondiente (`ChatAPIView`) en `views.py`.

#### 9. `backend/chatbot/views.py`
* **Responsabilidad**: Controlador de entrada de solicitudes HTTP.
* **Flujo**:
  - Extrae el token JWT de las cookies para validar la autenticación (`RNF-002`).
  - Obtiene los datos de la solicitud y los pasa a `serializers.py` para su validación.
  - Invoca la capa de servicios `chatbot/services.py` y retorna la respuesta en formato JSON estructurado.

#### 10. `backend/chatbot/serializers.py`
* **Responsabilidad**: Validación y serialización de datos de entrada/salida.
* **Flujo**:
  - Valida que el campo `message` no esté vacío y cumpla con la longitud requerida.
  - Sanitiza el texto de entrada para evitar inyecciones o mensajes maliciosos.

#### 11. `backend/chatbot/services.py`
* **Responsabilidad**: Lógica de negocio principal y conexión con la IA.
* **Flujo**:
  - Evalúa la intención del mensaje:
    - **Consulta médica**: Construye un prompt del sistema (*System Prompt*) inyectando las directrices de salud, advertencia legal obligatoria y el estado de ánimo (`mood`) del usuario.
    - **Consulta operativa de citas**: Ejecuta una consulta ORM a la app `citas` para obtener las citas del paciente.
  - Realiza la llamada segura a **OPENAI API** utilizando la clave guardada en el archivo `.env` (`RN-010`).
  - Formatea la respuesta recibida y solicita el guardado del historial.

#### 12. `backend/chatbot/models.py`
* **Responsabilidad**: Persistencia de datos en MySQL.
* **Flujo**:
  - Almacena la sesión en la tabla `Chat` vinculada al identificador del usuario (`user_id`).
  - Inserta los mensajes de entrada y salida en la tabla `Message` para conservar el historial completo de la conversación.

---

## 🔄 3. Diagrama de Secuencia del Flujo Conversacional

![Flujo_conversacional_Bymax](../img/flujo_consersacional.jfif)