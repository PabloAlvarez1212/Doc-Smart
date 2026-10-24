from chat_citas.tests import ChatFixture
from chat_citas.models import Conversacion
from historial_medico.models import HistorialClinico
from notificaciones.models import Notificacion
from rest_framework.test import APIClient


class DestinoTests(ChatFixture):
    def destino(self, notification, actor):
        client = APIClient()
        client.force_authenticate(actor)
        return client.get(f'/api/notificaciones/{notification.pk}/destino/')

    def test_legacy_has_explanatory_unavailable_destination(self):
        n = Notificacion.objects.create(titulo='Cita 123', mensaje='https://evil.test', tipo='cita_confirmada', id_usuario=self.patients[0])
        response = self.destino(n, self.patients[0])
        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.data['ok'])
        self.assertIn('detalle', response.data['errores'])

    def test_all_resources_for_both_roles(self):
        conv = Conversacion.objects.create(cita=self.cita)
        history = HistorialClinico.objects.create(cita=self.cita, usuario=self.patients[0], medico=self.doctors[1], diagnostico_general='Test', motivo_consulta='Test')
        for actor, recipient in ((self.patients[0], {'id_usuario': self.patients[0]}), (self.doctors[1], {'id_medico': self.doctors[1]})):
            for kind, event, field, resource in (('cita', 'cita_confirmada', 'cita', self.cita), ('conversacion', 'mensaje_nuevo', 'conversacion', conv), ('historial', 'historial_creado', 'historial', history)):
                with self.subTest(kind=kind, actor=type(actor).__name__):
                    n = Notificacion.objects.create(titulo='Sin pistas', mensaje='Sin pistas', tipo=event, **recipient, **{field: resource})
                    response = self.destino(n, actor)
                    self.assertEqual(response.status_code, 200)
                    self.assertEqual(response.data['data']['tipo'], kind)
                    self.assertEqual(response.data['data']['id'], resource.pk)
                    self.assertTrue(response.data['data']['ruta'].startswith('/'))
                    n.refresh_from_db()
                    self.assertFalse(n.leida)

    def test_recipient_and_resource_ownership_are_both_required(self):
        n = Notificacion.objects.create(titulo='Test', mensaje='Test', tipo='cita_confirmada', cita=self.cita, id_usuario=self.patients[1])
        self.assertEqual(self.destino(n, self.patients[0]).status_code, 403)
        self.assertEqual(self.destino(n, self.patients[1]).status_code, 403)
        self.assertEqual(self.destino(n, self.doctors[0]).status_code, 403)

    def test_deleted_resource_and_mismatched_type_are_unavailable(self):
        n = Notificacion.objects.create(titulo='Test', mensaje='Test', tipo='cita_confirmada', cita=self.cita, id_usuario=self.patients[0])
        self.cita.delete()
        self.assertEqual(self.destino(n, self.patients[0]).status_code, 404)

    def test_unknown_event_never_uses_an_arbitrary_resource(self):
        n = Notificacion.objects.create(titulo='cita', mensaje='https://evil.test', tipo='unknown', cita=self.cita, id_usuario=self.patients[0])
        self.assertEqual(self.destino(n, self.patients[0]).status_code, 404)

    def test_history_creation_notifies_both_owners_with_real_history(self):
        from historial_medico.services import crearHistorialDesdeCierreService
        history, status = crearHistorialDesdeCierreService(self.cita, self.doctors[1], self.datos_historial)
        self.assertEqual(status, 201)
        notifications = list(Notificacion.objects.filter(tipo='historial_creado'))
        self.assertEqual(len(notifications), 2)
        self.assertTrue(all(n.historial_id == history.pk for n in notifications))

    def test_typed_ids_survive_list_and_websocket_without_overwriting_extras(self):
        from notificaciones.services import enviarNotificacion, listarNotificacionesService
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        layer = get_channel_layer()
        channel = async_to_sync(layer.new_channel)()
        async_to_sync(layer.group_add)(f'user_{self.patients[0].pk}', channel)
        with self.captureOnCommitCallbacks(execute=True):
            n = enviarNotificacion('Test', 'Test', 'cita_confirmada', id_usuario=self.patients[0].pk, cita_id=self.cita.pk, extra_data={'tipo_evento': 'ACTUALIZACION_CITA'})
        event = async_to_sync(layer.receive)(channel)
        self.assertEqual(event['notificacion']['cita_id'], self.cita.pk)
        self.assertEqual(event['tipo_evento'], 'ACTUALIZACION_CITA')
        data, status = listarNotificacionesService(self.patients[0])
        self.assertEqual(data['data'][0]['cita_id'], self.cita.pk)

    def test_every_resource_rejects_wrong_patient_and_doctor(self):
        conv = Conversacion.objects.create(cita=self.cita)
        history = HistorialClinico.objects.create(usuario=self.patients[0], medico=self.doctors[1], diagnostico_general='Test', motivo_consulta='Test')
        for actor, recipient in ((self.patients[1], {'id_usuario': self.patients[1]}), (self.doctors[0], {'id_medico': self.doctors[0]})):
            for event, field, resource in (('cita_confirmada', 'cita', self.cita), ('mensaje_nuevo', 'conversacion', conv), ('historial_creado', 'historial', history)):
                n = Notificacion.objects.create(titulo='Test', mensaje='Test', tipo=event, **recipient, **{field: resource})
                self.assertEqual(self.destino(n, actor).status_code, 403)

    def test_deleted_history_is_unavailable(self):
        history = HistorialClinico.objects.create(usuario=self.patients[0], medico=self.doctors[1], diagnostico_general='Test', motivo_consulta='Test')
        n = Notificacion.objects.create(titulo='Test', mensaje='Test', tipo='historial_creado', historial=history, id_usuario=self.patients[0])
        history.delete()
        self.assertEqual(self.destino(n, self.patients[0]).status_code, 404)

    def test_arbitrary_query_ids_and_urls_cannot_override_persisted_resource(self):
        client = APIClient()
        client.force_authenticate(self.patients[0])
        n = Notificacion.objects.create(titulo='Test', mensaje='Test', tipo='cita_confirmada', cita=self.cita, id_usuario=self.patients[0])
        response = client.get(f'/api/notificaciones/{n.pk}/destino/?id=999999&tipo=historial&ruta=https://evil.test')
        self.assertEqual(response.data['data'], {'tipo': 'cita', 'id': self.cita.pk, 'ruta': f'/patient/my-appointments?cita={self.cita.pk}'})

    def test_read_action_still_works_independently_of_destination(self):
        n = Notificacion.objects.create(titulo='Test', mensaje='Test', tipo='unknown', id_usuario=self.patients[0])
        client = APIClient()
        client.force_authenticate(self.patients[0])
        self.assertEqual(client.patch(f'/api/notificaciones/{n.pk}/leida/').status_code, 200)
        n.refresh_from_db()
        self.assertTrue(n.leida)
        self.assertEqual(self.destino(n, self.patients[0]).status_code, 404)

    def test_conversation_destination_rechecks_chat_access_policy(self):
        from medicos.models import SolicitudValidacionMedico
        conv = Conversacion.objects.create(cita=self.cita)
        n = Notificacion.objects.create(titulo='Test', mensaje='Test', tipo='mensaje_nuevo', conversacion=conv, id_medico=self.doctors[1])
        SolicitudValidacionMedico.objects.filter(medico=self.doctors[1]).update(estado='rechazado')
        self.assertEqual(self.destino(n, self.doctors[1]).status_code, 403)

    def test_doctor_history_route_rejects_inconsistent_appointment_owner(self):
        history = HistorialClinico.objects.create(cita=self.cita, usuario=self.patients[0], medico=self.doctors[0], diagnostico_general='Test', motivo_consulta='Test')
        n = Notificacion.objects.create(titulo='Test', mensaje='Test', tipo='historial_creado', historial=history, id_medico=self.doctors[0])
        self.assertEqual(self.destino(n, self.doctors[0]).status_code, 403)
