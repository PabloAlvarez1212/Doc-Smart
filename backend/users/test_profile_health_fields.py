from datetime import date
from django.test import TestCase
from rest_framework.test import APIClient
from catalogos.models import Rol
from users.models import Usuario


class ProfileHealthFieldsTests(TestCase):
    def setUp(self):
        self.user = Usuario.objects.create(nombre='Ana', apellido='Pérez',
            fecha_nacimiento=date(1990, 1, 1), estatura=1.7, peso=65,
            genero='F', tipo_sangre='O+', correo='health-fields@example.test',
            contraseña='unused', cedula='12345678', telefono='3001234567',
            id_rol=Rol.objects.create(nombre='paciente'))
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_profile_round_trip_preserves_registration_health_fields_and_identity(self):
        response = self.client.put('/api/perfil/', {
            'genero': 'PREFIERO_NO_DECIR', 'tipo_sangre': 'AB-', 'peso': 70, 'estatura': 1.75,
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        profile = self.client.get('/api/perfil/').data['data']
        self.assertEqual(profile['genero'], 'PREFIERO_NO_DECIR')
        self.assertEqual(profile['tipo_sangre'], 'AB-')
        self.assertEqual(profile['peso'], 70)
        self.assertEqual(profile['estatura'], 1.75)
        self.assertEqual(profile['nombre'], 'Ana')
        self.assertEqual(profile['cedula'], '12345678')

    def test_invalid_choices_are_rejected_without_mutation(self):
        for payload in ({'genero': 'INVALID'}, {'tipo_sangre': 'C+'}):
            response = self.client.put('/api/perfil/', payload, format='json')
            self.assertEqual(response.status_code, 400, response.data)
        self.user.refresh_from_db()
        self.assertEqual(self.user.genero, 'F')
        self.assertEqual(self.user.tipo_sangre, 'O+')

    def test_authentication_is_required(self):
        self.client.force_authenticate(None)
        self.assertIn(self.client.get('/api/perfil/').status_code, (401, 403))
