- [Regresar - Página Principal](../../README.md)

# 🗄️ Modelo y Diseño de Base de Datos — DocSmart

> **Proyecto:** DocSmart — Plataforma de Gestión Médica y Asistente Clínico Inteligente  
> **Área:** Implementación Técnica / Persistencia  
> **Motor de Base de Datos:** MySQL 8.0+ (Motor de almacenamiento InnoDB)  
> **ORM:** Django Object-Relational Mapping (ORM)  
> **Codificación:** `utf8mb4` (Cotejamiento `utf8mb4_unicode_ci` con soporte para caracteres multilingües y emojis)  

---

## 📌 1. Visión General del Modelo de Persistencia

La base de datos de **DocSmart** sigue un modelo relacional normalizado (cumpliendo con la Tercera Forma Normal - 3FN), diseñado para garantizar integridad referencial, transacciones atómicas (**ACID**) y alta disponibilidad en los procesos asistenciales.

El esquema centraliza las interacciones entre los tres roles del sistema (Paciente, Médico y Administrador), dividiéndose en los siguientes núcleos funcionales:
1. **Catálogos Maestros:** Parametrización geográfica, roles, estados y especialidades.
2. **Identidad y Acceso:** Autenticación de usuarios y perfiles diferenciados.
3. **Módulo Profesional y Agenda:** Datos profesionales de médicos, franjas de disponibilidad y bloqueos de agenda.
4. **Ciclo de Vida de Citas:** Solicitud, validación horaria, estados de atención y cierre asistencial.
5. **Historial Clínico Inmutable:** Modelo de sólo adición (*Append-Only*) para expedientes médicos y adendas.
6. **Canales de Comunicación y Soporte:** Chats por cita médica, notificaciones reactivas y sesiones del asistente Bymax.

---

## 🏛️ 2. Diagrama Entidad-Relación (DER)
