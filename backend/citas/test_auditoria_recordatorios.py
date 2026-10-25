"""Pruebas del comando de auditoría de solo lectura.

Instalar como: backend/citas/test_auditoria_recordatorios.py
"""

from datetime import timedelta
from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.utils import timezone

from chat_citas.tests import ChatFixture
from citas.models import RecordatorioCita
from django.db import IntegrityError, transaction


class AuditoriaRecordatoriosTests(ChatFixture):
    def test_sin_registros(self):
        salida = StringIO()
        call_command("auditar_recordatorios_citas", stdout=salida)
        self.assertIn("TOTAL: 0", salida.getvalue())
        self.assertIn("GRUPOS DUPLICADOS: 0", salida.getvalue())

    def test_auditoria_no_modifica_recordatorios(self):

        fecha = timezone.now() - timedelta(hours=3)

        RecordatorioCita.objects.create(
            id_cita=self.cita,
            tipo_recordatorio="24h",
            fecha_programada=fecha,
            estado_envio="pendiente",
        )

        RecordatorioCita.objects.create(
            id_cita=self.cita,
            tipo_recordatorio="2h",
            fecha_programada=fecha,
            estado_envio="procesando",
        )

        antes = list(
            RecordatorioCita.objects
            .order_by("pk")
            .values_list(
                "pk",
                "estado_envio",
                "intentos_envio"
            )
        )

        salida = StringIO()

        call_command(
            "auditar_recordatorios_citas",
            stdout=salida
        )

        texto = salida.getvalue()

        self.assertIn("TOTAL: 2", texto)
        self.assertIn("GRUPOS DUPLICADOS: 0", texto)
        self.assertIn("PENDIENTES ATRASADOS (>30 min): 1", texto)
        self.assertIn("PROCESANDO TOTAL: 1", texto)

        despues = list(
            RecordatorioCita.objects
            .order_by("pk")
            .values_list(
                "pk",
                "estado_envio",
                "intentos_envio"
            )
        )

        self.assertEqual(antes, despues)

    def test_rechaza_umbral_invalido(self):
        with self.assertRaises(CommandError):
            call_command("auditar_recordatorios_citas", umbral_minutos=0, stdout=StringIO())

    def test_no_permite_recordatorios_duplicados(self):

        fecha = timezone.now() + timedelta(days=1)

        datos = {
            "id_cita": self.cita,
            "tipo_recordatorio": "24h",
            "fecha_programada": fecha,
            "estado_envio": "pendiente",
        }

        # Primer recordatorio: permitido.
        RecordatorioCita.objects.create(**datos)

        # Segundo recordatorio idéntico: rechazado.
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                RecordatorioCita.objects.create(**datos)

        # Comprobar que solamente existe uno.
        self.assertEqual(
            RecordatorioCita.objects.filter(**datos).count(),
            1
        )
