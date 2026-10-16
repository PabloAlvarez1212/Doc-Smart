import logging

from django.core.management import call_command
from django.core.management.base import BaseCommand


logger = logging.getLogger(__name__)


class Command(BaseCommand):

    help = (
        "Ejecuta los procesos automáticos de citas "
        "y recordatorios médicos."
    )

    def handle(self, *args, **options):

        self.stdout.write(
            "Iniciando procesos automáticos de DocSmart..."
        )

        # 1. Procesar citas vencidas.
        self.stdout.write(
            "\n[1/2] Procesando citas vencidas..."
        )

        call_command(
            "procesar_citas_vencidas"
        )

        # 2. Programar y enviar recordatorios.
        self.stdout.write(
            "\n[2/2] Procesando recordatorios de citas..."
        )

        call_command(
            "procesar_recordatorios_citas",
            enviar=True
        )

        self.stdout.write(
            self.style.SUCCESS(
                "\nProcesos automáticos finalizados correctamente."
            )
        )