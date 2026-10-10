from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('citas', '0009_crear_estado_vencida')]
    operations = [migrations.AddField(model_name='cita', name='fecha_completada',
                                     field=models.DateTimeField(null=True, blank=True))]
