from datetime import timedelta
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from django.core.management import call_command

from rest_framework.test import APIClient

from chat_citas.tests import ChatFixture

from citas import services
from citas.models import DocumentoSeguimientoCita

from storage_app.models import Archivo

from notificaciones.models import Notificacion

from catalogos.models import Estado


class CierreClinicoTests(ChatFixture):

    def setUp(self):

        self.cita.fecha_programada = (
            self.now
            - timedelta(hours=1)
        )

        self.cita.fecha_final = (
            self.now
            - timedelta(minutes=30)
        )

        self.cita.fecha_limite_cierre = (
            self.cita.fecha_final
            + timedelta(hours=72)
        )

        self.cita.save()

        clock = patch(
            "citas.services.timezone.now",
            return_value=self.now
        )

        clock.start()

        self.addCleanup(
            clock.stop
        )

        self.datos_historial = {
            "motivo_consulta":
                "Consulta de prueba",

            "diagnostico_general":
                "Diagnóstico de prueba",

            "observaciones":
                "Observaciones de prueba",
        }


    def documents(self):

        archivo = Archivo.objects.create(
            medico=self.doctors[1],
            storage_key="seguimiento/prueba",
            nombre_original="prueba.pdf"
        )

        return (
            DocumentoSeguimientoCita
            .objects
            .create(
                cita=self.cita,
                archivo=archivo
            )
        )


    def upload(
        self,
        files=None,
        actor=None
    ):

        service = getattr(
            services,
            "subirDocumentosCitaService",
            None
        )

        self.assertIsNotNone(
            service,
            (
                "Falta service de documentos "
                "de seguimiento"
            )
        )

        return service(
            self.cita.pk,
            actor or self.doctors[1],
            files or [
                SimpleUploadedFile(
                    "prueba.pdf",
                    b"%PDF-1.7\n",
                    content_type=(
                        "application/pdf"
                    )
                )
            ]
        )


    def process(self):

        service = getattr(
            services,
            "procesarCierreCitasService",
            None
        )

        self.assertIsNotNone(
            service,
            "Falta procesador idempotente"
        )

        return service()


    def test_completar_sin_documentos_rechaza(
        self
    ):

        result, status = (
            services
            .completarCitaService(
                self.cita.pk,
                self.doctors[1].pk,
                self.datos_historial,
            )
        )

        self.assertEqual(
            status,
            400
        )

        self.assertIn(
            "documento",
            result
        )


    def test_completar_guarda_real_y_conserva_programado_y_limite(
        self
    ):

        self.documents()

        end = self.cita.fecha_final

        limit = (
            self.cita.fecha_limite_cierre
        )

        self.assertEqual(
            services
            .completarCitaService(
                self.cita.pk,
                self.doctors[1].pk,
                self.datos_historial,
            )[1],
            200
        )

        self.cita.refresh_from_db()

        self.assertEqual(
            self.cita.fecha_final,
            end
        )

        self.assertEqual(
            self.cita.fecha_completada,
            self.now
        )

        self.assertTrue(
            timezone.is_aware(
                self.cita.fecha_completada
            )
        )

        self.assertEqual(
            self.cita.fecha_limite_cierre,
            limit
        )

        self.assertEqual(
            Notificacion.objects.filter(
                id_usuario=self.patients[0],
                tipo="cita_completada"
            ).count(),
            1
        )


    def test_completar_antes_inicio_o_en_limite_rechaza(
        self
    ):

        self.documents()

        casos = [
            (
                "fecha_programada",
                self.now
                + timedelta(seconds=1)
            ),
            (
                "fecha_limite_cierre",
                self.now
            ),
        ]

        for field, value in casos:

            with self.subTest(
                field=field
            ):

                old = getattr(
                    self.cita,
                    field
                )

                setattr(
                    self.cita,
                    field,
                    value
                )

                self.cita.save()

                self.assertEqual(
                    services
                    .completarCitaService(
                        self.cita.pk,
                        self.doctors[1].pk,
                        self.datos_historial,
                    )[1],
                    400
                )

                setattr(
                    self.cita,
                    field,
                    old
                )

                self.cita.save()


    def test_documentos_antes_inicio_despues_limite_y_actor_ajeno(
        self
    ):

        self.assertEqual(
            self.upload(
                actor=self.patients[0]
            )[1],
            403
        )

        self.assertEqual(
            self.upload(
                actor=self.doctors[0]
            )[1],
            403
        )

        casos = [
            (
                "fecha_programada",
                self.now
                + timedelta(seconds=1)
            ),
            (
                "fecha_limite_cierre",
                self.now
            ),
        ]

        for field, value in casos:

            old = getattr(
                self.cita,
                field
            )

            setattr(
                self.cita,
                field,
                value
            )

            self.cita.save()

            self.assertEqual(
                self.upload()[1],
                400
            )

            setattr(
                self.cita,
                field,
                old
            )

            self.cita.save()


    @patch(
        "storage_app.services.subir_archivo"
    )
    def test_multiple_antes_y_despues_completar_una_notificacion_por_peticion(
        self,
        upload
    ):

        serial = iter(
            range(9)
        )

        upload.side_effect = (
            lambda **kwargs: {
                "key":
                    f"seguimiento/{next(serial)}",

                "nombre":
                    "prueba.pdf",

                "tipo":
                    "application/pdf",

                "tamano":
                    9,
            }
        )

        self.assertEqual(
            self.upload()[1],
            201
        )

        self.assertEqual(
            Notificacion.objects.count(),
            0
        )

        self.assertEqual(
            services
            .completarCitaService(
                self.cita.pk,
                self.doctors[1].pk,
                self.datos_historial,
            )[1],
            200
        )

        files = [
            SimpleUploadedFile(
                "prueba.pdf",
                b"%PDF-1.7\n",
                content_type="application/pdf"
            )
            for _ in range(3)
        ]

        self.assertEqual(
            self.upload(files)[1],
            201
        )

        self.assertEqual(
            DocumentoSeguimientoCita
            .objects
            .filter(
                cita=self.cita
            )
            .count(),
            4
        )

        self.assertEqual(
            Notificacion.objects.filter(
                tipo="documentacion_seguimiento"
            ).count(),
            1
        )


    def test_terminales_no_admiten_documentos_o_completar(
        self
    ):

        self.documents()

        for name in [
            "cancelada",
            "inasistencia_paciente",
            "vencida",
        ]:

            with self.subTest(
                state=name
            ):

                self.cita.id_estado = (
                    Estado.objects
                    .get_or_create(
                        nombre=name
                    )[0]
                )

                self.cita.save()

                self.assertEqual(
                    self.upload()[1],
                    400
                )

                self.assertEqual(
                    services
                    .completarCitaService(
                        self.cita.pk,
                        self.doctors[1].pk,
                        self.datos_historial,
                    )[1],
                    400
                )


    def test_recordatorios_y_vencimiento_idempotentes(
        self
    ):

        casos = [
            (
                24,
                "fecha_recordatorio_cierre_24h",
                1
            ),
            (
                48,
                "fecha_recordatorio_cierre_48h",
                2
            ),
            (
                72,
                "fecha_vencimiento",
                4
            ),
        ]

        for hours, field, count in casos:

            self.cita.fecha_final = (
                self.now
                - timedelta(hours=hours)
            )

            self.cita.fecha_limite_cierre = (
                self.cita.fecha_final
                + timedelta(hours=72)
            )

            self.cita.save()

            self.process()
            self.process()

            self.cita.refresh_from_db()

            self.assertEqual(
                getattr(
                    self.cita,
                    field
                ),
                self.now
            )

            self.assertEqual(
                Notificacion.objects.count(),
                count
            )

        self.assertEqual(
            self.cita.id_estado.nombre,
            "vencida"
        )


    def test_terminales_y_legacy_sin_limite_no_se_procesan(
        self
    ):

        for name in [
            "completada",
            "cancelada",
            "inasistencia_paciente",
            "vencida",
        ]:

            self.cita.id_estado = (
                Estado.objects
                .get_or_create(
                    nombre=name
                )[0]
            )

            self.cita.fecha_final = (
                self.now
                - timedelta(hours=90)
            )

            self.cita.fecha_limite_cierre = (
                self.now
                - timedelta(hours=18)
            )

            self.cita.save()

            self.process()

            self.cita.refresh_from_db()

            self.assertEqual(
                self.cita.id_estado.nombre,
                name
            )

        self.cita.id_estado = (
            self.states["confirmada"]
        )

        self.cita.fecha_limite_cierre = None

        self.cita.save()

        self.process()

        self.assertEqual(
            Notificacion.objects.count(),
            0
        )


    def test_legacy_con_fin_permite_cierre_sin_backfill(
        self
    ):

        self.documents()

        self.cita.fecha_limite_cierre = None

        self.cita.save()

        self.assertEqual(
            services
            .completarCitaService(
                self.cita.pk,
                self.doctors[1].pk,
                self.datos_historial,
            )[1],
            200
        )

        self.cita.refresh_from_db()

        self.assertIsNone(
            self.cita.fecha_limite_cierre
        )


    def test_endpoint_multipart_y_permisos(
        self
    ):

        client = APIClient()

        url = (
            f"/api/citas/"
            f"{self.cita.pk}/"
            f"documentos/"
        )

        client.force_authenticate(
            self.patients[0]
        )

        self.assertEqual(
            client.post(
                url,
                {},
                format="multipart"
            ).status_code,
            403
        )

        client.force_authenticate(
            self.doctors[1]
        )

        self.assertEqual(
            client.post(
                url,
                {},
                format="multipart"
            ).status_code,
            400
        )

        with patch(
            "storage_app.services.subir_archivo",
            return_value={
                "key":
                    "test/documento",

                "nombre":
                    "x.pdf",

                "tipo":
                    "application/pdf",

                "tamano":
                    9
            }
        ):

            response = client.post(
                url,
                {
                    "archivos":
                        SimpleUploadedFile(
                            "x.pdf",
                            b"%PDF-1.7\n",
                            content_type=(
                                "application/pdf"
                            )
                        )
                },
                format="multipart"
            )

        self.assertEqual(
            response.status_code,
            201
        )

        self.assertEqual(
            len(
                response.data["data"]
            ),
            1
        )


    def test_comando_y_rollback_notificacion(
        self
    ):

        from io import StringIO

        call_command(
            "procesar_cierre_citas",
            stdout=StringIO()
        )

        self.cita.fecha_final = (
            self.now
            - timedelta(hours=72)
        )

        self.cita.fecha_limite_cierre = (
            self.now
        )

        self.cita.save()

        with patch(
            "citas.cierre_services.enviarNotificacion",
            side_effect=RuntimeError(
                "notification"
            )
        ):

            with self.assertRaises(
                RuntimeError
            ):

                self.process()

        self.cita.refresh_from_db()

        self.assertEqual(
            self.cita.id_estado.nombre,
            "confirmada"
        )

        self.assertIsNone(
            self.cita.fecha_vencimiento
        )


    def test_reprogramar_reinicia_marcas_y_limite(
        self
    ):

        Estado.objects.get_or_create(
            nombre="reprogramada"
        )

        self.cita.fecha_recordatorio_cierre_24h = (
            self.now
        )

        self.cita.fecha_recordatorio_cierre_48h = (
            self.now
        )

        self.cita.fecha_vencimiento = (
            self.now
        )

        self.cita.save()

        with patch(
            "citas.services.esHorarioDisponible",
            return_value=True
        ):

            result, status = (
                services
                .editarCitaService(
                    self.cita.pk,
                    {
                        "fecha_programada":
                            self.now
                            + timedelta(days=3)
                    },
                    self.doctors[1]
                )
            )

        self.assertEqual(
            status,
            200
        )

        self.cita.refresh_from_db()

        self.assertEqual(
            self.cita.fecha_limite_cierre,
            (
                self.cita.fecha_final
                + timedelta(hours=72)
            )
        )

        self.assertIsNone(
            self.cita.fecha_recordatorio_cierre_24h
        )

        self.assertIsNone(
            self.cita.fecha_recordatorio_cierre_48h
        )

        self.assertIsNone(
            self.cita.fecha_vencimiento
        )


    @patch(
        "storage_app.services.subir_archivo"
    )
    def test_archivo_falso_y_limite_peticion_no_hacen_upload(
        self,
        upload
    ):

        self.assertEqual(
            self.upload([
                SimpleUploadedFile(
                    "x.pdf",
                    b"html",
                    content_type="application/pdf"
                )
            ])[1],
            400
        )

        self.assertEqual(
            self.upload([
                SimpleUploadedFile(
                    "x.pdf",
                    b"%PDF-",
                    content_type="application/pdf"
                )
                for _ in range(6)
            ])[1],
            400
        )

        upload.assert_not_called()


    @patch(
        "storage_app.services.eliminar_archivo",
        return_value=True
    )
    @patch(
        "storage_app.services.subir_archivo"
    )
    def test_fallo_segundo_upload_compensa_y_rollback(
        self,
        upload,
        delete
    ):

        upload.side_effect = [
            {
                "key":
                    "test/first",

                "nombre":
                    "x.pdf",

                "tipo":
                    "application/pdf",

                "tamano":
                    9
            },

            RuntimeError(
                "storage"
            )
        ]

        with self.assertRaises(
            RuntimeError
        ):

            self.upload([
                SimpleUploadedFile(
                    "x.pdf",
                    b"%PDF-",
                    content_type="application/pdf"
                )
                for _ in range(2)
            ])

        self.assertFalse(
            DocumentoSeguimientoCita
            .objects
            .exists()
        )

        delete.assert_called_once_with(
            "test/first"
        )


    def test_vencida_no_se_reabre_por_confirmar_cancelar_o_reprogramar(
        self
    ):

        self.cita.id_estado = (
            Estado.objects
            .get_or_create(
                nombre="vencida"
            )[0]
        )

        self.cita.save()

        self.assertEqual(
            services
            .confirmarCitaService(
                self.cita.pk,
                self.doctors[1].pk
            )[1],
            400
        )

        self.assertEqual(
            services
            .cancelarCitaService(
                self.cita.pk,
                self.doctors[1]
            )[1],
            400
        )

        self.assertEqual(
            services
            .editarCitaService(
                self.cita.pk,
                {
                    "fecha_programada":
                        self.now
                        + timedelta(days=3)
                },
                self.doctors[1]
            )[1],
            400
        )


    def test_consulta_y_url_documento_solo_participantes(
        self
    ):

        document = self.documents()

        client = APIClient()

        url = (
            f"/api/citas/"
            f"{self.cita.pk}/"
            f"documentos/"
        )

        client.force_authenticate(
            self.patients[1]
        )

        self.assertEqual(
            client.get(
                url
            ).status_code,
            403
        )

        client.force_authenticate(
            self.patients[0]
        )

        self.assertEqual(
            client.get(
                url
            ).status_code,
            200
        )

        with patch(
            "storage_app.services.generar_url_firmada",
            return_value=(
                "https://storage.test/firmada"
            )
        ):

            response = client.get(
                f"{url}{document.pk}/url/"
            )

        self.assertEqual(
            response.status_code,
            200
        )

        self.assertEqual(
            response
            .data["data"]["expiracion"],
            600
        )


    def test_notificaciones_se_emiten_por_channels_tras_commit(
        self
    ):

        from types import SimpleNamespace
        from unittest.mock import AsyncMock

        self.documents()

        layer = SimpleNamespace(
            group_send=AsyncMock()
        )

        with patch(
            "notificaciones.services.get_channel_layer",
            return_value=layer
        ):

            with self.captureOnCommitCallbacks(
                execute=True
            ):

                self.assertEqual(
                    services
                    .completarCitaService(
                        self.cita.pk,
                        self.doctors[1].pk,
                        self.datos_historial,
                    )[1],
                    200
                )

                layer.group_send.assert_not_called()

        self.assertEqual(
            layer.group_send.await_count,
            2
        )

        self.assertEqual(
            {
                args.args[0]
                for args
                in layer
                .group_send
                .await_args_list
            },
            {
                f"user_{self.patients[0].pk}",
                f"medico_{self.doctors[1].pk}"
            }
        )


    @patch(
        "storage_app.services.eliminar_archivo",
        return_value=True
    )
    def test_transferencia_que_cruza_limite_no_publica_documentos(
        self,
        delete
    ):

        from django.core.exceptions import (
            ValidationError
        )

        with patch(
            "django.utils.timezone.now",
            return_value=self.now
        ) as clock:

            def uploaded(**kwargs):

                clock.return_value = (
                    self.cita
                    .fecha_limite_cierre
                )

                return {
                    "key":
                        "test/late",

                    "nombre":
                        "x.pdf",

                    "tipo":
                        "application/pdf",

                    "tamano":
                        9
                }

            with patch(
                "storage_app.services.subir_archivo",
                side_effect=uploaded
            ):

                with self.assertRaises(
                    ValidationError
                ):

                    self.upload()

        self.assertFalse(
            DocumentoSeguimientoCita
            .objects
            .exists()
        )

        delete.assert_called_once_with(
            "test/late"
        )


    def test_url_descarga_permisos_y_pertenencia(self):
        document = self.documents()
        document.archivo.content_type = 'application/pdf'
        document.archivo.save()
        client = APIClient()
        url = f'/api/citas/{self.cita.pk}/documentos/{document.pk}/url/'
        client.force_authenticate(self.patients[0])
        with patch('storage_app.services.generar_url_firmada', return_value='https://storage.test/url') as signer:
            for mode in ('ver', 'descargar'):
                response = client.get(url, {'modo': mode})
                self.assertEqual(response.status_code, 200)
                self.assertNotIn('disposicion', signer.call_args.kwargs)
                self.assertEqual(response.data['data']['expiracion'], 600)
            client.get(url)
            self.assertNotIn('disposicion', signer.call_args.kwargs)
            self.assertEqual(client.get(url, {'modo': 'otro'}).status_code, 200)
            document.archivo.content_type = 'application/msword'
            document.archivo.save()
            client.get(url, {'modo': 'ver'})
            self.assertNotIn('disposicion', signer.call_args.kwargs)
            client.force_authenticate(self.patients[1])
            self.assertEqual(client.get(url, {'modo': 'ver'}).status_code, 403)
            client.force_authenticate(self.doctors[1])
            self.assertEqual(client.get(url, {'modo': 'descargar'}).status_code, 200)
            self.assertEqual(client.get(f'/api/citas/{self.cita.pk}/documentos/999999/url/').status_code, 404)
            other = type(self.cita).objects.create(id_usuario=self.patients[0], id_medico=self.doctors[1], id_estado=self.cita.id_estado, fecha_programada=self.now)
            self.assertEqual(client.get(f'/api/citas/{other.pk}/documentos/{document.pk}/url/').status_code, 404)

    def test_firma_descarga_nombre_sin_headers_inyectables(self):
        from storage_app.services import generar_url_firmada
        with patch('storage_app.services.obtener_cliente_s3') as s3:
            generar_url_firmada('privado/key', nombre_descarga='../consulta\r\n.pdf')
            params = s3.return_value.generate_presigned_url.call_args.kwargs['Params']
            self.assertEqual(params['ResponseContentDisposition'], "attachment; filename*=UTF-8''consulta.pdf")
            self.assertNotIn('ResponseContentType', params)
            generar_url_firmada('privado/key', nombre_descarga='seguimiento.pdf')
            self.assertTrue(s3.return_value.generate_presigned_url.call_args.kwargs['Params']['ResponseContentDisposition'].startswith('attachment;'))

    def test_endpoint_clinico_usa_cita_url_y_observaciones_opcionales(self):
        from historial_medico.models import HistorialClinico
        self.documents()
        client = APIClient()
        client.force_authenticate(self.doctors[1])
        url = f'/api/citas/{self.cita.pk}/completar/'
        self.assertEqual(client.put(url, {}, format='json').status_code, 400)
        response = client.put(url, {'motivo_consulta': 'Consulta', 'diagnostico_general': 'Resultado', 'cita_id': 999999}, format='json')
        self.assertEqual(response.status_code, 200)
        history = HistorialClinico.objects.get(cita=self.cita)
        self.assertEqual(history.observaciones, '')

    def test_notificacion_fallida_revierte_historial_version_cita(self):
        from historial_medico.models import HistorialClinico, VersionHistorialClinico
        self.documents()
        with patch('citas.services.enviarNotificacion', side_effect=RuntimeError('fallo aviso')):
            with self.assertRaises(RuntimeError):
                services.completarCitaService(self.cita.pk, self.doctors[1].pk, self.datos_historial)
        self.assertFalse(HistorialClinico.objects.exists())
        self.assertFalse(VersionHistorialClinico.objects.exists())
        self.cita.refresh_from_db()
        self.assertIsNone(self.cita.fecha_completada)

    def test_estado_completada_ausente_no_crea_historial(self):
        from historial_medico.models import HistorialClinico, VersionHistorialClinico
        self.documents()
        Estado.objects.filter(nombre='completada').delete()
        self.assertEqual(services.completarCitaService(self.cita.pk, self.doctors[1].pk, self.datos_historial)[1], 500)
        self.assertFalse(HistorialClinico.objects.exists())
        self.assertFalse(VersionHistorialClinico.objects.exists())
        self.cita.refresh_from_db()
        self.assertIsNone(self.cita.fecha_completada)

    def test_cierre_crea_historial_version_y_documentos_sin_duplicar(self):
        from historial_medico.models import HistorialClinico
        from historial_medico.serializers import HistorialClinicoDetalleSerializer
        document = self.documents()
        self.assertEqual(services.completarCitaService(self.cita.pk, self.doctors[1].pk, self.datos_historial)[1], 200)
        history = HistorialClinico.objects.get(cita=self.cita)
        self.assertEqual(list(history.versiones.values_list('version', flat=True)), [1])
        self.assertEqual(HistorialClinicoDetalleSerializer(history).data['documentos'][0]['id'], document.pk)
        document.archivo.storage_key = 'seguimiento/primero'
        document.archivo.save()
        self.documents()
        self.assertEqual(len(HistorialClinicoDetalleSerializer(history).data['documentos']), 2)
        self.assertEqual(services.completarCitaService(self.cita.pk, self.doctors[1].pk, self.datos_historial)[1], 400)
        self.assertEqual(HistorialClinico.objects.filter(cita=self.cita).count(), 1)

    def test_fallo_version_revierte_historial_y_cierre(self):
        from historial_medico.models import HistorialClinico
        self.documents()
        with patch('historial_medico.services._crear_version', side_effect=RuntimeError('version fallida')):
            with self.assertRaises(RuntimeError):
                services.completarCitaService(self.cita.pk, self.doctors[1].pk, self.datos_historial)
        self.assertFalse(HistorialClinico.objects.exists())
        self.cita.refresh_from_db()
        self.assertIsNone(self.cita.fecha_completada)


class ValidacionSeguimientoTests(
    ChatFixture
):

    def test_formatos_permitidos_y_contenido_falso(
        self
    ):

        from io import BytesIO
        from PIL import Image
        from zipfile import ZipFile
        from django.core.exceptions import (
            ValidationError
        )

        from storage_app.validators import (
            validar_archivo_seguimiento
        )

        formatos = [
            (
                "JPEG",
                "image/jpeg",
                "jpg"
            ),
            (
                "PNG",
                "image/png",
                "png"
            ),
            (
                "WEBP",
                "image/webp",
                "webp"
            ),
        ]

        for format, mime, extension in formatos:

            data = BytesIO()

            Image.new(
                "RGB",
                (2, 2)
            ).save(
                data,
                format=format
            )

            file = SimpleUploadedFile(
                f"test.{extension}",
                data.getvalue(),
                content_type=mime
            )

            validar_archivo_seguimiento(
                file
            )

            self.assertEqual(
                file.tell(),
                0
            )


        docx = BytesIO()

        with ZipFile(
            docx,
            "w"
        ) as archive:

            archive.writestr(
                "[Content_Types].xml",
                "<Types/>"
            )

            archive.writestr(
                "word/document.xml",
                (
                    "<w:document "
                    "xmlns:w="
                    "\"http://schemas.openxmlformats.org/"
                    "wordprocessingml/2006/main\"/>"
                )
            )


        validar_archivo_seguimiento(
            SimpleUploadedFile(
                "x.docx",
                docx.getvalue(),
                content_type=(
                    "application/vnd."
                    "openxmlformats-officedocument."
                    "wordprocessingml.document"
                )
            )
        )


        validar_archivo_seguimiento(
            SimpleUploadedFile(
                "x.doc",
                (
                    b"\xd0\xcf\x11\xe0"
                    b"\xa1\xb1\x1a\xe1"
                    + "WordDocument"
                    .encode("utf-16le")
                ),
                content_type=(
                    "application/msword"
                )
            )
        )


        casos_invalidos = [
            (
                "x.doc",
                "application/msword"
            ),
            (
                "x.docx",
                (
                    "application/vnd."
                    "openxmlformats-officedocument."
                    "wordprocessingml.document"
                )
            ),
            (
                "x.pdf",
                "application/pdf"
            ),
            (
                "x.png",
                "image/png"
            ),
        ]


        for name, mime in casos_invalidos:

            with (
                self.subTest(
                    name=name
                ),
                self.assertRaises(
                    ValidationError
                )
            ):

                validar_archivo_seguimiento(
                    SimpleUploadedFile(
                        name,
                        b"HTML",
                        content_type=mime
                    )
                )
