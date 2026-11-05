
from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Ejecuta todos los procesos automáticos de citas de DocSmart."

    def handle(self, *args, **options):

        self.stdout.write(
            "Iniciando procesos automáticos de DocSmart..."
        )

        # 1. Vencimiento por falta de confirmación.
        self.stdout.write(
            "\n[1/3] Procesando citas sin confirmar..."
        )
        call_command("procesar_citas_vencidas")

        # 2. Cierre clínico y vencimiento de 72 horas.
        self.stdout.write(
            "\n[2/3] Procesando cierre de citas..."
        )
        call_command("procesar_cierre_citas")

        # 3. Recordatorios de citas.
        self.stdout.write(
            "\n[3/3] Procesando recordatorios..."
        )
        call_command(
            "procesar_recordatorios_citas",
            enviar=True,
        )

        self.stdout.write(
            self.style.SUCCESS(
                "\nTodos los procesos finalizaron correctamente."
            )
        )
