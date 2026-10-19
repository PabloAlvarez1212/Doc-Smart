from datetime import date
from django.test import TestCase
from catalogos.models import Rol
from medicos.models import Medico, Especialidad
from notificaciones.models import Notificacion
from notificaciones.services import listarNotificacionesService, marcarNotificacionLeidaService

class DoctorNotificationCountTests(TestCase):
    def setUp(self):
        role = Rol.objects.create(nombre='doctor')
        specialty = Especialidad.objects.create(nombre='General')
        def doctor(number):
            return Medico.objects.create(nombre='Medico', apellido='Prueba', cedula=str(number), correo=f'doc{number}@example.com', fecha_nacimiento=date(1990,1,1), telefono='3001234567', contraseña='test', direccion='Consulta', id_rol=role, id_especialidad=specialty)
        self.doctor = doctor(1)
        self.other = doctor(2)
        self.unread = Notificacion.objects.create(id_medico=self.doctor, titulo='Cita', mensaje='Primera', tipo='cita_agendada')
        Notificacion.objects.create(id_medico=self.doctor, titulo='Cita', mensaje='Segunda', tipo='cita_agendada')
        Notificacion.objects.create(id_medico=self.doctor, titulo='Cita', mensaje='Vista', tipo='cita_agendada', leida=True)
        Notificacion.objects.create(id_medico=self.other, titulo='Cita', mensaje='Otro medico', tipo='cita_agendada')

    def test_count_is_scoped_and_independent_of_pagination(self):
        data, status = listarNotificacionesService(self.doctor, page=1, page_size=1)
        self.assertEqual(status, 200)
        self.assertEqual(len(data['data']), 1)
        self.assertEqual(data['no_leidas'], 2)
        self.assertEqual(data['paginacion']['count'], 3)

    def test_mark_read_is_persisted_and_idempotent(self):
        for _ in range(2):
            _, status = marcarNotificacionLeidaService(self.unread.id, self.doctor)
            self.assertEqual(status, 200)
        data, _ = listarNotificacionesService(self.doctor)
        self.assertEqual(data['no_leidas'], 1)

    def test_other_doctor_cannot_mark_read(self):
        _, status = marcarNotificacionLeidaService(self.unread.id, self.other)
        self.assertEqual(status, 403)
        self.unread.refresh_from_db()
        self.assertFalse(self.unread.leida)

    def test_patient_with_same_numeric_id_cannot_mark_doctor_notification(self):
        from users.models import Usuario
        patient = Usuario.objects.create(id=self.doctor.id, nombre='Paciente', apellido='Prueba', cedula='p1', correo='patient@example.com', fecha_nacimiento=date(1990,1,1), estatura=170, peso=70, telefono='3001234567', contraseña='test', id_rol=Rol.objects.create(nombre='paciente'))
        _, status = marcarNotificacionLeidaService(self.unread.id, patient)
        self.assertEqual(status, 403)
        self.unread.refresh_from_db()
        self.assertFalse(self.unread.leida)
        own = Notificacion.objects.create(id_usuario=patient, titulo='Cita', mensaje='Del paciente', tipo='cita_agendada')
        _, own_status = marcarNotificacionLeidaService(own.id, patient)
        self.assertEqual(own_status, 200)
        patient_data, _ = listarNotificacionesService(patient)
        self.assertEqual(patient_data['no_leidas'], 0)
        self.assertEqual(patient_data['paginacion']['count'], 1)
