from datetime import date, timedelta
from unittest.mock import patch
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from catalogos.models import Rol
from medicos.models import Medico, Especialidad
from users.models import Usuario, CambioCorreoUsuario
from users.services import solicitarCambioCorreoService, confirmarCambioCorreoService

class DoctorEmailTests(TestCase):
    def setUp(self):
        self.doctor = Medico.objects.create(nombre='Ana', apellido='Perez', cedula='123', correo='doctor@example.com', fecha_nacimiento=date(1990,1,1), telefono='3001234567', contraseña='test', direccion='Consulta', id_rol=Rol.objects.create(nombre='doctor'), id_especialidad=Especialidad.objects.create(nombre='General'), documento_verificado_en=timezone.now())
        self.patient = Usuario.objects.create(id=self.doctor.id, nombre='Paciente', apellido='Perez', cedula='p123', correo='patient@example.com', fecha_nacimiento=date(1990,1,1), telefono='3001234567', contraseña='test', estatura=170, peso=70, id_rol=Rol.objects.create(nombre='paciente'))
        self.client=APIClient()
        self.client.force_authenticate(self.doctor)

    def request_change(self):
        with patch('users.services.resend.Emails.send'), patch('users.services.generarCodigoOTP',return_value='012345'):
            response=self.client.post('/api/medicos/perfil/correo/solicitar-cambio/',{'correo':'nuevo@example.com'},format='json')
        self.assertEqual(response.status_code,201,response.data)
        return response.data['data']['cambio_id']

    def test_confirmed_only_and_no_replay(self):
        change=self.request_change()
        self.doctor.refresh_from_db()
        self.assertEqual(self.doctor.correo,'doctor@example.com')
        for code,status in [('000000',400),('012345',200),('012345',400)]:
            response=self.client.post('/api/medicos/perfil/correo/confirmar-cambio/',{'cambio_id':change,'codigo':code},format='json')
            self.assertEqual(response.status_code,status,response.data)
        self.doctor.refresh_from_db()
        self.assertEqual(self.doctor.correo,'nuevo@example.com')
        self.assertIsNotNone(self.doctor.correo_verificado_en)

    def test_role_and_owner_isolation(self):
        change=self.request_change()
        _,status=confirmarCambioCorreoService(self.patient,change,'012345')
        self.assertEqual(status,400)
        self.client.force_authenticate(self.patient)
        response=self.client.post('/api/medicos/perfil/correo/solicitar-cambio/',{'correo':'otro@example.com'},format='json')
        self.assertEqual(response.status_code,403)
        self.client.force_authenticate(None)
        self.assertIn(self.client.post('/api/medicos/perfil/correo/solicitar-cambio/',{'correo':'otro@example.com'},format='json').status_code,[401,403])

    def test_expired_and_replaced_codes(self):
        first=self.request_change()
        second=self.request_change()
        _,status=confirmarCambioCorreoService(self.doctor,first,'012345')
        self.assertEqual(status,400)
        CambioCorreoUsuario.objects.filter(pk=second).update(otp_expira_en=timezone.now()-timedelta(seconds=1))
        _,status=confirmarCambioCorreoService(self.doctor,second,'012345')
        self.assertEqual(status,400)

    def test_patient_contract_preserved_and_cross_role_duplicate_rejected(self):
        with patch('users.services.resend.Emails.send'),patch('users.services.generarCodigoOTP',return_value='012345'):
            data,status=solicitarCambioCorreoService(self.patient,'paciente-nuevo@example.com')
        self.assertEqual(status,201)
        _,status=confirmarCambioCorreoService(self.patient,data['cambio_id'],'012345')
        self.assertEqual(status,200)
        _,status=solicitarCambioCorreoService(self.doctor,'paciente-nuevo@example.com')
        self.assertEqual(status,400)

    def test_profile_cannot_bypass_otp_and_exposes_real_verification(self):
        response=self.client.get('/api/medicos/perfil/')
        self.assertEqual(response.status_code,200)
        self.assertTrue(response.data['data']['documento_verificado_en'])
        response=self.client.put('/api/medicos/perfil/',{'correo':'bypass@example.com'},format='json')
        self.assertEqual(response.status_code,400)
