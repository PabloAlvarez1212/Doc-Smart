from django.core.management.base import BaseCommand

from citas.recordatorios_services import (
    programarRecordatoriosCitasService,
    enviarRecordatoriosPendientesService,
)


class Command(BaseCommand):

    help = (
        "Programa y procesa los recordatorios "
        "automáticos de citas médicas."
    )

    def add_arguments(self, parser):

        parser.add_argument(
            "--enviar",
            action="store_true",
            help="Enviar recordatorios pendientes mediante Resend."
        )

    def handle(self, *args, **options):

        resultado = programarRecordatoriosCitasService()

        self.stdout.write(
            self.style.SUCCESS(
                "Programación de recordatorios finalizada.\n"
                f"Recordatorios creados: {resultado['creados']}\n"
                f"Recordatorios cancelados: {resultado['cancelados']}\n"
                f"Recordatorios reactivados: {resultado['reactivados']}"
            )
        )

        if options["enviar"]:

            envios = enviarRecordatoriosPendientesService()

            self.stdout.write(
                self.style.SUCCESS(
                    "\nProcesamiento de correos finalizado.\n"
                    f"Enviados: {envios['enviados']}\n"
                    f"Fallidos: {envios['fallidos']}\n"
                    f"Cancelados: {envios['cancelados']}"
                )
            )