from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medicos', '0016_revision_posterior_bloqueo_acceso'),
    ]

    operations = [
        migrations.AddField(
            model_name='medico',
            name='fecha_creacion',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
    ]
