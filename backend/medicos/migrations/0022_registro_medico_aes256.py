from django.db import migrations

from core.cifrado import cifrar_texto, descifrar_texto


def recifrar(apps, schema_editor):
    """Pasa el registro médico de Fernet (AES-128) a AES-256-GCM."""
    Medico = apps.get_model("medicos", "Medico")
    for medico in Medico.objects.exclude(registro_medico_cifrado=""):
        claro = descifrar_texto(medico.registro_medico_cifrado)
        if claro:
            Medico.objects.filter(pk=medico.pk).update(registro_medico_cifrado=cifrar_texto(claro))


class Migration(migrations.Migration):

    dependencies = [
        ("medicos", "0021_cifrar_documentos"),
    ]

    operations = [
        migrations.RunPython(recifrar, migrations.RunPython.noop),
    ]
