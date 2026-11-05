from django.db import migrations

from core.cifrado import cifrar_texto, descifrar_texto


def recifrar(apps, schema_editor):
    """Pasa el registro médico de los procesos de registro de Fernet (AES-128) a AES-256-GCM."""
    Proceso = apps.get_model("users", "ProcesoRegistroUsuario")
    for proceso in Proceso.objects.exclude(registro_medico_cifrado=""):
        claro = descifrar_texto(proceso.registro_medico_cifrado)
        if claro:
            Proceso.objects.filter(pk=proceso.pk).update(registro_medico_cifrado=cifrar_texto(claro))


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0023_cifrar_documentos"),
    ]

    operations = [
        migrations.RunPython(recifrar, migrations.RunPython.noop),
    ]
