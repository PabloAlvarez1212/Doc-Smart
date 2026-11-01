from django.db import migrations


def backfill_fecha_creacion(apps, schema_editor):
    Medico = apps.get_model('medicos', 'Medico')
    SolicitudValidacionMedico = apps.get_model('medicos', 'SolicitudValidacionMedico')
    for medico in Medico.objects.filter(fecha_creacion__isnull=True):
        primera = (
            SolicitudValidacionMedico.objects
            .filter(medico=medico)
            .order_by('fecha_solicitud')
            .values_list('fecha_solicitud', flat=True)
            .first()
        )
        if primera is not None:
            Medico.objects.filter(pk=medico.pk).update(fecha_creacion=primera)


class Migration(migrations.Migration):

    dependencies = [
        ('medicos', '0017_medico_fecha_creacion'),
    ]

    operations = [
        migrations.RunPython(backfill_fecha_creacion, migrations.RunPython.noop),
    ]
