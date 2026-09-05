from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.settings import api_settings
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from catalogos.models import Ciudad, Departamento, Estado, Rol
from citas.models import Cita
from historial_medico.models import HistorialClinico
from medicos.models import Especialidad, Medico
from users.models import Usuario


class HistorialClinicoSecurityTests(APITestCase):
    """Verifica separación de roles y ownership, incluso con IDs colisionados."""

    @classmethod
    def setUpTestData(cls):
        rol_paciente = Rol.objects.create(nombre="paciente")
        rol_medico = Rol.objects.create(nombre="doctor")
        estado = Estado.objects.create(nombre="completada")
        departamento = Departamento.objects.create(api_id=1, nombre="Antioquia")
        ciudad = Ciudad.objects.create(api_id=1, nombre="Medellín", departamento=departamento)
        especialidad = Especialidad.objects.create(nombre="Medicina general")

        cls.paciente_uno = Usuario.objects.create(
            id=101,
            nombre="Paciente",
            apellido="Uno",
            fecha_nacimiento="1990-01-01",
            estatura=1.70,
            peso=70,
            correo="paciente1@example.com",
            contraseña="hash",
            cedula="1001",
            telefono="3000000001",
            id_rol=rol_paciente,
        )
        cls.paciente_dos = Usuario.objects.create(
            id=102,
            nombre="Paciente",
            apellido="Dos",
            fecha_nacimiento="1991-01-01",
            estatura=1.65,
            peso=60,
            correo="paciente2@example.com",
            contraseña="hash",
            cedula="1002",
            telefono="3000000002",
            id_rol=rol_paciente,
        )
        cls.medico_uno = Medico.objects.create(
            id=101,
            nombre="Médico",
            apellido="Uno",
            cedula="2001",
            fecha_nacimiento="1980-01-01",
            telefono="3100000001",
            correo="medico1@example.com",
            contraseña="hash",
            id_especialidad=especialidad,
            id_rol=rol_medico,
            direccion="Consultorio 1",
            ciudad=ciudad,
        )
        cls.medico_dos = Medico.objects.create(
            id=102,
            nombre="Médico",
            apellido="Dos",
            cedula="2002",
            fecha_nacimiento="1981-01-01",
            telefono="3100000002",
            correo="medico2@example.com",
            contraseña="hash",
            id_especialidad=especialidad,
            id_rol=rol_medico,
            direccion="Consultorio 2",
            ciudad=ciudad,
        )

        # paciente_uno.id == medico_uno.id, pero no comparten identidad.
        cls.cita_medico_uno = Cita.objects.create(
            fecha_programada=timezone.now(),
            fecha_final=timezone.now(),
            id_estado=estado,
            id_usuario=cls.paciente_dos,
            id_medico=cls.medico_uno,
        )
        cls.historial_medico_uno = HistorialClinico.objects.create(
            diagnostico_general="Diagnóstico privado del paciente dos",
            observaciones="Observación privada",
            motivo_consulta="Control",
            cita=cls.cita_medico_uno,
            usuario=cls.paciente_dos,
            medico=cls.medico_uno,
        )

        # medico_uno.id == paciente_uno.id, pero este historial es de medico_dos.
        cls.cita_paciente_uno = Cita.objects.create(
            fecha_programada=timezone.now(),
            fecha_final=timezone.now(),
            id_estado=estado,
            id_usuario=cls.paciente_uno,
            id_medico=cls.medico_dos,
        )
        cls.historial_paciente_uno = HistorialClinico.objects.create(
            diagnostico_general="Diagnóstico privado del paciente uno",
            observaciones="Observación privada",
            motivo_consulta="Seguimiento",
            cita=cls.cita_paciente_uno,
            usuario=cls.paciente_uno,
            medico=cls.medico_dos,
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def authenticate_with_cookie(self, user, user_type):
        self.client.force_authenticate(user=None)
        refresh = RefreshToken.for_user(user)
        refresh["tipo"] = user_type
        self.client.cookies["token"] = str(refresh.access_token)

    def test_permiso_global_es_is_authenticated(self):
        self.assertIn(IsAuthenticated, api_settings.DEFAULT_PERMISSION_CLASSES)

    def test_cookie_jwt_preserva_tipo_aunque_los_ids_colisionen(self):
        self.authenticate_with_cookie(self.paciente_uno, "usuario")
        patient_response = self.client.get("/api/historial/paciente/")

        self.assertEqual(patient_response.status_code, 200)
        self.assertEqual(
            {item["id"] for item in patient_response.data["data"]},
            {self.historial_paciente_uno.id},
        )

        self.authenticate_with_cookie(self.medico_uno, "medico")
        doctor_response = self.client.get("/api/historial/medico/")

        self.assertEqual(doctor_response.status_code, 200)
        self.assertEqual(
            {item["id"] for item in doctor_response.data["data"]},
            {self.historial_medico_uno.id},
        )

    def test_anonimo_no_puede_acceder_a_ningun_endpoint_de_historial(self):
        endpoints = [
            ("get", "/api/historial/paciente/", None),
            ("get", "/api/historial/medico/", None),
            ("get", f"/api/historial/{self.historial_paciente_uno.id}/", None),
            ("post", "/api/historial/", {
                "cita_id": self.cita_paciente_uno.id,
                "diagnostico_general": "Diagnóstico",
                "motivo_consulta": "Consulta",
            }),
            ("put", f"/api/historial/{self.historial_paciente_uno.id}/", {
                "diagnostico_general": "Alterado",
            }),
        ]

        for method, url, payload in endpoints:
            with self.subTest(method=method, url=url):
                response = getattr(self.client, method)(url, payload, format="json")
                self.assertEqual(response.status_code, 401)

    def test_paciente_solo_lista_sus_propios_historiales(self):
        self.authenticate(self.paciente_uno)
        response = self.client.get("/api/historial/paciente/")

        self.assertEqual(response.status_code, 200)
        ids = {item["id"] for item in response.data["data"]}
        self.assertEqual(ids, {self.historial_paciente_uno.id})

    def test_medico_solo_lista_los_historiales_que_creo(self):
        self.authenticate(self.medico_uno)
        response = self.client.get("/api/historial/medico/")

        self.assertEqual(response.status_code, 200)
        ids = {item["id"] for item in response.data["data"]}
        self.assertEqual(ids, {self.historial_medico_uno.id})

    def test_colision_id_no_da_acceso_de_paciente_a_historial_del_medico(self):
        self.authenticate(self.paciente_uno)

        detail = self.client.get(f"/api/historial/{self.historial_medico_uno.id}/")
        doctor_list = self.client.get("/api/historial/medico/")
        update = self.client.put(
            f"/api/historial/{self.historial_medico_uno.id}/",
            {"diagnostico_general": "Intento no autorizado"},
            format="json",
        )

        self.assertEqual(detail.status_code, 404)
        self.assertEqual(doctor_list.status_code, 403)
        self.assertEqual(update.status_code, 403)
        self.historial_medico_uno.refresh_from_db()
        self.assertNotEqual(
            self.historial_medico_uno.diagnostico_general,
            "Intento no autorizado",
        )

    def test_colision_id_no_da_acceso_de_medico_a_historial_del_paciente(self):
        self.authenticate(self.medico_uno)

        detail = self.client.get(f"/api/historial/{self.historial_paciente_uno.id}/")
        patient_list = self.client.get("/api/historial/paciente/")

        self.assertEqual(detail.status_code, 404)
        self.assertEqual(patient_list.status_code, 403)

    def test_paciente_no_puede_crear_historial(self):
        self.authenticate(self.paciente_uno)
        response = self.client.post(
            "/api/historial/",
            {
                "cita_id": self.cita_medico_uno.id,
                "diagnostico_general": "Intento no autorizado",
                "motivo_consulta": "Intento no autorizado",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_medico_puede_crear_y_editar_solo_su_historial(self):
        cita_nueva = Cita.objects.create(
            fecha_programada=timezone.now(),
            fecha_final=timezone.now(),
            id_estado=self.cita_medico_uno.id_estado,
            id_usuario=self.paciente_uno,
            id_medico=self.medico_uno,
        )
        self.authenticate(self.medico_uno)

        create = self.client.post(
            "/api/historial/",
            {
                "cita_id": cita_nueva.id,
                "diagnostico_general": "Diagnóstico autorizado",
                "motivo_consulta": "Consulta autorizada",
            },
            format="json",
        )
        own_update = self.client.put(
            f"/api/historial/{self.historial_medico_uno.id}/",
            {"diagnostico_general": "Corrección autorizada"},
            format="json",
        )
        foreign_update = self.client.put(
            f"/api/historial/{self.historial_paciente_uno.id}/",
            {"diagnostico_general": "Intento cruzado"},
            format="json",
        )

        self.assertEqual(create.status_code, 201)
        self.assertEqual(own_update.status_code, 200)
        self.assertEqual(foreign_update.status_code, 404)

    def test_excepciones_publicas_necesarias_siguen_accesibles(self):
        self.client.force_authenticate(user=None)

        self.assertEqual(self.client.get("/api/csrf/").status_code, 200)
        self.assertEqual(self.client.get("/api/catalogos/departamentos/").status_code, 200)
        self.assertEqual(self.client.get("/api/catalogos/ciudades/").status_code, 200)
        self.assertEqual(self.client.get("/api/medicos/especialidades/").status_code, 200)
