from django.core.management.base import BaseCommand

from citas.services import cancelarCitasPendientesVencidasService


class Command(BaseCommand):
    help = (
        "Procesa las citas cuyo plazo de confirmación venció "
        "y las marca como vencidas."
    )

    def handle(self, *args, **options):

        resultado = cancelarCitasPendientesVencidasService()

        vencidas = resultado.get("vencidas", 0)
        omitidas = resultado.get("omitidas", 0)

        self.stdout.write(
            self.style.SUCCESS(
                f"Procesamiento finalizado. "
                f"Vencidas: {vencidas}. "
                f"Omitidas: {omitidas}."
            )
        )