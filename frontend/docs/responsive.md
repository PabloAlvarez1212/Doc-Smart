# Adaptación responsive de DocSmart

Fecha: 31 de agosto de 2026.

## Análisis previo

Antes de modificar archivos se revisaron la estructura del repositorio, las rutas de Next.js, los layouts de cada rol, CSS Modules, componentes reutilizables, formularios, servicios de API y la organización del backend Django. El árbol de Git estaba limpio.

El frontend usa Next.js App Router, React, CSS Modules, react-select y componentes compartidos. La API se consume mediante Axios, cookies y CSRF, con reescritura hacia Railway. El backend contiene usuarios, médicos, citas, catálogos, historial médico, notificaciones, almacenamiento y Bymax. No se modificaron servicios, autorización, endpoints, backend, base de datos ni configuración de despliegue.

Problemas encontrados: navegación sin adaptación, campos con anchos fijos, tarjetas en tres o cuatro columnas sin breakpoints, formularios limitados por porcentajes y 100vh, panel administrativo con altura 100vw, tablas con overflow oculto y chat con altura mínima mayor que una pantalla horizontal.

## Cambios

- Portada, selección de rol y autenticación: contenedores fluidos, formularios desplazables y tarjetas que se apilan.
- Pacientes y médicos: navegación desplegable hasta 1100 px, con estado accesible, cierre al elegir un enlace y soporte de Escape. Cabeceras móviles en el flujo normal con posición sticky.
- Administración: navegación compacta y área de contenido que puede encogerse sin que la tabla expanda la página.
- Perfiles, citas, indicadores, notificaciones y filtros: cuadrículas adaptables y campos sin anchos rígidos.
- Tablas: desplazamiento horizontal dentro de una región accesible mediante teclado; no se ocultan columnas.
- Modales: altura disponible del dispositivo, desplazamiento interno, foco contenido y restaurado al cerrar, Escape y bloqueo del desplazamiento del fondo.
- Bymax: altura adaptable, controles y mensajes flexibles, composición utilizable en orientación horizontal y lanzador oculto mientras el chat móvil está abierto.
- Controles compartidos: campos flexibles, botones táctiles, nombres accesibles para controles de contraseña, ajustes y cierre, idioma español y respeto de movimiento reducido.

Los ajustes se mantienen dentro de los CSS Modules de cada componente. No se usa overflow-x:hidden en el documento para ocultar problemas de tamaño. Los puntos de cambio responden al contenido: 480/640/768 px para controles y columnas; 1000/1100/1200/1400 px donde perfiles, navegación y listas necesitan más espacio.

## Verificación

- Compilación de producción: `npm run build`. La primera ejecución restringida falló al descargar Google Fonts; la ejecución con acceso de red compiló y generó las 32 páginas sin errores.
- Portada y vista aislada de componentes: 320, 375, 768, 1024, 1440 y 1920 px. En todos esos anchos, scrollWidth no superó clientWidth.
- Vista aislada con datos ficticios: información personal de paciente y médico, filtros, indicadores, tarjeta de cita, tabla, paginación, menú compartido y modal de catálogo. Sin llamadas para guardar datos.
- Chat: comprobación de su estructura y CSS con contenido ficticio a 320 px y en horizontal a 667 × 375. No se probó el servicio de IA, voz ni micrófono.
- Administración real: dashboard y menú de catálogos en móvil; estructura de escritorio a 1440 px. Sin acciones sobre registros.
- Autenticación: acceso, recuperación, selector de rol, registro inicial de paciente y cambio de contraseña a 320 px. Registro inicial también revisado a 768, 1024 y 1440 px. No se enviaron formularios.
- Interacciones: apertura del menú, visibilidad de enlaces, Escape; modal con Tab/Shift+Tab, Escape y restauración del foco.
- `git diff --check`: sin errores de espacios.

La vista temporal de componentes se retiró antes de la compilación final. No hay rutas de prueba incorporadas al despliegue.

## Límites y siguiente comprobación

No se dispuso de sesiones de prueba de paciente y médico. Falta recorrer sus pantallas completas autenticadas con datos de prueba y comprobar dispositivos físicos, teclado virtual y Safari/iOS. La vista aislada valida los componentes visuales, no sustituye esa prueba de integración. Algunas vistas del proyecto siguen siendo marcadores de posición (historial clínico, chats y dashboards); no se implementaron funcionalidades nuevas. El enlace existente de búsqueda de doctores apunta a `/patient/`, que no tiene una página implementada; quedó fuera de este cambio visual.

Los cambios son locales: no se hizo push ni se desplegó en Vercel o Railway.
