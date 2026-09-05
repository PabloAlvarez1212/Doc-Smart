from django.db import migrations, models
from django.db.models import Count
import django.db.models.deletion


def crear_versiones_iniciales(apps, schema_editor):
    HistorialClinico = apps.get_model('historial_medico', 'HistorialClinico')
    VersionHistorialClinico = apps.get_model(
        'historial_medico',
        'VersionHistorialClinico',
    )
    database = schema_editor.connection.alias

    citas_duplicadas = list(
        HistorialClinico.objects.using(database)
        .exclude(cita_id=None)
        .values('cita_id')
        .annotate(total=Count('id'))
        .filter(total__gt=1)
        .values_list('cita_id', flat=True)
    )
    if citas_duplicadas:
        ids = ', '.join(str(cita_id) for cita_id in citas_duplicadas)
        raise RuntimeError(
            'No se puede aplicar la unicidad del historial: existen historiales '
            f'duplicados para las citas {ids}. Requieren revisión clínica manual.'
        )

    versiones = [
        VersionHistorialClinico(
            historial_id=historial.id,
            version=1,
            diagnostico_general=historial.diagnostico_general,
            observaciones=historial.observaciones,
            motivo_consulta=historial.motivo_consulta,
            motivo_cambio='Migración del historial clínico existente',
            medico_editor_id=historial.medico_id,
            fecha_creacion=historial.fecha_creacion,
        )
        for historial in HistorialClinico.objects.using(database).iterator()
    ]
    VersionHistorialClinico.objects.using(database).bulk_create(
        versiones,
        batch_size=500,
    )


class Migration(migrations.Migration):

    dependencies = [
        ('historial_medico', '0002_remove_historialclinico_cedula_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='historialclinico',
            name='version_actual',
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.CreateModel(
            name='VersionHistorialClinico',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                ('version', models.PositiveIntegerField()),
                ('diagnostico_general', models.TextField()),
                ('observaciones', models.TextField(blank=True, null=True)),
                ('motivo_consulta', models.TextField()),
                ('motivo_cambio', models.CharField(max_length=500)),
                ('fecha_creacion', models.DateTimeField()),
                (
                    'historial',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='versiones',
                        to='historial_medico.historialclinico',
                    ),
                ),
                (
                    'medico_editor',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name='versiones_historial_editadas',
                        to='medicos.medico',
                    ),
                ),
            ],
            options={
                'ordering': ['version'],
                'constraints': [
                    models.CheckConstraint(
                        condition=models.Q(('version__gte', 1)),
                        name='version_historial_positiva',
                    ),
                    models.UniqueConstraint(
                        fields=('historial', 'version'),
                        name='unique_version_por_historial',
                    ),
                ],
            },
        ),
        migrations.RunPython(
            crear_versiones_iniciales,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name='versionhistorialclinico',
            name='fecha_creacion',
            field=models.DateTimeField(auto_now_add=True),
        ),
        migrations.AddConstraint(
            model_name='historialclinico',
            constraint=models.CheckConstraint(
                condition=models.Q(('version_actual__gte', 1)),
                name='version_actual_positiva',
            ),
        ),
        migrations.AddConstraint(
            model_name='historialclinico',
            constraint=models.UniqueConstraint(
                fields=('cita',),
                name='unique_historial_por_cita',
            ),
        ),
    ]
