from django.db import migrations


def crear_estado_vencida(apps, schema_editor):

    Estado = apps.get_model(
        "catalogos",
        "Estado"
    )

    estados = Estado.objects.using(
        schema_editor.connection.alias
    )

    if not estados.filter(
        nombre__iexact="vencida"
    ).exists():
        estados.create(
            nombre="vencida"
        )


class Migration(migrations.Migration):

    dependencies = [
        ('citas', '0008_cita_fecha_limite_cierre_and_more'),
        ("catalogos", "0006_ciudad_api_id_departamento_api_id"),
    ]

    operations = [
        migrations.RunPython(
            crear_estado_vencida,
            migrations.RunPython.noop,
        ),
    ]
