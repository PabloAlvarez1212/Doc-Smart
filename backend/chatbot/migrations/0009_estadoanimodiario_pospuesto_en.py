from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [('chatbot', '0008_mensaje_resultado')]
    operations = [migrations.AddField(model_name='estadoanimodiario', name='pospuesto_en', field=models.DateTimeField(blank=True, null=True))]
