# 🏥 DocSmart

> Plataforma web para la gestión integral de citas médicas, historial clínico digital y teleorientación asistida por Inteligencia Artificial (Bymax).

![Captura principal del proyecto](docs/img/Captura-Principal.png)

[![Next.js](https://img.shields.io/badge/Frontend-Next.js-black?logo=next.js)](https://nextjs.org/)
[![Django](https://img.shields.io/badge/Backend-Django_DRF-092E20?logo=django)](https://www.djangoproject.com/)
[![WebSockets](https://img.shields.io/badge/Realtime-Channels_/_ASGI-blue)](https://channels.readthedocs.io/)
[![Demo](https://img.shields.io/badge/Demo-docsmart.site-brightgreen)](https://docsmart.site/)

---

## 📌 El Problema
El acceso a servicios de salud ambulatorios suele presentar demoras en la asignación de citas, dispersión de historiales clínicos y falta de canales de orientación médica oportunos. Tanto pacientes como profesionales independientes requieren un ecosistema centralizado para organizar la atención de forma ágil y segura.

## ✅ La Solución
**DocSmart** centraliza la experiencia médica en una plataforma web moderna que integra:
- **Agendamiento Inteligente:** Búsqueda por especialidad y ciudad, validación de disponibilidad y reprogramación de citas.
- **Historial Clínico Seguro:** Registro de diagnósticos, trazabilidad de atenciones y gestión documental.
- **Asistente Clínico Bymax:** Chatbot con soporte de voz e IA para orientación inicial de pacientes, registro de estado de ánimo y apoyo en el triaje.
- **Comunicación en Tiempo Real:** Salas de chat por cita y notificaciones instantáneas mediante WebSockets.

---

## 📚 Documentación del Proyecto

Para conocer el detalle técnico y metodológico, consulta los módulos en [`/docs`](docs/):

| Sección | Documento | Descripción |
|---|---|---|
| **Análisis** | [Requerimientos](docs/analisis/requerimientos.md) | Alcance, requerimientos funcionales y no funcionales |
| **Análisis** | [Casos De USo](docs/Analisis//casos-de-uso.md) | Identificación de actores, Diagrama UML y Especificaciones De casos De Uso |
| **Análisis** | [Vision De Producto](docs/Analisis//product.md) | Alcance, lineamientos funcionales y reglas de negocio |
| **Diseño** | [Diseño del Aplicativo](docs/Diseno//sistema-de-diseno.md) | Componentes Reutilizados para el diseño del Frontend |
| **Implementación** | [Arquitectura](docs/implementacion/arquitectura.md) | Diseño desacoplado, WebSockets y flujo de datos |
| **Implementación** | [API & Endpoints](docs/implementacion/endpoints.md) | Catálogo de rutas REST y eventos en tiempo real |
| **Implementación** | [Base de Datos](docs/implementacion/base-de-datos.md) | Modelo entidad-relación y diccionario de datos |
| **IA & Bymax** | [Módulo Asistente](docs/asistente-bymax/arquitectura-ia.md) | Integración con LLMs, memoria, prompts y síntesis de voz |
| **Evidencias** | [Pruebas](docs/evidencias/pruebas-unitarias.md) | Resultados de test automatizados y validaciones |

---

## 🛠️ Tecnologías

| Capa | Tecnologías |
|---|---|
| **Frontend** | Next.js, React, CSS Modules, Tailwind CSS, Web Audio API |
| **Backend** | Python, Django, Django REST Framework, Django Channels (ASGI / Daphne) |
| **Inteligencia Artificial** | OpenAI API, ElevenLabs API |
| **Base de Datos** | MySQL / PostgreSQL |
| **DevOps & Herramientas** | Git, GitHub, Docker |

---

## 🏗️ Arquitectura y Flujo

![Diagrama](docs/img/Flujo-Proyecto.png)

---

## 🚀 Cómo Ejecutarlo

### 1. Clonar el repositorio
```bash
git clone [https://github.com/tu-usuario/DocSmart.git](https://github.com/tu-usuario/DocSmart.git)
cd DocSmart

cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt

# Configurar variables de entorno copiando el archivo de ejemplo
cp .env.example .env

python manage.py migrate
daphne -b 0.0.0.0 -p 8000 core.asgi:application


cd ../frontend
npm install

# Iniciar en modo desarrollo
npm run dev
```