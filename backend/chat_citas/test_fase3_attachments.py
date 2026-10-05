from uuid import uuid4
from io import BytesIO
from unittest.mock import patch
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from PIL import Image
from storage_app.models import Archivo
from .models import AdjuntoConversacion
from .test_support import Fase3Fixture
from .message_services import enviarMensajeConversacionService
from datetime import timedelta
from django.db import connection
from django.db.models.query import QuerySet
from django.test.utils import CaptureQueriesContext


class AttachmentTests(Fase3Fixture):
    def test_jpeg_png_webp_pdf_y_limites_aprobados(self):
        from storage_app.validators import validar_archivo_chat
        from django.core.exceptions import ValidationError
        for fmt, extension, mime in [('JPEG', 'jpg', 'image/jpeg'), ('PNG', 'png', 'image/png'),
                                     ('WEBP', 'webp', 'image/webp'), ('PDF', 'pdf', 'application/pdf')]:
            with self.subTest(format=fmt):
                buffer = BytesIO()
                if fmt == 'PDF':
                    body = b'%PDF-1.4\n%%EOF'
                else:
                    Image.new('RGB', (8, 8), 'red').save(buffer, format=fmt)
                    body = buffer.getvalue()
                limit = (10 if fmt == 'PDF' else 8) * 1024 * 1024
                file = SimpleUploadedFile('valid.' + extension, body, mime)
                # La transferencia recibe el cursor original, no el fin del archivo.
                file.seek(2)
                validar_archivo_chat(file)
                self.assertEqual(file.tell(), 2)
                at_limit = SimpleUploadedFile('valid.' + extension, body + b'\0' * (limit - len(body)), mime)
                validar_archivo_chat(at_limit)
                too_big = SimpleUploadedFile('valid.' + extension, body + b'\0' * (limit + 1 - len(body)), mime)
                with self.assertRaises(ValidationError):
                    validar_archivo_chat(too_big)
                self.assertIsNotNone(self.upload(file=file).pk)

    def test_transferencia_no_bloquea_cita_y_compensacion_fallida_registrada(self):
        fn = self.api('attachment_services', 'cargarAdjuntoConversacionService')
        error = self.api('exceptions', 'ChatError')
        acquisitions = []
        original = QuerySet.select_for_update
        def record(queryset, *args, **kwargs):
            acquisitions.append(queryset.model._meta.label)
            return original(queryset, *args, **kwargs)
        def transfer(**kwargs):
            self.assertEqual(acquisitions, [])
            self.conv.fecha_cierre = self.now
            self.conv.save()
            return {'nombre': 'x.pdf', 'key': 'chat/residue', 'tipo': 'application/pdf', 'tamano': 8}
        with patch.object(QuerySet, 'select_for_update', record), \
             patch('storage_app.services.subir_archivo', side_effect=transfer), \
             patch('storage_app.services.eliminar_archivo', return_value=False), \
             self.assertLogs('chat_citas.attachment_services', level='ERROR') as logs:
            with self.assertRaises(error):
                fn(self.conv.pk, self.patient, SimpleUploadedFile('x.pdf', b'%PDF-1.4', 'application/pdf'))
        self.assertTrue(Archivo.objects.filter(storage_key='chat/residue', activo=True).exists())
        self.assertFalse(AdjuntoConversacion.objects.exists())
        self.assertNotIn('chat/residue', '\n'.join(logs.output))

    def test_signed_download_expira_600_sin_inyeccion_nombre(self):
        from storage_app.services import generar_url_firmada
        with patch('storage_app.services.obtener_cliente_s3') as provider:
            provider.return_value.generate_presigned_url.return_value = 'https://signed.test/file'
            url = generar_url_firmada('key', nombre_descarga='dir\\archivo\r\n.pdf')
            params = provider.return_value.generate_presigned_url.call_args.kwargs
        self.assertEqual(url, 'https://signed.test/file')
        self.assertEqual(params['ExpiresIn'], 600)
        disposition = params['Params']['ResponseContentDisposition']
        self.assertTrue(disposition.startswith('attachment;'))
        self.assertNotIn('\r', disposition)
        self.assertNotIn('\n', disposition)
        self.assertNotIn('dir', disposition)

    def test_retry_adjuntos_reordenados_cerrado_sin_writes_callbacks(self):
        a, b = self.upload(), self.upload()
        uid = uuid4()
        first = enviarMensajeConversacionService(self.conv.pk, self.patient,
            client_message_id=uid, contenido='hola', adjunto_ids=[a.pk, b.pk])
        self.conv.fecha_cierre = self.now
        self.conv.save()
        with self.captureOnCommitCallbacks(execute=False) as callbacks, CaptureQueriesContext(connection) as queries:
            retry = enviarMensajeConversacionService(self.conv.pk, self.patient,
                client_message_id=uid, contenido='hola', adjunto_ids=[b.pk, a.pk])
        self.assertEqual(retry.mensaje.pk, first.mensaje.pk)
        self.assertEqual(callbacks, [])
        self.assertFalse(any(q['sql'].lstrip().upper().startswith(('INSERT', 'UPDATE', 'DELETE')) for q in queries))
        error = self.api('exceptions', 'ChatError')
        with self.assertRaises(error) as exc:
            enviarMensajeConversacionService(self.conv.pk, self.patient,
                client_message_id=uid, contenido='hola', adjunto_ids=[a.pk])
        self.assertEqual(exc.exception.status, 409)

    def test_archivo_otro_chat_generico_inactivo_y_nota_con_adjunto(self):
        error = self.api('exceptions', 'ChatError')
        from citas.models import Cita
        from .models import Conversacion
        adj = self.upload()
        other_cita = Cita.objects.create(id_usuario=self.patient, id_medico=self.doctor,
            id_estado=self.states['confirmada'], fecha_programada=self.now)
        other_conv = Conversacion.objects.create(cita=other_cita)
        adj.conversacion = other_conv
        adj.save()
        with self.assertRaises(error):
            enviarMensajeConversacionService(self.conv.pk, self.patient,
                client_message_id=uuid4(), contenido='hola', adjunto_ids=[adj.pk])
        generic = Archivo.objects.create(usuario=self.patient, nombre_original='x.pdf', storage_key='generic/x')
        with self.assertRaises(error):
            enviarMensajeConversacionService(self.conv.pk, self.patient,
                client_message_id=uuid4(), contenido='hola', adjunto_ids=[generic.pk])
        inactive = self.upload()
        Archivo.objects.filter(pk=inactive.archivo_id).update(activo=False)
        with self.assertRaises(error):
            enviarMensajeConversacionService(self.conv.pk, self.patient,
                client_message_id=uuid4(), contenido='hola', adjunto_ids=[inactive.pk])
        self.cita.fecha_programada = self.now + timedelta(days=3)
        self.cita.save()
        note_attachment = self.upload()
        note = enviarMensajeConversacionService(self.conv.pk, self.patient,
            client_message_id=uuid4(), contenido='', modalidad='nota_previa', adjunto_ids=[note_attachment.pk])
        self.assertEqual(note.mensaje.tipo, 'nota_previa')
        self.assertIsNone(note.mensaje.conversacion.fecha_habilitacion_anticipada)

    def test_fallo_tras_vincular_revierte_mensaje_y_adjunto(self):
        from .models import Mensaje
        from notificaciones.models import Notificacion
        adj = self.upload()
        with self.captureOnCommitCallbacks(execute=False) as callbacks:
            with patch('chat_citas.message_services.enviarNotificacion', side_effect=RuntimeError('fallo')):
                with self.assertRaises(RuntimeError):
                    enviarMensajeConversacionService(self.conv.pk, self.patient,
                        client_message_id=uuid4(), contenido='', adjunto_ids=[adj.pk])
        adj.refresh_from_db()
        self.assertIsNone(adj.mensaje_id)
        self.assertFalse(Mensaje.objects.exists())
        self.assertFalse(Notificacion.objects.exists())
        self.assertEqual(callbacks, [])

    def test_jpeg_truncado_se_rechaza_antes_de_subir(self):
        # verify() puede revisar solo cabecera JPEG: exigir decodificación real.
        buffer = BytesIO()
        Image.frombytes('RGB', (64, 64), bytes(range(256)) * 48).save(buffer, format='JPEG')
        corrupted = SimpleUploadedFile('foto.jpg', buffer.getvalue()[:-20], 'image/jpeg')
        error = self.api('exceptions', 'ChatError')
        with self.assertRaises(error) as exc:
            self.upload(file=corrupted)
        self.assertEqual(exc.exception.status, 400)

    def test_envio_adjuntos_retry_cerrado_y_acceso_participantes(self):
        adj = self.upload()
        uid = uuid4()
        first = enviarMensajeConversacionService(self.conv.pk, self.patient,
            client_message_id=uid, contenido='', adjunto_ids=[adj.pk])
        adj.refresh_from_db()
        self.assertEqual(adj.mensaje_id, first.mensaje.pk)
        self.conv.fecha_cierre = self.now
        self.conv.save()
        from notificaciones.models import Notificacion
        before = Notificacion.objects.count()
        retry = enviarMensajeConversacionService(self.conv.pk, self.patient,
            client_message_id=uid, contenido='', adjunto_ids=[adj.pk])
        self.assertEqual(retry.mensaje.pk, first.mensaje.pk)
        self.assertFalse(retry.created)
        self.assertEqual(Notificacion.objects.count(), before)
        url = self.api('attachment_services', 'obtenerUrlAdjuntoConversacionService')
        with patch('storage_app.services.generar_url_firmada', return_value='https://signed.test/x'):
            self.assertTrue(url(self.conv.pk, adj.pk, self.doctor)['url'])

    def test_archivos_ajenos_inexistentes_y_reutilizados(self):
        adj = self.upload(self.doctor)
        error = self.api('exceptions', 'ChatError')
        for ids in ([adj.pk], [99999]):
            with self.assertRaises(error):
                enviarMensajeConversacionService(self.conv.pk, self.patient,
                    client_message_id=uuid4(), contenido='', adjunto_ids=ids)
        owned = self.upload()
        enviarMensajeConversacionService(self.conv.pk, self.patient,
            client_message_id=uuid4(), contenido='', adjunto_ids=[owned.pk])
        with self.assertRaises(error):
            enviarMensajeConversacionService(self.conv.pk, self.patient,
                client_message_id=uuid4(), contenido='', adjunto_ids=[owned.pk])

    def upload(self, actor=None, file=None):
        fn = self.api('attachment_services', 'cargarAdjuntoConversacionService')
        file = file or SimpleUploadedFile('informe.pdf', b'%PDF-1.4\n%%EOF', 'application/pdf')
        # Mantener persistencia real; simular únicamente transferencia remota.
        with patch('storage_app.services.subir_archivo', return_value={
            'nombre': file.name, 'key': 'chat/' + str(uuid4()), 'tipo': file.content_type, 'tamano': file.size}):
            return fn(self.conv.pk, actor or self.patient, file)

    def test_carga_y_pendiente_privado(self):
        adj = self.upload()
        url = self.api('attachment_services', 'obtenerUrlAdjuntoConversacionService')
        error = self.api('exceptions', 'ChatError')
        with patch('storage_app.services.generar_url_firmada', return_value='https://signed.test/file'):
            self.assertEqual(url(self.conv.pk, adj.pk, self.patient)['expiracion'], 600)
            with self.assertRaises(error):
                url(self.conv.pk, adj.pk, self.doctor)

    def test_formatos_invalidos_y_cerrado(self):
        error = self.api('exceptions', 'ChatError')
        for name, body, mime in [('x.png', b'fake', 'image/png'), ('x.pdf', b'<html>', 'application/pdf'),
                                 ('x.txt', b'%PDF-', 'application/pdf')]:
            with self.assertRaises(error):
                self.upload(file=SimpleUploadedFile(name, body, mime))
        self.conv.fecha_cierre = self.now
        self.conv.save()
        with self.assertRaises(error):
            self.upload()

    def test_genericas_no_exponen_ni_borran_chat(self):
        adj = self.upload()
        client = APIClient()
        client.force_authenticate(self.patient)
        for suffix in ('', 'url/'):
            response = client.get(f'/api/storage/archivos/{adj.archivo_id}/{suffix}')
            self.assertEqual(response.status_code, 404)
        self.assertEqual(client.delete(f'/api/storage/archivos/{adj.archivo_id}/').status_code, 404)
        self.assertNotIn(adj.archivo_id, [a['id'] for a in client.get('/api/storage/archivos/').data['archivos']])

    def test_cierre_durante_subida_compensa(self):
        fn = self.api('attachment_services', 'cargarAdjuntoConversacionService')
        error = self.api('exceptions', 'ChatError')
        def transfer(**kwargs):
            self.conv.fecha_cierre = self.now
            self.conv.save()
            return {'nombre': 'x.pdf', 'key': 'chat/transient', 'tipo': 'application/pdf', 'tamano': 8}
        with patch('storage_app.services.subir_archivo', side_effect=transfer), \
             patch('storage_app.services.eliminar_archivo', return_value=True):
            with self.assertRaises(error):
                fn(self.conv.pk, self.patient, SimpleUploadedFile('x.pdf', b'%PDF-1.4', 'application/pdf'))
        self.assertFalse(Archivo.objects.filter(storage_key='chat/transient', activo=True).exists())
        self.assertFalse(AdjuntoConversacion.objects.exists())
