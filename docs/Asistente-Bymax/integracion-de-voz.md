- [Regresar - Página Princiapl](../../README.md)

# 🔊 Integración y Control de Voz - Bymax

## 📌 1. Visión General
El subsistema de voz de **Bymax** habilita la capacidad de interacción por voz en tiempo real (*Speech-to-Text* y *Text-to-Speech*). Permite que los pacientes o médicos hablen directamente con el asistente y escuchen las respuestas procesadas sin necesidad de escribir en pantalla.

---

## 📂 2. Mapeo Archivo por Archivo del Subsistema de Voz

### 🎨 Frontend (JavaScript / Web Audio API)

#### 1. `components/bymax/hooks/useBymaxVoice.js`
* **Responsabilidad**: Hook de React que expone el estado y controles de voz a los componentes.
* **Flujo**:
  - Proporciona las funciones `startListening()`, `stopListening()` y `speakResponse()`.
  - Expone variables de estado reactivas: `isListening`, `isSpeaking`, `audioLevel` y `voiceError`.
  - Se conecta con `BymaxComposer.jsx` para mostrar animaciones de ondas de audio mientras el usuario habla.

#### 2. `components/bymax/voice/bymaxVoiceSession.mjs`
* **Responsabilidad**: Gestión del ciclo de vida del Búfer de Audio y la conexión de entrada.
* **Flujo**:
  - Solicita acceso al micrófono del navegador usando `navigator.mediaDevices.getUserMedia()`.
  - Inicializa el `AudioContext` para capturar el flujo de voz (*AudioStream*).
  - Aplica filtros de cancelación de eco y reducción de ruido en el navegador antes de enviar los *chunks* de audio.

#### 3. `components/bymax/voice/bymaxSpeechUnits.mjs`
* **Responsabilidad**: Procesamiento de fragmentos fónicos para Síntesis de Habla (TTS).
* **Flujo**:
  - Recibe el texto de respuesta generado por el backend de Bymax.
  - Divide el texto en "unidades de habla" (oraciones cortas o cláusulas basadas en signos de puntuación).
  - Prepara cada unidad fónica de forma secuencial para evitar pausas o saltos abruptos durante la reproducción.

#### 4. `components/bymax/voice/bymaxVoiceController.mjs`
* **Responsabilidad**: Controlador del reproductor de audio e interrupciones.
* **Flujo**:
  - Utiliza la Web Speech API (`SpeechSynthesisUtterance`) o un motor TTS web para reproducir el audio.
  - Escucha interrupciones del usuario: si el usuario vuelve a presionar el micrófono mientras Bymax está hablando, detiene inmediatamente la reproducción del audio activo.

---

### ⚙️ Backend (Servicios de Audio / STT & TTS)

#### 5. `backend/chatbot/views.py` (Endpoint de Audio)
* **Responsabilidad**: Recepción de stream o archivo de audio enviado por el usuario.
* **Flujo**:
  - Recibe la petición `POST /api/v1/bymax/voice/` conteniendo el archivo o blob de audio (`audio/webm` o `audio/wav`).
  - Transfiere el payload a la capa de servicios para transcripción.

#### 6. `backend/chatbot/services.py` (Procesamiento STT)
* **Responsabilidad**: Conversión de Voz a Texto (*Speech-to-Text*).
* **Flujo**:
  - Envía el blob de audio al modelo de reconocimiento de voz (ej. Gemini Audio Input o servicio STT).
  - Retorna la transcripción en texto plano.
  - Reutiliza la lógica conversacional del flujo de texto para procesar la respuesta y generar el audio de salida (*TTS*).


---

## 🔄 4. Diagrama de Flujo de Voz

![FLujo_voz](../img/flujo_voz.jfif)