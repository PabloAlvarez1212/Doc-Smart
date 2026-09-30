from django.db import migrations, models


def crear_estado_inasistencia_paciente(apps, schema_editor):
    Estado = apps.get_model('catalogos', 'Estado')
    estados = Estado.objects.using(schema_editor.connection.alias)
    if not estados.filter(nombre__iexact='inasistencia_paciente').exists():
        estados.create(nombre='inasistencia_paciente')


class Migration(migrations.Migration):
    dependencies = [
        ('citas', '0006_cita_fecha_creacion'),
        ('catalogos', '0006_ciudad_api_id_departamento_api_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='cita',
            name='fecha_inasistencia',
            field=models.DateTimeField(blank=True, null=True),
        ),
        # El catálogo es compartido; revertir el campo no debe borrar un estado usado.
        migrations.RunPython(crear_estado_inasistencia_paciente, migrations.RunPython.noop),
    ]
