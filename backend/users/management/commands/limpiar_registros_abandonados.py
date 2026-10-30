from django.core.management.base import BaseCommand

from users.registros_abandonados import purgar_abandonados


class Command(BaseCommand):
    help = "Elimina los registros que no se terminaron (vencidos) junto con sus imágenes."

    def handle(self, *args, **opciones):
        total = purgar_abandonados()
        self.stdout.write(f"Registros abandonados eliminados: {total}")
