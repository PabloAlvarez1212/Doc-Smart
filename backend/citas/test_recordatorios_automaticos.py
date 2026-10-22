"""Pruebas de programación y envío de recordatorios de citas.

Ubicar en backend/citas/test_recordatorios_automaticos.py.
No envía correos reales: el servicio de Resend se sustituye con mocks.
"""

from datetime import timedelta
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command

from chat_citas.tests import ChatFixture
from citas.models import RecordatorioCita
from citas.recordatorios_services import (
    enviarRecordatoriosPendientesService,
    programarRecordatoriosCitasService,
)


class RecordatoriosAutomaticosTests(ChatFixture):
    def setUp(self):
        reloj = patch(
            "citas.recordatorios_services.timezone.now",
            return_value=self.now,
        )
        reloj.start()
        self.addCleanup(reloj.stop)

    def mover_cita(self, fecha):
        self.cita.fecha_programada = fecha
        self.cita.save(update_fields=["fecha_programada"])

    def test_programa_24h_y_2h_sin_duplicar_en_ejecuciones_repetidas(self):
        primera = programarRecordatoriosCitasService()
        segunda = programarRecordatoriosCitasService()

        self.assertEqual(primera["creados"], 2)
        self.assertEqual(segunda["creados"], 0)
        self.assertEqual(RecordatorioCita.objects.filter(id_cita=self.cita).count(), 2)
        self.assertSetEqual(
            set(
                RecordatorioCita.objects.filter(id_cita=self.cita)
                .values_list("tipo_recordatorio", flat=True)
            ),
            {"24h", "2h"},
        )

    def test_cancelar_cita_invalida_recordatorios_pendientes(self):
        programarRecordatoriosCitasService()
        self.cita.id_estado = self.states["cancelada"]
        self.cita.save(update_fields=["id_estado"])

        resultado = programarRecordatoriosCitasService()

        self.assertEqual(resultado["cancelados"], 2)
        self.assertEqual(
            RecordatorioCita.objects.filter(
                id_cita=self.cita, estado_envio="cancelado"
            ).count(),
            2,
        )

    def test_reprogramar_invalida_fechas_anteriores_y_crea_nuevas(self):
        programarRecordatoriosCitasService()
        self.mover_cita(self.cita.fecha_programada + timedelta(days=1))

        resultado = programarRecordatoriosCitasService()

        self.assertEqual(resultado["cancelados"], 2)
        self.assertEqual(resultado["creados"], 2)
        self.assertEqual(
            RecordatorioCita.objects.filter(
                id_cita=self.cita, estado_envio="pendiente"
            ).count(),
            2,
        )
        for recordatorio in RecordatorioCita.objects.filter(
            id_cita=self.cita, estado_envio="pendiente"
        ):
            anticipacion = {"24h": 24, "2h": 2}[recordatorio.tipo_recordatorio]
            self.assertEqual(
                recordatorio.fecha_programada,
                self.cita.fecha_programada - timedelta(hours=anticipacion),
            )

    def test_envia_recordatorio_vigente_y_no_lo_envia_dos_veces(self):
        self.mover_cita(self.now + timedelta(hours=2))
        programarRecordatoriosCitasService()

        with patch(
            "citas.recordatorios_services.enviarCorreoRecordatorioCita",
            return_value=True,
        ) as correo:
            primero = enviarRecordatoriosPendientesService()
            segundo = enviarRecordatoriosPendientesService()

        self.assertEqual(primero["enviados"], 1)
        self.assertEqual(segundo["enviados"], 0)
        correo.assert_called_once()
        recordatorio = RecordatorioCita.objects.get(
            id_cita=self.cita, tipo_recordatorio="2h"
        )
        self.assertEqual(recordatorio.estado_envio, "enviado")
        self.assertEqual(recordatorio.intentos_envio, 1)
        self.assertIsNotNone(recordatorio.fecha_envio_recordatorio)

        self.assertEqual(recordatorio.fecha_inicio_procesamiento,self.now)

    def test_fallo_confirmado_de_correo_no_se_reintenta_automaticamente(self):
        self.mover_cita(self.now + timedelta(hours=2))
        programarRecordatoriosCitasService()

        with patch(
            "citas.recordatorios_services.enviarCorreoRecordatorioCita",
            return_value=False,
        ) as correo, patch("citas.recordatorios_services.logger"):
            primero = enviarRecordatoriosPendientesService()
            segundo = enviarRecordatoriosPendientesService()

        self.assertEqual(primero["fallidos"], 1)
        self.assertEqual(segundo["fallidos"], 0)
        correo.assert_called_once()
        recordatorio = RecordatorioCita.objects.get(
            id_cita=self.cita, tipo_recordatorio="2h"
        )
        self.assertEqual(recordatorio.estado_envio, "fallido")
        self.assertEqual(recordatorio.intentos_envio, 1)

    def test_cancelada_antes_del_envio_no_contacta_resend(self):
        self.mover_cita(self.now + timedelta(hours=2))
        programarRecordatoriosCitasService()
        self.cita.id_estado = self.states["cancelada"]
        self.cita.save(update_fields=["id_estado"])

        with patch(
            "citas.recordatorios_services.enviarCorreoRecordatorioCita"
        ) as correo:
            resultado = enviarRecordatoriosPendientesService()

        self.assertEqual(resultado["cancelados"], 1)
        correo.assert_not_called()
        self.assertEqual(
            RecordatorioCita.objects.get(id_cita=self.cita).estado_envio,
            "cancelado",
        )

    def test_recordatorio_muy_atrasado_no_se_envia(self):
        # Para una cita en una hora, el recordatorio de 2h ya lleva una hora tarde.
        self.mover_cita(self.now + timedelta(hours=1))
        programarRecordatoriosCitasService()

        self.assertFalse(
            RecordatorioCita.objects.filter(id_cita=self.cita).exists()
        )
        with patch(
            "citas.recordatorios_services.enviarCorreoRecordatorioCita"
        ) as correo:
            resultado = enviarRecordatoriosPendientesService()

        self.assertEqual(resultado["enviados"], 0)
        correo.assert_not_called()

    def test_resultado_incierto_no_reenvia_el_mismo_correo(self):
        # Si Resend pudo recibir la solicitud, NO se debe reintentar a ciegas.
        self.mover_cita(self.now + timedelta(hours=2))
        programarRecordatoriosCitasService()

        with patch(
            "citas.recordatorios_services.enviarCorreoRecordatorioCita",
            side_effect=RuntimeError("respuesta incierta de proveedor"),
        ) as correo, patch("citas.recordatorios_services.logger"):
            enviarRecordatoriosPendientesService()
            enviarRecordatoriosPendientesService()

        correo.assert_called_once()
        recordatorio = RecordatorioCita.objects.get(id_cita=self.cita)
        self.assertEqual(recordatorio.estado_envio, "procesando")
        self.assertEqual(recordatorio.intentos_envio, 1)

        self.assertEqual(recordatorio.fecha_inicio_procesamiento,self.now)

    def test_comando_de_envio_invoca_programacion_y_procesamiento(self):
        with patch(
            "citas.management.commands.procesar_recordatorios_citas."
            "programarRecordatoriosCitasService",
            return_value={"creados": 0, "cancelados": 0, "reactivados": 0},
        ) as programar, patch(
            "citas.management.commands.procesar_recordatorios_citas."
            "enviarRecordatoriosPendientesService",
            return_value={"enviados": 0, "fallidos": 0, "cancelados": 0},
        ) as enviar:
            call_command("procesar_recordatorios_citas", enviar=True, stdout=StringIO())

        programar.assert_called_once()
        enviar.assert_called_once()
