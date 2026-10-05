from django.contrib.auth.models import AnonymousUser
from django.db import transaction
from django.db.models.query import QuerySet
from unittest.mock import patch
from catalogos.models import Rol
from medicos.models import SolicitudValidacionMedico
from .test_support import Fase3Fixture


class AccessTests(Fase3Fixture):
    def test_visible_propietarios_y_rechazo_ajenos(self):
        visible = self.api('access', 'cargarConversacionVisible')
        error = self.api('exceptions', 'ChatError')
        for actor in (self.patient, self.doctor):
            self.assertEqual(visible(self.conv.pk, actor)[0].pk, self.conv.pk)
        for actor in (self.patients[1], self.doctors[0], AnonymousUser()):
            with self.assertRaises(error):
                visible(self.conv.pk, actor)

    def test_instancia_obsoleta_no_conserva_aprobacion(self):
        visible = self.api('access', 'cargarConversacionVisible')
        error = self.api('exceptions', 'ChatError')
        SolicitudValidacionMedico.objects.filter(medico=self.doctor).update(estado='rechazado')
        with self.assertRaises(error) as exc:
            visible(self.conv.pk, self.doctor)
        self.assertEqual(exc.exception.status, 403)

    def test_bloqueo_requiere_atomic_y_conserva_relacion(self):
        locked = self.api('access', 'bloquearConversacion')
        with transaction.atomic():
            conv, actor = locked(self.conv.pk, self.patient)
        self.assertEqual(conv.cita.pk, self.cita.pk)
        self.assertEqual(actor.pk, self.patient.pk)

    def test_bloqueo_ordenado_medico_cita_conversacion(self):
        locked = self.api('access', 'bloquearConversacion')
        acquired = []
        original = QuerySet.select_for_update

        def record(queryset, *args, **kwargs):
            acquired.append(queryset.model._meta.label)
            return original(queryset, *args, **kwargs)

        # Instrumentación de la adquisición; las consultas y autorización son reales.
        with patch.object(QuerySet, 'select_for_update', record), transaction.atomic():
            locked(self.conv.pk, self.patient)
        self.assertEqual(acquired, ['medicos.Medico', 'citas.Cita', 'chat_citas.Conversacion'])

    def test_propietario_administrador_no_obtiene_acceso_clinico(self):
        visible = self.api('access', 'cargarConversacionVisible')
        error = self.api('exceptions', 'ChatError')
        admin, _ = Rol.objects.get_or_create(nombre='admin')
        type(self.patient).objects.filter(pk=self.patient.pk).update(id_rol=admin)
        with self.assertRaises(error) as exc:
            visible(self.conv.pk, self.patient)
        self.assertEqual(exc.exception.status, 403)

    def test_medico_propietario_administrador_no_obtiene_acceso(self):
        visible = self.api('access', 'cargarConversacionVisible')
        error = self.api('exceptions', 'ChatError')
        admin, _ = Rol.objects.get_or_create(nombre='admin')
        type(self.doctor).objects.filter(pk=self.doctor.pk).update(id_rol=admin)
        with self.assertRaises(error) as exc:
            visible(self.conv.pk, self.doctor)
        self.assertEqual(exc.exception.status, 403)
