from uuid import uuid4
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken
from .test_support import Fase3Fixture
from .models import Mensaje


class ApiCommandTests(Fase3Fixture):
    def test_carga_url_y_mensaje_por_rest_sin_storage_key(self):
        from unittest.mock import patch
        from django.core.files.uploadedfile import SimpleUploadedFile
        client = self.client_for()
        base = f'/api/chat-citas/conversaciones/{self.conv.pk}/'
        with patch('storage_app.services.subir_archivo', return_value={
            'nombre': 'x.pdf', 'key': 'private/test', 'tipo': 'application/pdf', 'tamano': 8}):
            uploaded = client.post(base + 'adjuntos/',
                {'archivo': SimpleUploadedFile('x.pdf', b'%PDF-1.4', 'application/pdf')}, format='multipart')
        self.assertEqual(uploaded.status_code, 201)
        adj = uploaded.data['data']['id']
        self.assertNotIn('storage_key', str(uploaded.data))
        with patch('storage_app.services.generar_url_firmada', return_value='https://signed.test/file'):
            url = client.get(base + f'adjuntos/{adj}/url/')
        self.assertEqual(url.status_code, 200)
        self.assertEqual(url.data['data']['expiracion'], 600)
        payload = {'client_message_id': str(uuid4()), 'adjunto_ids': [adj]}
        sent = client.post(base + 'mensajes/', payload, format='json')
        self.assertEqual(sent.status_code, 201)
        self.assertEqual(sent.data['data']['contenido'], '')
        self.assertEqual(sent.data['data']['adjuntos'][0]['id'], adj)
        history = client.get(base + 'mensajes/').data['data']
        self.assertNotIn('url', str(history))

    def test_medico_no_aprobado_y_paciente_inasistencia_rechazados(self):
        from medicos.models import SolicitudValidacionMedico
        self.cita.fecha_programada = self.now
        self.cita.save()
        endpoint = f'/api/citas/{self.cita.pk}/inasistencia/'
        self.assertEqual(self.client_for().put(endpoint).status_code, 403)
        SolicitudValidacionMedico.objects.filter(medico=self.doctor).update(estado='rechazado')
        client = self.client_for(self.doctor)
        self.assertEqual(client.put(endpoint).status_code, 403)
        self.assertEqual(client.post(f'/api/chat-citas/conversaciones/{self.conv.pk}/mensajes/',
            {'client_message_id': str(uuid4()), 'contenido': 'hola'}, format='json').status_code, 403)

    def test_validacion_rest_conserva_envelope_del_spec(self):
        response = self.client_for().post(f'/api/chat-citas/conversaciones/{self.conv.pk}/mensajes/',
            {'client_message_id': 'no-es-uuid', 'contenido': 'hola'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.data), {'ok', 'mensaje', 'errores'})
        self.assertFalse(response.data['ok'])
        self.assertIn('client_message_id', response.data['errores'])

    def test_acciones_clinicas_rechazan_estados_y_campos_reservados(self):
        self.cita.fecha_programada = self.now + timedelta(days=3)
        self.cita.save()
        client = self.client_for(self.doctor)
        response = client.post(f'/api/chat-citas/conversaciones/{self.conv.pk}/habilitar/',
            {'fecha_habilitacion_anticipada': self.now.isoformat()}, format='json')
        self.assertEqual(response.status_code, 400)
        self.conv.refresh_from_db()
        self.assertIsNone(self.conv.fecha_habilitacion_anticipada)

    def test_inasistencia_no_acepta_estado_directo(self):
        client = self.client_for(self.doctor)
        self.cita.fecha_programada = self.now
        self.cita.save()
        response = client.put(f'/api/citas/{self.cita.pk}/inasistencia/',
            {'estado': 'inasistencia_paciente'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.cita.refresh_from_db()
        self.assertIsNone(self.cita.fecha_inasistencia)

    def client_for(self, actor=None):
        actor = actor or self.patient
        token = AccessToken()
        token['user_id'] = actor.pk
        token['tipo'] = 'medico' if actor is self.doctor else 'usuario'
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        return client

    def test_envio_retry_cerrado_conflicto_y_lectura(self):
        client = self.client_for()
        path = f'/api/chat-citas/conversaciones/{self.conv.pk}/mensajes/'
        data = {'client_message_id': str(uuid4()), 'contenido': 'hola'}
        first = client.post(path, data, format='json')
        self.assertEqual(first.status_code, 201)
        self.conv.fecha_cierre = self.now
        self.conv.save()
        retry = client.post(path, data, format='json')
        self.assertEqual(retry.status_code, 200)
        self.assertEqual(first.data['data']['id'], retry.data['data']['id'])
        self.assertEqual(client.post(path, dict(data, contenido='otro'), format='json').status_code, 409)
        self.assertEqual(client.post(path, dict(data, client_message_id=str(uuid4())), format='json').status_code, 403)
        read = client.put(f'/api/chat-citas/conversaciones/{self.conv.pk}/lectura/',
                          {'ultimo_mensaje_id': first.data['data']['id']}, format='json')
        self.assertEqual(read.status_code, 200)

    def test_campos_reservados_y_csrf(self):
        path = f'/api/chat-citas/conversaciones/{self.conv.pk}/mensajes/'
        for field in ('tipo', 'emisor_usuario', 'fecha_creacion', 'conversacion'):
            response = self.client_for().post(path, {'client_message_id': str(uuid4()),
                'contenido': 'hola', field: 'sistema'}, format='json')
            self.assertEqual(response.status_code, 400)
        token = AccessToken()
        token['user_id'], token['tipo'] = self.patient.pk, 'usuario'
        client = APIClient(enforce_csrf_checks=True)
        client.cookies['token'] = str(token)
        self.assertEqual(client.post(path, {'client_message_id': str(uuid4()), 'contenido': 'x'}, format='json').status_code, 403)

    def test_habilitar_estricto_e_inasistencia(self):
        client = self.client_for(self.doctor)
        self.cita.fecha_programada = self.now + timedelta(days=3)
        self.cita.save()
        path = f'/api/chat-citas/conversaciones/{self.conv.pk}/habilitar/'
        self.assertEqual(client.post(path).status_code, 200)
        self.assertEqual(client.post(path).status_code, 409)
        self.cita.fecha_programada = self.now
        self.cita.save()
        response = client.put(f'/api/citas/{self.cita.pk}/inasistencia/')
        self.assertEqual(response.status_code, 200)
        self.cita.refresh_from_db()
        self.conv.refresh_from_db()
        self.assertEqual(self.conv.fecha_cierre, self.cita.fecha_inasistencia)
