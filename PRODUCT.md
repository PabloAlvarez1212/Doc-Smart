# DocSmart

Contexto extraído del brief del usuario y del código existente, sin añadir promesas de producto.

DocSmart reúne gestión de historia clínica, citas y chat para pacientes; disponibilidad para profesionales; y administración con métricas. La interfaz busca claridad, elegancia y continuidad con Geist y los azules existentes. Claro, oscuro y sistema son preferencias persistentes.

La página pública consume `/public/metrics/`: cuentas de pacientes, médicos aprobados y citas registradas. La cifra de médicos aprobados no demuestra disponibilidad actual. Carga, ausencia de registros y error deben conservar su significado; no rellenar con números inventados. Las vistas de ejemplo se etiquetan como demostración.

No afirmar satisfacción, puntuaciones ni certificaciones sin datos verificables. El asistente Bymax se presenta con el alcance y cautelas del producto existente; el diseño no amplía sus capacidades clínicas.

Fuentes: brief de rediseño; componentes públicos y servicios existentes; `frontend/src/app/_componentsHome/Metrics/Metrics.js`. Los valores visuales y patrones reutilizables se documentan en DESIGN.md.
