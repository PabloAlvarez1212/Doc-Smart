"""Auditoría de solo lectura de recordatorios de citas.

Instalar como: backend/citas/management/commands/auditar_recordatorios_citas.py
"""

from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Count
from django.utils import timezone

from citas.models import RecordatorioCita


class Command(BaseCommand):
    help = "Muestra un diagnóstico agregado de recordatorios sin modificar registros."

    def add_arguments(self, parser):
        parser.add_argument(
            "--umbral-minutos",
            type=int,
            default=30,
            help="Antigüedad respecto a la fecha programada para detectar casos por revisar (predeterminado: 30).",
        )

    def handle(self, *args, **options):
        umbral = options["umbral_minutos"]
        if umbral <= 0:
            raise CommandError("--umbral-minutos debe ser mayor que cero.")

        limite = timezone.now() - timedelta(minutes=umbral)
        registros = RecordatorioCita.objects.all()

        self.stdout.write("=== AUDITORÍA DE RECORDATORIOS (SOLO LECTURA) ===")
        self.stdout.write(f"TOTAL: {registros.count()}")

        conteos = {
            fila["estado_envio"]: fila["total"]
            for fila in registros.values("estado_envio").annotate(total=Count("pk"))
        }
        for estado, _ in RecordatorioCita.ESTADOS_ENVIO:
            self.stdout.write(f"ESTADO {estado}: {conteos.pop(estado, 0)}")
        for estado, cantidad in sorted(conteos.items()):
            self.stdout.write(f"ESTADO DESCONOCIDO {estado!r}: {cantidad}")

        duplicados = (
            registros.values("id_cita_id", "tipo_recordatorio", "fecha_programada")
            .annotate(total=Count("pk"))
            .filter(total__gt=1)
        )
        self.stdout.write(f"GRUPOS DUPLICADOS: {duplicados.count()}")

        pendientes_antiguos = registros.filter(
            estado_envio="pendiente", fecha_programada__lt=limite
        ).count()
        procesando = registros.filter(estado_envio="procesando").count()
        procesando_antiguos = registros.filter(
            estado_envio="procesando", fecha_programada__lt=limite
        ).count()
        # Recordatorios cuyo procesamiento comenzó
        # hace más tiempo que el umbral establecido.

        procesando_atascados = registros.filter(
            estado_envio="procesando",
            fecha_inicio_procesamiento__lt=limite
        ).count()

        # Registros antiguos sin fecha de inicio conocida.

        procesando_sin_fecha = registros.filter(
            estado_envio="procesando",
            fecha_inicio_procesamiento__isnull=True
        ).count()

        self.stdout.write(f"PENDIENTES ATRASADOS (>{umbral} min): {pendientes_antiguos}")
        self.stdout.write(f"PROCESANDO TOTAL: {procesando}")
        self.stdout.write(
            f"PROCESANDO CON FECHA PROGRAMADA ANTIGUA (>{umbral} min): {procesando_antiguos}"
        )
        self.stdout.write(
            f"PROCESANDO ANTIGUOS SEGÚN INICIO (>{umbral} min): "
            f"{procesando_atascados}"
        )

        self.stdout.write(
            f"PROCESANDO SIN FECHA DE INICIO: "
            f"{procesando_sin_fecha}"
        )

        tipos_validos = [tipo for tipo, _ in RecordatorioCita.TIPOS_RECORDATORIO]
        tipos_desconocidos = registros.exclude(tipo_recordatorio__in=tipos_validos).count()
        self.stdout.write(f"TIPOS DESCONOCIDOS: {tipos_desconocidos}")
        self.stdout.write(
            "NOTA: la antigüedad se calcula desde fecha_programada, "
            "no desde el inicio real del procesamiento. No cambia estados ni reenvía correos."
        )
