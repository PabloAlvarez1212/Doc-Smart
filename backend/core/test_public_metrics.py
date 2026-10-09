from unittest.mock import patch
from django.test import TestCase
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from catalogos.models import Rol, Estado
from users.models import Usuario
from medicos.models import Medico, Especialidad, SolicitudValidacionMedico
from storage_app.models import Archivo
from citas.models import Cita

class PublicMetricsTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def test_empty_counts_are_zero_not_placeholder_values(self):
        response = self.client.get('/api/public/metrics/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['data']['pacientes_registrados'], 0)
        self.assertEqual(response.data['data']['medicos_aprobados'], 0)
        self.assertEqual(response.data['data']['citas_registradas'], 0)

    def make_user(self, role, number):
        return Usuario.objects.create(nombre='Nombre privado', apellido='Apellido', fecha_nacimiento='1990-01-01', estatura=1.7, peso=70, correo=f'{number}@example.test', contraseña='test-hash', cedula=str(number), telefono='123', id_rol=role)

    def test_counts_exclude_admins_and_use_latest_medical_approval(self):
        patient_role = Rol.objects.create(nombre='paciente')
        admin_role = Rol.objects.create(nombre='admin')
        doctor_role = Rol.objects.create(nombre='medico')
        patient = self.make_user(patient_role, 1)
        self.make_user(admin_role, 2)
        specialty = Especialidad.objects.create(nombre='General')
        doctors = []
        for index in range(3):
            doctor = Medico.objects.create(nombre='Doctor privado', apellido='Apellido', cedula=f'd-{index}', fecha_nacimiento='1980-01-01', telefono='123', correo=f'd-{index}@example.test', contraseña='test-hash', id_especialidad=specialty, id_rol=doctor_role, direccion='Privada')
            doctors.append(doctor)
            file = Archivo.objects.create(medico=doctor, nombre_original='cv.pdf', storage_key=f'test/{index}.pdf', content_type='application/pdf', tamano=1, tipo='documento', categoria='hoja_vida')
            if index < 2:
                first = SolicitudValidacionMedico.objects.create(medico=doctor, hoja_vida=file, estado='aprobado')
                SolicitudValidacionMedico.objects.filter(pk=first.pk).update(fecha_solicitud=timezone.now()-timedelta(days=1))
            if index == 1:
                SolicitudValidacionMedico.objects.create(medico=doctor, hoja_vida=file, estado='rechazado')
        Cita.objects.create(id_usuario=patient, id_medico=doctors[0], id_estado=Estado.objects.create(nombre='pendiente'), fecha_programada=timezone.now())
        self.client.cookies['token'] = 'invalid-token'
        response = self.client.get('/api/public/metrics/')
        self.assertEqual(response.status_code, 200)
        data = response.data['data']
        self.assertEqual(set(data), {'pacientes_registrados','medicos_aprobados','citas_registradas','actualizado_en'})
        self.assertEqual([data['pacientes_registrados'],data['medicos_aprobados'],data['citas_registradas']], [1,1,1])
        self.assertNotIn('privado', str(data).lower())
        self.client.force_authenticate(patient)
        self.assertEqual(self.client.get('/api/session-summary/').data['data'], {'home':'/patient/home'})
        self.client.force_authenticate(doctors[1])
        self.assertEqual(self.client.get('/api/session-summary/').data['data']['home'], '/doctor/validacion')

    def test_session_summary_requires_authentication(self):
        self.assertIn(self.client.get('/api/session-summary/').status_code, (401,403))

    @patch('core.public_views.Usuario.objects.filter', side_effect=RuntimeError('private database detail'))
    def test_database_failure_is_not_a_zero_count_or_information_leak(self, mocked):
        response = self.client.get('/api/public/metrics/')
        self.assertEqual(response.status_code, 503)
        self.assertNotIn('data', response.data)
        self.assertNotIn('private database detail', str(response.data))

class DashboardCalendarTests(TestCase):
    def test_patient_and_doctor_use_bogota_calendar_at_utc_midnight(self):
        from datetime import datetime, timezone as dt_timezone
        from medicos.services import obtenerDashboardMedicoInicioService
        from users.services import obtenerDashboardPacienteInicioService
        patient_role = Rol.objects.create(nombre='paciente')
        doctor_role = Rol.objects.create(nombre='medico')
        patient = Usuario.objects.create(nombre='Paciente', apellido='Prueba', fecha_nacimiento='1990-01-01', estatura=1.7, peso=70, correo='calendar@example.test', contraseña='test-hash', cedula='calendar', telefono='123', id_rol=patient_role)
        doctor = Medico.objects.create(nombre='Medico', apellido='Prueba', cedula='calendar-doctor', fecha_nacimiento='1980-01-01', telefono='123', correo='calendar-doctor@example.test', contraseña='test-hash', id_especialidad=Especialidad.objects.create(nombre='General'), id_rol=doctor_role, direccion='Prueba')
        instant = datetime(2026,10,10,1,0,tzinfo=dt_timezone.utc)
        Cita.objects.create(id_usuario=patient, id_medico=doctor, id_estado=Estado.objects.create(nombre='confirmada'), fecha_programada=instant+timedelta(hours=1))
        with patch('django.utils.timezone.now', return_value=instant):
            doctor_data, status = obtenerDashboardMedicoInicioService(doctor.pk)
            self.assertEqual(status, 200)
            self.assertEqual(doctor_data['estadisticas']['citas_hoy'], 1)
            patient_data, status = obtenerDashboardPacienteInicioService(patient.pk)
            self.assertEqual(status, 200)
            self.assertEqual(len(patient_data['proximas_citas']), 1)
            self.assertIsNone(patient_data['proximas_citas'][0]['ciudad'])
