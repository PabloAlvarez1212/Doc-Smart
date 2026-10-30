from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from users.models import ProcesoRegistroUsuario
from users.validacion_facial import eliminar_imagenes


class Command(BaseCommand):
    help = "Elimina las imágenes de validación facial vencidas (storage y base de datos)."

    def add_arguments(self, parser):
        parser.add_argument("--dias", type=int, default=settings.FACIAL_RETENCION_DIAS)
        parser.add_argument("--simular", action="store_true")

    def handle(self, *args, **opciones):
        limite = timezone.now() - timedelta(days=opciones["dias"])
        # Se conservan mientras la revisión manual siga abierta.
        procesos = ProcesoRegistroUsuario.objects.filter(
            Q(foto_documento_facial__isnull=False) | Q(selfie_facial__isnull=False),
            creado_en__lt=limite,
        ).exclude(estado_facial=ProcesoRegistroUsuario.EstadoFacial.REVISION).exclude(revision_posterior="pendiente")
        total = 0
        for proceso in procesos.select_related("foto_documento_facial", "selfie_facial"):
            if not opciones["simular"]:
                eliminar_imagenes(proceso)
            total += 1
        self.stdout.write(f"Procesos con imágenes {'por eliminar' if opciones['simular'] else 'limpiados'}: {total}")
