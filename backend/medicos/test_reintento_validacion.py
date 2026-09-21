from datetime import timedelta
from threading import Barrier, Lock, Thread
from unittest.mock import ANY, patch
from uuid import uuid4

from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import close_old_connections
from django.test import SimpleTestCase, TransactionTestCase, skipUnlessDBFeature
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from catalogos.models import Rol
from medicos.models import Especialidad, Medico, SolicitudValidacionMedico
from medicos.serializers import ReintentarSolicitudValidacionSerializer
from medicos.services import (
    obtenerMiValidacionService,
    reintentarSolicitudValidacionService,
)
from medicos.views import ReintentarSolicitudValidacionView
from storage_app.models import Archivo


def archivo_pdf(nombre="hoja-vida.pdf"):
    return SimpleUploadedFile(
        nombre,
        b"%PDF-1.4 contenido ficticio",
        content_type="application/pdf",
    )


class ReintentarSolicitudValidacionSerializerTests(SimpleTestCase):
    def test_acepta_pdf_valido(self):
        serializer = ReintentarSolicitudValidacionSerializer(
            data={"hoja_vida": archivo_pdf()}
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(set(serializer.validated_data), {"hoja_vida"})

    def test_rechaza_archivo_no_pdf(self):
        serializer = ReintentarSolicitudValidacionSerializer(
            data={
                "hoja_vida": SimpleUploadedFile(
                    "hoja-vida.txt",
                    b"contenido ficticio",
                    content_type="text/plain",
                )
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("hoja_vida", serializer.errors)

    def test_rechaza_pdf_superior_a_cinco_mb(self):
        serializer = ReintentarSolicitudValidacionSerializer(
            data={
                "hoja_vida": SimpleUploadedFile(
                    "hoja-vida.pdf",
                    b"0" * (5 * 1024 * 1024 + 1),
                    content_type="application/pdf",
                )
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("hoja_vida", serializer.errors)


class ReintentarSolicitudValidacionServiceTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        rol = Rol.objects.create(nombre="medico")
        especialidad = Especialidad.objects.create(nombre="Medicina general")
        self.medico = Medico.objects.create(
            nombre="Andrea",
            apellido="Prueba",
            cedula="1000000001",
            fecha_nacimiento="1990-01-01",
            telefono="3000000001",
            correo="andrea.reintento@example.test",
            id_especialidad=especialidad,
            id_rol=rol,
            direccion="Dirección ficticia",
        )
        self.archivo_anterior = Archivo.objects.create(
            medico=self.medico,
            nombre_original="hoja-anterior.pdf",
            storage_key="pruebas/hoja-anterior.pdf",
            content_type="application/pdf",
            tamano=128,
            tipo="documento",
            categoria="hoja_vida",
        )
        self.solicitud_anterior = SolicitudValidacionMedico.objects.create(
            medico=self.medico,
            hoja_vida=self.archivo_anterior,
            estado=SolicitudValidacionMedico.EstadoSolicitud.RECHAZADO,
            motivo_rechazo="Documento ficticio ilegible",
            fecha_revision=timezone.now() - timedelta(days=31),
            puede_reintentar_desde=timezone.now() - timedelta(minutes=1),
        )

    def guardar_archivo_ficticio(self, archivo, medico_id, categoria, **kwargs):
        storage_key = f"pruebas/{uuid4()}.pdf"
        self.ultimo_storage_key = storage_key
        return Archivo.objects.create(
            medico_id=medico_id,
            nombre_original=archivo.name,
            storage_key=storage_key,
            content_type=archivo.content_type,
            tamano=archivo.size,
            tipo="documento",
            categoria=categoria,
        )

    def ejecutar_reintento(self):
        with patch(
            "medicos.services.guardar_archivo_medico",
            side_effect=self.guardar_archivo_ficticio,
        ):
            return reintentarSolicitudValidacionService(
                self.medico.id,
                archivo_pdf(),
            )

    def test_crea_nueva_solicitud_pendiente_y_conserva_historial(self):
        datos_anteriores = {
            "estado": self.solicitud_anterior.estado,
            "motivo_rechazo": self.solicitud_anterior.motivo_rechazo,
            "fecha_revision": self.solicitud_anterior.fecha_revision,
            "puede_reintentar_desde": self.solicitud_anterior.puede_reintentar_desde,
            "hoja_vida_id": self.solicitud_anterior.hoja_vida_id,
        }

        resultado, status_code = self.ejecutar_reintento()

        self.assertEqual(status_code, 201)
        self.assertEqual(set(resultado), {"id", "estado", "fecha_solicitud"})
        self.assertEqual(resultado["estado"], "pendiente")
        self.assertEqual(SolicitudValidacionMedico.objects.count(), 2)

        nueva = SolicitudValidacionMedico.objects.get(pk=resultado["id"])
        self.assertEqual(nueva.medico_id, self.medico.id)
        self.assertNotEqual(nueva.hoja_vida_id, self.archivo_anterior.id)
        self.assertIsNone(nueva.motivo_rechazo)
        self.assertIsNone(nueva.fecha_revision)
        self.assertIsNone(nueva.puede_reintentar_desde)

        self.solicitud_anterior.refresh_from_db()
        for campo, valor in datos_anteriores.items():
            self.assertEqual(getattr(self.solicitud_anterior, campo), valor)

        estado_actual, estado_status = obtenerMiValidacionService(self.medico.id)
        self.assertEqual(estado_status, 200)
        self.assertEqual(estado_actual["id"], nueva.id)
        self.assertEqual(estado_actual["estado"], "pendiente")

    def test_rechaza_reintento_antes_de_la_fecha_permitida(self):
        self.solicitud_anterior.puede_reintentar_desde = timezone.now() + timedelta(days=1)
        self.solicitud_anterior.save(update_fields=["puede_reintentar_desde"])

        with patch("medicos.services.guardar_archivo_medico") as guardar:
            _, status_code = reintentarSolicitudValidacionService(
                self.medico.id,
                archivo_pdf(),
            )

        self.assertEqual(status_code, 400)
        guardar.assert_not_called()
        self.assertEqual(SolicitudValidacionMedico.objects.count(), 1)

    def test_rechaza_reintento_si_ultima_solicitud_no_esta_rechazada(self):
        for estado in (
            SolicitudValidacionMedico.EstadoSolicitud.PENDIENTE,
            SolicitudValidacionMedico.EstadoSolicitud.APROBADO,
        ):
            with self.subTest(estado=estado):
                self.solicitud_anterior.estado = estado
                self.solicitud_anterior.save(update_fields=["estado"])

                with patch("medicos.services.guardar_archivo_medico") as guardar:
                    _, status_code = reintentarSolicitudValidacionService(
                        self.medico.id,
                        archivo_pdf(),
                    )

                self.assertEqual(status_code, 400)
                guardar.assert_not_called()
                self.assertEqual(SolicitudValidacionMedico.objects.count(), 1)

    def test_compensa_storage_si_falla_creacion_de_solicitud(self):
        with (
            patch(
                "medicos.services.guardar_archivo_medico",
                side_effect=self.guardar_archivo_ficticio,
            ),
            patch(
                "medicos.services.SolicitudValidacionMedico.objects.create",
                side_effect=RuntimeError("fallo ficticio de base de datos"),
            ),
            patch("medicos.services.eliminar_archivo", return_value=True) as eliminar,
        ):
            with self.assertRaisesRegex(RuntimeError, "fallo ficticio"):
                reintentarSolicitudValidacionService(
                    self.medico.id,
                    archivo_pdf(),
                )

        eliminar.assert_called_once_with(self.ultimo_storage_key)
        self.assertFalse(Archivo.objects.filter(storage_key=self.ultimo_storage_key).exists())
        self.assertTrue(Archivo.objects.filter(pk=self.archivo_anterior.id).exists())
        self.assertEqual(SolicitudValidacionMedico.objects.count(), 1)

    def test_conserva_error_original_si_falla_compensacion_de_storage(self):
        with (
            patch(
                "medicos.services.guardar_archivo_medico",
                side_effect=self.guardar_archivo_ficticio,
            ),
            patch(
                "medicos.services.SolicitudValidacionMedico.objects.create",
                side_effect=RuntimeError("error original de solicitud"),
            ),
            patch("medicos.services.eliminar_archivo", return_value=False),
            self.assertLogs("medicos.services", level="ERROR") as logs,
        ):
            with self.assertRaisesRegex(RuntimeError, "error original de solicitud"):
                reintentarSolicitudValidacionService(
                    self.medico.id,
                    archivo_pdf(),
                )

        self.assertTrue(any("compensar" in mensaje for mensaje in logs.output))
        self.assertEqual(SolicitudValidacionMedico.objects.count(), 1)

    def test_view_usa_medico_autenticado_y_no_medico_id_del_payload(self):
        request = APIRequestFactory().post(
            "/api/medicos/mi-validacion/reintentar/",
            {"hoja_vida": archivo_pdf(), "medico_id": 999999},
            format="multipart",
        )
        force_authenticate(request, user=self.medico)

        with patch(
            "medicos.views.reintentarSolicitudValidacionService",
            return_value=(
                {
                    "id": 22,
                    "estado": "pendiente",
                    "fecha_solicitud": timezone.now(),
                },
                201,
            ),
        ) as service:
            response = ReintentarSolicitudValidacionView.as_view()(request)

        self.assertEqual(response.status_code, 201)
        service.assert_called_once_with(self.medico.id, ANY)
        self.assertNotIn("storage_key", response.data["data"])

    @skipUnlessDBFeature("has_select_for_update")
    def test_reintentos_concurrentes_crean_una_sola_solicitud_pendiente(self):
        barrera = Barrier(2)
        bloqueo_resultados = Lock()
        resultados = []
        errores = []

        def ejecutar(indice):
            close_old_connections()
            try:
                barrera.wait(timeout=5)
                resultado = reintentarSolicitudValidacionService(
                    self.medico.id,
                    archivo_pdf(f"hoja-{indice}.pdf"),
                )
                with bloqueo_resultados:
                    resultados.append(resultado)
            except Exception as error:
                with bloqueo_resultados:
                    errores.append(error)
            finally:
                close_old_connections()

        with patch(
            "medicos.services.guardar_archivo_medico",
            side_effect=self.guardar_archivo_ficticio,
        ) as guardar:
            hilos = [Thread(target=ejecutar, args=(indice,)) for indice in range(2)]
            for hilo in hilos:
                hilo.start()
            for hilo in hilos:
                hilo.join(timeout=10)

        self.assertFalse(errores)
        self.assertTrue(all(not hilo.is_alive() for hilo in hilos))
        self.assertCountEqual([status for _, status in resultados], [201, 400])
        self.assertEqual(guardar.call_count, 1)
        self.assertEqual(
            SolicitudValidacionMedico.objects.filter(
                medico=self.medico,
                estado=SolicitudValidacionMedico.EstadoSolicitud.PENDIENTE,
            ).count(),
            1,
        )
