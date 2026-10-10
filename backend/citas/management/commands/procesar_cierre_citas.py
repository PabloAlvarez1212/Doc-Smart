from django.core.management.base import BaseCommand
from citas.services import procesarCierreCitasService


class Command(BaseCommand):
    help = 'Procesa recordatorios y vencimiento del cierre clínico de citas.'

    def handle(self, *args, **options):
        resultado = procesarCierreCitasService()
        self.stdout.write(', '.join(f'{key}={value}' for key, value in resultado.items()))
