"""Retire tracking while preserving its historical table and session column.

Detach the archive's actor constraints so removing the active model does not
block account deletion or cascade into historical rows. Actor IDs and all
recorded values remain in the archive. The legacy table and all its columns
remain present after migration (SQLite may rebuild the table by copying rows).
"""
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('chatbot', '0009_estadoanimodiario_pospuesto_en')]
    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.AlterField(
                    model_name='estadoanimodiario', name='usuario',
                    field=models.ForeignKey(to='users.usuario', null=True, blank=True,
                                            on_delete=models.DO_NOTHING, db_constraint=False),
                ),
                migrations.AlterField(
                    model_name='estadoanimodiario', name='medico',
                    field=models.ForeignKey(to='medicos.medico', null=True, blank=True,
                                            on_delete=models.DO_NOTHING, db_constraint=False),
                ),
            ],
            state_operations=[
                migrations.RemoveField(model_name='sesionbymax', name='escala_animo'),
                migrations.DeleteModel(name='EstadoAnimoDiario'),
            ],
        ),
    ]
