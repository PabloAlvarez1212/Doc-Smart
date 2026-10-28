"""Políticas configurables de Bymax (supuestos de diseño académico).

Valores por defecto razonables para una demostración con datos de prueba.
Cada uno puede sobrescribirse en ``settings`` con el prefijo ``BYMAX_``.
Documentadas en ``docs/Asistente-Bymax/seguridad-y-normativa.md``. No
constituyen una decisión jurídica ni clínica validada.
"""
from django.conf import settings


def _valor(nombre, defecto):
    return getattr(settings, f"BYMAX_{nombre}", defecto)


# Límite del serializer oficial de citas (CrearCitaSerializer.motivo_consulta).
MAX_MOTIVO_CONSULTA = 1000
# Vigencia de la autorización de un solo uso tras un «sí» explícito.
CONFIRMACION_EXPIRA_MINUTOS = _valor("CONFIRMACION_EXPIRA_MINUTOS", 2)
# Memoria: activa por defecto en la demostración; el usuario puede desactivarla.
MEMORIA_ACTIVA_POR_DEFECTO = _valor("MEMORIA_ACTIVA_POR_DEFECTO", True)
MEMORIA_MAX_HECHOS = _valor("MEMORIA_MAX_HECHOS", 30)
MEMORIA_MAX_HECHOS_EN_PROMPT = _valor("MEMORIA_MAX_HECHOS_EN_PROMPT", 8)
# Resultados de búsqueda que se conservan para referencias («el segundo»).
RESULTADOS_MAX = _valor("RESULTADOS_MAX", 10)
RESULTADOS_VIGENCIA_MINUTOS = _valor("RESULTADOS_VIGENCIA_MINUTOS", 30)
# Precauciones adicionales por debajo de esta edad.
EDAD_MAYORIA = _valor("EDAD_MAYORIA", 18)
