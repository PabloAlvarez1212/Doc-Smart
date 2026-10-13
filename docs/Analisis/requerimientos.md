- [Regresar - Pagina Principal](../../README.md)

# 📑 Especificación de Requerimientos de Software (ERS) — DocSmart

> **Proyecto:** DocSmart — Plataforma de Gestión Médica y Asistente Clínico Inteligente  
> **Programa:** Tecnología en Análisis y Desarrollo de Software (ADSO)  
> **Ficha:** 3142774  
> **Centro:** Centro Tecnológico del Mobiliario — SENA Regional Antioquia  
> **Fecha:** 17 de marzo de 2026  
> **Equipo de Desarrollo:** Juan Pablo Alvarez Montoya, Miguel Angel Racero Guerrero, Kleider Yesid Echeverry Lamadrid  
> **Instructora / Asesora:** Patricia Alzate  

---

## 📌 1. Información General y Objetivos

### 1.1. Objetivo General
Desarrollar una plataforma web integral para el sector salud que centralice la gestión de citas médicas, historiales clínicos digitales inmutables, teleorientación asistida por inteligencia artificial (Bymax) y comunicación en tiempo real, facilitando la interacción segura y segmentada entre pacientes, profesionales médicos y administradores.

### 1.2. Objetivos Específicos
- **Autenticación y Control de Acceso:** Implementar mecanismos seguros de registro, inicio de sesión y recuperación de contraseña basados en tokens JWT y cookies HTTP seguras, con autorización estricta por roles (Paciente, Médico, Administrador).
- **Gestión Asistencial de Citas:** Proveer un flujo integral de agendamiento, reprogramación y cancelación con validación de disponibilidad horaria y reglas de cancelación preventiva (mínimo 24 horas).
- **Expediente Clínico Digital:** Gestionar historias clínicas bajo un modelo de sólo adición (*append-only*), garantizando la inmutabilidad de los registros y el cumplimiento de la normativa legal de datos de salud.
- **Asistencia Clínica con IA (Bymax):** Integrar un agente conversacional multi-modelo (OpenAI / Gemini) con síntesis de voz (ElevenLabs) para triaje informativo, orientación preliminar y registro del estado anímico diario.
- **Canales en Tiempo Real:** Establecer salas de chat privadas por cita médica y notificaciones en vivo mediante arquitectura dirigida por eventos con WebSockets (Django Channels / ASGI).

---

## 🎯 2. Alcance del Sistema

| ¿Qué HARÁ el sistema? (Límites Involucrados) | ¿Qué NO HARÁ el sistema? (Exclusiones Explícitas) |
| :--- | :--- |
| • Registro público de pacientes y verificación administrativa de credenciales médicas.<br>• Agendamiento, reprogramación y cierre clínico de citas médicas.<br>• Consulta de agenda semanal y bloqueos de excepción por parte del médico.<br>• Registro inmutable y consulta cronológica de historias clínicas.<br>• Chatbot Bymax para orientación médica informativa y consultas operativas.<br>• Chat bidireccional por cita mediante WebSockets seguros (WSS).<br>• Dashboards analíticos con métricas para médicos y administradores. | • **No emitirá diagnósticos definitivos** ni reemplazará la consulta médica presencial.<br>• No procesará cobros, pagos con tarjetas ni facturación electrónica en la fase actual.<br>• No gestionará inventarios de farmacias ni dispensación de medicamentos físicos.<br>• No realizará integración directa con sistemas legados de EPS/IPS.<br>• No incluirá módulo de videollamada interactiva en el alcance actual. |

---

## 👥 3. Actores del Sistema

| Actor | Tipo | Descripción de Responsabilidades y Accesos |
| :--- | :---: | :--- |
| **Paciente** | Usuario | Persona registrada que busca especialistas, reserva citas, consulta su historial clínico, chatea con su médico asignado e interactúa con Bymax. |
| **Médico** | Usuario | Profesional validado por el administrador; define su disponibilidad horaria, atiende consultas, consigna evoluciones clínicas y revisa sus métricas. |
| **Administrador** | Usuario | Responsable de auditar credenciales de médicos, aprobar/rechazar solicitudes, gestionar catálogos (servicios, especialidades, ciudades) y supervisar el sistema. |
| **Asistente Bymax** | Sistema | Agente de IA que orienta al paciente, responde consultas operativas de citas y recomienda especialidades con avisos de responsabilidad médica. |

---

## ⚙️ 4. Requerimientos Funcionales (RF)

| Código | Nombre | Actor | Descripción Detallada | Prioridad |
| :---: | :--- | :---: | :--- | :---: |
| **RF-01** | **Registro de Pacientes** | Paciente | El sistema debe permitir el autoregistro público solicitando tipo de documento, número de identificación, nombres, apellidos, correo electrónico y contraseña cifrada. Todo registro público recibe por defecto el rol Paciente. | **Alta** |
| **RF-02** | **Registro y Solicitud Médica** | Médico | El sistema debe permitir el registro de profesionales de la salud solicitando especialidad, tarjeta profesional, documento de identidad y soportes académicos para revisión administrativa. | **Alta** |
| **RF-03** | **Autenticación e Inicio de Sesión** | Todos | El sistema debe validar las credenciales del usuario (correo y contraseña), generando tokens de sesión seguros y redirigiendo al panel correspondiente según el rol asignado. | **Alta** |
| **RF-04** | **Recuperación de Contraseña** | Todos | El sistema debe permitir el restablecimiento de contraseñas mediante el envío de un token temporal cifrado con tiempo de expiración al correo del usuario. | **Media** |
| **RF-05** | **Validación y Aprobación de Médicos** | Administrador | El administrador debe revisar la documentación de los médicos en estado *Pendiente* y aprobar o rechazar su vinculación. El rechazo exige ingresar un motivo justificado. | **Alta** |
| **RF-06** | **Configuración de Disponibilidad Médica** | Médico | El médico validado debe poder configurar su horario semanal de atención (días hábiles, franjas horarias y duración por consulta), así como excepciones por vacaciones o permisos. | **Alta** |
| **RF-07** | **Búsqueda y Filtro de Médicos** | Paciente | El paciente debe poder buscar y filtrar médicos disponibles por especialidad médica, ubicación geográfica (departamento/ciudad) y nombre. | **Alta** |
| **RF-08** | **Agendamiento de Citas** | Paciente | El sistema debe permitir al paciente reservar un bloque de horario disponible con el médico seleccionado, actualizando la agenda en tiempo real. | **Alta** |
| **RF-09** | **Reprogramación y Cancelación de Citas** | Paciente / Médico | El sistema debe permitir cancelar o reprogramar citas. Para el paciente, la cancelación sólo será válida si se realiza con al menos 24 horas de antelación (**RN-01**). | **Alta** |
| **RF-10** | **Atención y Cierre Clínico de Consulta** | Médico | El médico debe registrar el estado final de la consulta (*Completada*, *Inasistencia* o *Cancelada*) e ingresar las notas u observaciones de la atención. | **Alta** |
| **RF-11** | **Historial Clínico Inmutable** | Médico / Paciente | El médico podrá consultar antecedentes y añadir nuevas evoluciones clínicas. Las entradas previas no podrán ser modificadas ni eliminadas (**RN-02**, modelo *append-only*). | **Alta** |
| **RF-12** | **Gestión Documental y Adjuntos** | Médico / Paciente | El sistema debe permitir adjuntar y visualizar resultados de laboratorio, órdenes médicas e imágenes diagnósticas en formatos PDF, JPG y PNG. | **Media** |
| **RF-13** | **Orientación Clínica con Bymax** | Paciente | El asistente Bymax debe interactuar con el paciente mediante texto y voz, analizando síntomas preliminares, recomendando especialidades y advirtiendo su carácter no vinculante (**RN-03**). | **Alta** |
| **RF-14** | **Seguimiento del Estado de Ánimo** | Paciente | Bymax debe permitir al paciente registrar periódicamente su estado de ánimo para fines de bienestar y trazabilidad emocional. | **Baja** |
| **RF-15** | **Chat Privado Médico-Paciente** | Médico / Paciente | El sistema debe proporcionar una sala de mensajería bidireccional y privada asociada a la cita médica mediante conexión WebSocket persistente. | **Media** |
| **RF-16** | **Notificaciones en Vivo** | Todos | El sistema debe emitir alertas y notificaciones sobre confirmación de citas, recordatorios, nuevos mensajes de chat y estados de validación. | **Media** |
| **RF-17** | **Gestión Administrativa y Catálogos** | Administrador | El administrador debe poder crear, modificar y desactivar servicios, especialidades y usuarios, manteniendo la integridad referencial y de auditoría. | **Alta** |
| **RF-18** | **Dashboard y Métricas** | Médico / Admin | Visualización de gráficos estadísticos sobre demanda de citas, especialidades más solicitadas, tasa de cancelación y volumen de pacientes atendidos. | **Media** |

---

## 🛡️ 5. Requerimientos No Funcionales (RNF)

| Código | Categoría | Especificación Técnica y Criterio de Calidad |
| :---: | :---: | :--- |
| **RNF-01** | **Seguridad** | Las contraseñas deben almacenarse mediante funciones de hash criptográfico seguro (PBKDF2/Argon2). Toda la comunicación entre cliente y servidor debe forzar HTTPS y WebSockets seguros (WSS) con TLS 1.3. |
| **RNF-02** | **Protección de Datos** | El tratamiento de datos personales y registros de salud debe regirse bajo los lineamientos de la Ley 1581 de 2012 (Habeas Data) y la Ley 2015 de 2020 (Historia Clínica Electrónica) en Colombia. |
| **RNF-03** | **Rendimiento** | Las peticiones REST a la API deben responder en un tiempo medio inferior a 2 segundos bajo condiciones normales. El intercambio de mensajes por WebSocket debe completarse con una latencia menor a 500 ms. |
| **RNF-04** | **Disponibilidad** | El sistema debe garantizar una disponibilidad operativa mensual del 99.5%, excluyendo ventanas de mantenimiento preventivo notificadas con antelación. |
| **RNF-05** | **Usabilidad y Accesibilidad** | La interfaz debe ser responsive (adaptable desde 360px hasta pantallas de escritorio) y cumplir con las pautas de accesibilidad WCAG 2.1 nivel AA (contraste semántico y soporte de `prefers-reduced-motion`). |
| **RNF-06** | **Integridad Transaccional** | La reserva de citas y la creación de evoluciones clínicas deben ejecutarse dentro de transacciones atómicas (ACID) en la base de datos para impedir colisiones o reservas duplicadas en el mismo horario. |
| **RNF-07** | **Custodia de Archivos** | Los archivos adjuntos no deben superar un tamaño máximo de 10 MB y deben ser validados estrictamente por extensión y cabecera MIME antes de su almacenamiento en el servidor. |

---

## ⚖️ 6. Reglas de Negocio (RN)

- **RN-01 — Restricción de Cancelación (24 Horas):**  
  Un paciente únicamente puede cancelar o reprogramar una cita cuando falten **24 horas o más** para la hora programada. Si el tiempo restante es menor, el sistema bloqueará la cancelación y conservará la cita en estado activo para proteger la agenda del médico.
- **RN-02 — Inmutabilidad del Historial Clínico (*Append-Only*):**  
  Las historias clínicas y notas médicas consolidadas son inmutables. El sistema prohíbe operaciones `UPDATE` y `DELETE` sobre registros clínicos finalizados. Cualquier aclaración o corrección posterior debe añadirse como una nueva adenda con sello de tiempo y autor.
- **RN-03 — Descargo de Responsabilidad Médica de Bymax:**  
  Toda interacción generada por el asistente Bymax debe contener explícitamente la advertencia de que la información provista es de carácter orientativo y no reemplaza el criterio médico profesional. Ante la detección de signos de alarma de riesgo vital, el sistema indicará de forma prioritaria acudir a un servicio de urgencias.
- **RN-04 — Política de Asignación de Roles:**  
  Todo registro público ingresa con el rol Paciente. La asignación o activación del rol Médico se reserva exclusivamente al Administrador, previa verificación satisfactoria de la tarjeta profesional y documentos de acreditación.

---

## 📊 7. Matriz de Trazabilidad de Requerimientos

| Requerimiento Funcional | Caso de Uso Asociado | Prioridad | Estado de Implementación |
| :--- | :---: | :---: | :---: |
| **RF-01** Autenticación y Registro de Pacientes | `CU-01`, `CU-02`, `CU-03` | Alta | Finalizado |
| **RF-02** Registro y Solicitud Médica | `CU-03`, `CU-08` | Alta | Finalizado |
| **RF-03** Autenticación e Inicio de Sesión | `CU-02` | Alta | Finalizado |
| **RF-04** Recuperación de Contraseña | `CU-02`, `CU-08` | Media | Finalizado |
| **RF-05** Validación y Aprobación de Médicos | `CU-09` | Alta | Finalizado |
| **RF-06** Configuración de Disponibilidad Médica | `CU-06` | Alta | Finalizado |
| **RF-07** Búsqueda y Filtro de Médicos | `CU-06` | Alta | Finalizado |
| **RF-08** Agendamiento de Citas | `CU-06` | Alta | Finalizado |
| **RF-09** Reprogramación y Cancelación | `CU-06` | Alta | Finalizado |
| **RF-10** Atención y Cierre Clínico de Consulta | `CU-06`, `CU-07` | Alta | Finalizado |
| **RF-11** Historial Clínico Inmutable | `CU-07` | Alta | Finalizado |
| **RF-12** Gestión Documental y Adjuntos | `CU-07` | Media | Finalizado |
| **RF-13** Orientación Clínica con Bymax | `CU-05` | Alta | Finalizado |
| **RF-14** Seguimiento de Estado de Ánimo | `CU-05` | Baja | Finalizado |
| **RF-15** Chat Privado Médico-Paciente | Módulo Comunicación | Media | Finalizado |
| **RF-16** Notificaciones en Vivo | Módulo Comunicación | Media | Finalizado |
| **RF-17** Gestión Administrativa y Catálogos | `CU-09`, `CU-10` | Alta | Finalizado |
| **RF-18** Dashboard y Métricas | `CU-04` | Media | Finalizado |