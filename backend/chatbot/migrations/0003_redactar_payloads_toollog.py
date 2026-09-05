from django.db import migrations


CLAVES_PARAMETROS_AUDITABLES = {
    'apellido',
    'ciudad',
    'confirmado',
    'especialidad',
    'fecha',
    'fecha_programada',
    'id_cita',
    'id_medico',
    'limite',
    'nombre',
    'tipo',
}
NOMBRES_TOOL_AUDITABLES = {
    'agendar_cita',
    'buscar_medico',
    'cancelar_cita',
    'consultar_disponibilidad',
    'consultar_historial',
    'consultar_perfil',
    'reprogramar_cita',
}


def _resumir_parametros(parametros):
    if not isinstance(parametros, dict):
        return {'tipo': type(parametros).__name__, 'cantidad': 0}
    return {
        'claves_permitidas': sorted(
            str(clave)
            for clave in parametros
            if clave in CLAVES_PARAMETROS_AUDITABLES
        ),
        'cantidad': len(parametros),
    }


def _resumir_respuesta(respuesta, correcto):
    resumen = {
        'tipo': type(respuesta).__name__,
        'correcto': bool(correcto),
    }
    if isinstance(respuesta, dict):
        resumen['requiere_confirmacion'] = bool(
            respuesta.get('requires_confirmation', False)
        )
        resumen['requiere_seleccion'] = bool(
            respuesta.get('requires_selection', False)
        )
    return resumen


def redactar_payloads_existentes(apps, schema_editor):
    ToolLog = apps.get_model('chatbot', 'ToolLog')
    database = schema_editor.connection.alias
    pendientes = []

    for registro in ToolLog.objects.using(database).all().iterator(chunk_size=500):
        if registro.nombre_tool not in NOMBRES_TOOL_AUDITABLES:
            registro.nombre_tool = 'tool_desconocida'
        registro.parametros = _resumir_parametros(registro.parametros)
        registro.respuesta = _resumir_respuesta(
            registro.respuesta,
            registro.correcto,
        )
        pendientes.append(registro)
        if len(pendientes) == 500:
            ToolLog.objects.using(database).bulk_update(
                pendientes,
                ['nombre_tool', 'parametros', 'respuesta'],
            )
            pendientes = []

    if pendientes:
        ToolLog.objects.using(database).bulk_update(
            pendientes,
            ['nombre_tool', 'parametros', 'respuesta'],
        )


class Migration(migrations.Migration):

    dependencies = [
        ('chatbot', '0002_alter_sesionbymax_usuario_alter_toollog_usuario'),
    ]

    operations = [
        migrations.RunPython(
            redactar_payloads_existentes,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
