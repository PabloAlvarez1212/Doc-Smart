from uuid import uuid4
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken
from django.db import connection
from django.test.utils import CaptureQueriesContext
from .models import Mensaje, Conversacion
from .test_support import Fase3Fixture


class ApiReadTests(Fase3Fixture):
    def test_historial_limites_por_defecto_y_no_filtra_archivos(self):
        Mensaje.objects.bulk_create([Mensaje(conversacion=self.conv, tipo='sistema',
            clave_evento=f'system:{i}') for i in range(105)])
        client = self.client_for(self.patient)
        path = f'/api/chat-citas/conversaciones/{self.conv.pk}/mensajes/'
        default = client.get(path).data['data']
        self.assertEqual(len(default['results']), 50)
        maximum = client.get(path, {'limit': 100}).data['data']
        self.assertEqual(len(maximum['results']), 100)
        ids = [m['id'] for m in maximum['results']]
        self.assertEqual(ids, sorted(ids, reverse=True))
        self.assertNotIn('storage_key', str(maximum))
        self.assertNotIn('url', str(maximum))
        for before in ('0', '-1', 'bad'):
            self.assertEqual(client.get(path, {'antes_de': before}).status_code, 400)

    def test_admin_y_colision_identidad_no_ven_historial(self):
        from catalogos.models import Rol
        client = self.client_for(self.doctors[0], 'medico')
        path = f'/api/chat-citas/conversaciones/{self.conv.pk}/'
        self.assertEqual(client.get(path).status_code, 403)
        admin, _ = Rol.objects.get_or_create(nombre='admin')
        type(self.patient).objects.filter(pk=self.patient.pk).update(id_rol=admin)
        client = self.client_for(self.patient)
        self.assertEqual(client.get(path).status_code, 403)
        self.assertEqual(client.get('/api/chat-citas/conversaciones/').status_code, 403)

    def test_historica_sin_chat_no_se_crea_en_get(self):
        from citas.models import Cita
        Cita.objects.create(id_usuario=self.patient, id_medico=self.doctor,
            id_estado=self.states['confirmada'], fecha_programada=self.now)
        client = self.client_for(self.patient)
        response = client.get('/api/chat-citas/conversaciones/')
        self.assertEqual(response.data['data']['count'], 1)
        self.assertEqual(Conversacion.objects.count(), 1)

    def test_estado_catalogo_mayusculas_sigue_politica_del_dominio(self):
        from catalogos.models import Estado
        self.cita.id_estado = Estado.objects.create(nombre='Confirmada')
        self.cita.save()
        client = self.client_for(self.patient)
        listing = client.get('/api/chat-citas/conversaciones/')
        self.assertEqual(listing.data['data']['count'], 1)
        self.assertEqual(client.get(f'/api/chat-citas/conversaciones/{self.conv.pk}/').status_code, 200)

    def test_cierre_explicito_completada_sin_fin_sigue_visible(self):
        self.cita.id_estado = self.states['completada']
        self.cita.fecha_final = None
        self.cita.save()
        self.conv.fecha_cierre = self.now
        self.conv.save()
        client = self.client_for(self.patient)
        self.assertEqual(client.get('/api/chat-citas/conversaciones/').data['data']['count'], 1)
        self.assertEqual(client.get(f'/api/chat-citas/conversaciones/{self.conv.pk}/').status_code, 200)

    def client_for(self, actor, kind='usuario'):
        client = APIClient()
        token = AccessToken()
        token['user_id'], token['tipo'] = actor.pk, kind
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        return client

    def test_listado_detalle_propios_no_crea_ni_lee(self):
        client = self.client_for(self.patient)
        response = client.get('/api/chat-citas/conversaciones/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['data']['results'][0]['id'], self.conv.pk)
        detail = client.get(f'/api/chat-citas/conversaciones/{self.conv.pk}/')
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data['data']['estado'], 'activo')
        self.assertEqual(Conversacion.objects.count(), 1)
        self.conv.refresh_from_db()
        self.assertIsNone(self.conv.ultimo_leido_paciente_id)
        outsider = self.client_for(self.patients[1])
        self.assertEqual(outsider.get(f'/api/chat-citas/conversaciones/{self.conv.pk}/').status_code, 403)

    def test_historial_cursor_estable(self):
        client = self.client_for(self.patient)
        for _ in range(4):
            Mensaje.objects.create(conversacion=self.conv, tipo='medico', emisor_medico=self.doctor,
                client_message_id=uuid4(), contenido='texto')
        path = f'/api/chat-citas/conversaciones/{self.conv.pk}/mensajes/'
        first = client.get(path, {'limit': 2})
        self.assertEqual(first.status_code, 200)
        page = first.data['data']
        ids = [m['id'] for m in page['results']]
        Mensaje.objects.create(conversacion=self.conv, tipo='sistema', clave_evento='new')
        second = client.get(path, {'limit': 2, 'antes_de': page['next_before']}).data['data']
        older = [m['id'] for m in second['results']]
        self.assertEqual(len(set(ids + older)), 4)
        self.assertLess(max(older), min(ids))
        self.assertFalse(second['has_more'])
        self.assertEqual(client.get(path, {'limit': 101}).status_code, 400)

    def test_medico_revocado_no_lee(self):
        from medicos.models import SolicitudValidacionMedico
        client = self.client_for(self.doctor, 'medico')
        self.assertEqual(client.get(f'/api/chat-citas/conversaciones/{self.conv.pk}/').status_code, 200)
        SolicitudValidacionMedico.objects.filter(medico=self.doctor).update(estado='rechazado')
        self.assertEqual(client.get(f'/api/chat-citas/conversaciones/{self.conv.pk}/').status_code, 403)


    def test_medico_aprobado_con_rol_doctor_lista_sus_conversaciones(self):
        client = self.client_for(self.doctor,'medico')
        response = client.get('/api/chat-citas/conversaciones/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['data']['count'], 1)
        self.assertEqual(response.data['data']['results'][0]['id'], self.conv.pk)