---
name: DocSmart
description: Gestión de salud con claridad, calma y acceso directo.
colors:
  accent: "#1733a4"
  accent-hover: "#244bd0"
  background: "#f5f6f8"
  surface: "#fff"
  surface-muted: "#f2f3f5"
  ink: "#1d1d1f"
  muted: "#565b65"
  border: "#d9dde4"
  accent-soft: "#ebf4ff"
  focus: "#2458e9"
typography:
  display:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "clamp(48px,5.7vw,78px)"
    fontWeight: 650
    lineHeight: 1.04
    letterSpacing: "-.04em"
  body:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "19px"
    lineHeight: 1.65
  label:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 600
rounded:
  control: "12px"
  navigation: "20px"
  preview: "24px"
spacing:
  action-gap: "18px"
  mobile-gutter: "24px"
  hero-gutter: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "14px 20px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  card-preview:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.preview}"
    padding: "28px"
---

# Design System: DocSmart

## Overview

**Creative North Star: "Claridad serena"**

La dirección solicitada combina la elegancia y contención de interfaces Apple con la identidad azul existente. Geist conserva la continuidad del producto. Fondos blancos y grises, jerarquía tipográfica y espacio suficiente permiten entender las acciones sin decoración excesiva.

Esta documentación captura la implementación; las propiedades CSS y los componentes citados al final siguen siendo la fuente de valores operativos. Los temas claro y oscuro tienen el mismo peso funcional.

**Key Characteristics:**
- Superficies neutras y azul reservado para acciones y orientación.
- Navegación compacta, translúcida y adaptable.
- Movimiento breve, interrumpible y respetuoso de preferencias.

## Colors

### Primary
El azul sólido identifica acciones principales. Su pareja de texto blanco permanece estable en ambos temas; el azul semántico para enlaces e iconos cambia con el tema. No confundir `--brand-solid` con `--color-dark`.

### Neutral
`--background`, `--surface` y `--surface-muted` separan página, panel y agrupaciones. `--color-text`, `--text-secondary` y `--border` controlan jerarquía y divisores. El tema oscuro redefine estas propiedades mediante `data-theme="dark"`; no usar colores claros fijos para texto sobre superficies temáticas.

**The Semantic Color Rule.** Usar las propiedades globales para texto, superficies y bordes; reservar colores sólidos fijos para parejas de contraste verificadas.

## Typography

Geist Sans es la familia de interfaz, con Arial y sans-serif como respaldo. Títulos grandes usan peso medio y espaciado compacto; texto explicativo mantiene interlineado amplio. El hero limita el párrafo a 40ch. Las cifras usan números tabulares y etiquetas explícitas. Los tamaños del frontmatter describen roles observados en la página pública, no una escala universal impuesta a cada pantalla.

## Layout

El hero usa contenedor de 1240px, dos columnas, separación de 60px y márgenes internos horizontales de 40px. A 900px reduce densidad y a 700px pasa a una columna. Secciones públicas usan referencia de 1160px y márgenes móviles de 24px. Las cifras cambian de tres columnas a filas a 640px. La navegación cambia a menú plegable a 1100px y a una columna a 480px. Mantener contenido legible sin recortar desbordamientos.

## Elevation & Depth

Capas tonales y bordes llevan la mayor parte de la estructura. La vista de demostración usa `--shadow`; la navegación usa desenfoque de 18px, saturación de 140% y sombra tenue. Preferencias de menor transparencia o mayor contraste convierten la barra en superficie opaca. No extender el vidrio a cada panel.

## Shapes

Controles suaves, paneles más amplios y divisores finos. Los radios documentados corresponden a botones públicos, navegación y vista de demostración. Formularios y controles de navegación conservan sus radios locales cuando son distintos.

## Components

### Buttons
Acción pública principal con relleno azul, texto blanco y altura mínima de 48px. Hover oscurece la intención mediante el azul de interacción; active escala a .97. Acciones de navegación tienen altura mínima de 44px. Focus visible usa anillo semántico de 3px con separación de 3px.

### Cards / Containers
La demostración de cita usa superficie temática, sombra global y radio amplio. La tarjeta Bymax mantiene una superficie oscura específica y su pareja de texto claro; esa combinación no define el tema completo. Ejemplos visibles se identifican como demostración.

### Inputs / Fields
Campos nativos heredan Geist, superficie, tinta, borde y caret semánticos. Placeholder usa texto secundario. En móviles de hasta 768px, campos mantienen 16px de texto. Conservar labels y estados funcionales de cada formulario.

### Navigation
Barra fija con espacio reservado para evitar saltos. Al desplazarse se compacta; el enlace activo usa fondo azul suave. El selector de tema se presenta exclusivamente en Configuración; el navbar y el menú móvil no lo incluyen. El selector ofrece Claro, Oscuro y Sistema mediante radios accesibles y guarda la preferencia en `docsmart-theme`.

### Motion
`motion/react` recibe `reducedMotion="user"`. Transiciones CSS observadas duran aproximadamente 180–250ms; la transición de tema usa 180ms cuando está disponible. Menor movimiento desactiva animación, desplazamiento suave y desplazamientos decorativos. No ocultar información hasta que termine una animación.

## Do's and Don'ts

### Do:
- **Do** usar tokens semánticos para que cada superficie funcione en claro y oscuro.
- **Do** conservar Geist, jerarquía legible, foco visible y controles accesibles.
- **Do** respetar movimiento reducido y mantener estados de carga, vacío y error explícitos.

### Don't:
- **Don't** llenar la interfaz de gradientes, vidrio o acentos decorativos.
- **Don't** introducir cifras de satisfacción, valoraciones o certificaciones sin respaldo.
- **Don't** presentar médicos aprobados como médicos disponibles ni ejemplos como datos reales.

Fuentes: brief del usuario; `frontend/src/app/variables.css`, `globals.css`; `frontend/components/ui/DocSmartNav` y `Theme`; componentes públicos `Hero`, `Features`, `Metrics` y `Footer`.

Las superficies azules usan `--blue-card-*` y `--blue-action-*` para mantener texto claro independientemente del tema global. Los controles usan `--control-border` para límites legibles. Los formularios comparten `VerificationStatus`: estados pendientes, error y éxito confirmados por API, anunciados con aria-live. El registro conserva los valores y bloquea envíos simultáneos.
