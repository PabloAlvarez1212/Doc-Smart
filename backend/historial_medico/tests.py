from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

from django.core.exceptions import ValidationError
from django.db import IntegrityError, close_old_connections, transaction
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.settings import api_settings
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from catalogos.models import Ciudad, Departamento, Estado, Rol
from citas.models import Cita
from historial_medico.models import HistorialClinico, VersionHistorialClinico
from historial_medico.serializers import CrearHistorialSerializer, EditarHistorialSerializer
from historial_medico.services import crearHistorialService
from medicos.models import Especialidad, Medico
from users.models import Usuario


class HistorialClinicoSecurityTests(APITestCase):
    """Verifica separación de roles y ownership, incluso con IDs colisionados."""

    @classmethod
    def setUpTestData(cls):
        rol_paciente = Rol.objects.create(nombre="paciente")
        rol_medico = Rol.objects.create(nombre="doctor")
        estado = Estado.objects.create(nombre="completada")
        cls.estado_completado = estado
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
            ("patch", f"/api/historial/{self.historial_paciente_uno.id}/", {
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
        update = self.client.patch(
            f"/api/historial/{self.historial_medico_uno.id}/",
            {
                "diagnostico_general": "Intento no autorizado",
                "motivo_cambio": "Intento no autorizado",
            },
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
        own_update = self.client.patch(
            f"/api/historial/{self.historial_medico_uno.id}/",
            {
                "diagnostico_general": "Corrección autorizada",
                "motivo_cambio": "Corrección de precisión clínica",
            },
            format="json",
        )
        foreign_update = self.client.patch(
            f"/api/historial/{self.historial_paciente_uno.id}/",
            {
                "diagnostico_general": "Intento cruzado",
                "motivo_cambio": "Intento cruzado",
            },
            format="json",
        )

        self.assertEqual(create.status_code, 201)
        self.assertEqual(own_update.status_code, 200)
        self.assertEqual(foreign_update.status_code, 404)

    def test_creacion_atomica_genera_version_inicial(self):
        cita = Cita.objects.create(
            fecha_programada=timezone.now(),
            fecha_final=timezone.now(),
            id_estado=self.estado_completado,
            id_usuario=self.paciente_uno,
            id_medico=self.medico_uno,
        )
        self.authenticate(self.medico_uno)

        response = self.client.post(
            "/api/historial/",
            {
                "cita_id": cita.id,
                "diagnostico_general": "Diagnóstico inicial",
                "observaciones": "Sin alertas",
                "motivo_consulta": "Control anual",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        historial = HistorialClinico.objects.get(cita=cita)
        version = historial.versiones.get()
        self.assertEqual(historial.version_actual, 1)
        self.assertEqual(version.version, 1)
        self.assertEqual(version.diagnostico_general, "Diagnóstico inicial")
        self.assertEqual(response.data["data"]["versiones"][0]["version"], 1)

    def test_no_crea_historial_para_cita_no_completada(self):
        estado_pendiente = Estado.objects.create(nombre="pendiente")
        cita = Cita.objects.create(
            fecha_programada=timezone.now(),
            id_estado=estado_pendiente,
            id_usuario=self.paciente_uno,
            id_medico=self.medico_uno,
        )
        self.authenticate(self.medico_uno)

        response = self.client.post(
            "/api/historial/",
            {
                "cita_id": cita.id,
                "diagnostico_general": "No debe persistirse",
                "motivo_consulta": "Consulta pendiente",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(HistorialClinico.objects.filter(cita=cita).exists())

    def test_restriccion_de_base_de_datos_impide_duplicado_por_cita(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                HistorialClinico.objects.create(
                    diagnostico_general="Duplicado",
                    observaciones="",
                    motivo_consulta="Duplicado",
                    cita=self.cita_medico_uno,
                    usuario=self.paciente_dos,
                    medico=self.medico_uno,
                )

    def test_patch_conserva_version_anterior_y_registra_la_nueva(self):
        diagnostico_anterior = self.historial_medico_uno.diagnostico_general
        self.authenticate(self.medico_uno)

        response = self.client.patch(
            f"/api/historial/{self.historial_medico_uno.id}/",
            {
                "diagnostico_general": "Diagnóstico corregido",
                "motivo_cambio": "Resultado confirmatorio recibido",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.historial_medico_uno.refresh_from_db()
        versiones = list(self.historial_medico_uno.versiones.all())
        self.assertEqual(self.historial_medico_uno.version_actual, 2)
        self.assertEqual(len(versiones), 2)
        self.assertEqual(versiones[0].diagnostico_general, diagnostico_anterior)
        self.assertEqual(versiones[1].diagnostico_general, "Diagnóstico corregido")
        self.assertEqual(
            versiones[1].motivo_cambio,
            "Resultado confirmatorio recibido",
        )

        versiones[0].diagnostico_general = "Intento de sobrescritura"
        with self.assertRaises(ValidationError):
            versiones[0].save()
        with self.assertRaises(ValidationError):
            versiones[0].delete()
        versiones[0].refresh_from_db()
        self.assertEqual(versiones[0].diagnostico_general, diagnostico_anterior)

    def test_no_modifica_historial_si_la_cita_deja_de_estar_completada(self):
        estado_pendiente = Estado.objects.create(nombre="pendiente")
        self.cita_medico_uno.id_estado = estado_pendiente
        self.cita_medico_uno.save(update_fields=['id_estado'])
        diagnostico_anterior = self.historial_medico_uno.diagnostico_general
        self.authenticate(self.medico_uno)

        response = self.client.patch(
            f"/api/historial/{self.historial_medico_uno.id}/",
            {
                "diagnostico_general": "Cambio inválido",
                "motivo_cambio": "No debe registrarse",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.historial_medico_uno.refresh_from_db()
        self.assertEqual(
            self.historial_medico_uno.diagnostico_general,
            diagnostico_anterior,
        )
        self.assertFalse(self.historial_medico_uno.versiones.exists())

    def test_edicion_acepta_patch_y_rechaza_put(self):
        self.authenticate(self.medico_uno)
        payload = {
            "observaciones": "Nueva observación",
            "motivo_cambio": "Se amplía la observación",
        }

        put_response = self.client.put(
            f"/api/historial/{self.historial_medico_uno.id}/",
            payload,
            format="json",
        )
        patch_response = self.client.patch(
            f"/api/historial/{self.historial_medico_uno.id}/",
            payload,
            format="json",
        )

        self.assertEqual(put_response.status_code, 405)
        self.assertEqual(patch_response.status_code, 200)

    def test_serializer_de_edicion_exige_motivo_y_un_campo_clinico(self):
        sin_motivo = EditarHistorialSerializer(
            data={"diagnostico_general": "Cambio"}
        )
        sin_cambio = EditarHistorialSerializer(
            data={"motivo_cambio": "Motivo sin contenido clínico"}
        )

        self.assertFalse(sin_motivo.is_valid())
        self.assertIn("motivo_cambio", sin_motivo.errors)
        self.assertFalse(sin_cambio.is_valid())
        self.assertIn("non_field_errors", sin_cambio.errors)

    def test_serializers_rechazan_ids_longitudes_y_controles_invalidos(self):
        cita_invalida = CrearHistorialSerializer(
            data={
                "cita_id": 0,
                "diagnostico_general": "Diagnóstico",
                "motivo_consulta": "Consulta",
            }
        )
        texto_largo = CrearHistorialSerializer(
            data={
                "cita_id": 1,
                "diagnostico_general": "x" * 5001,
                "motivo_consulta": "Consulta",
            }
        )
        control_invalido = CrearHistorialSerializer(
            data={
                "cita_id": 1,
                "diagnostico_general": "Diagnóstico\x00oculto",
                "motivo_consulta": "Consulta",
            }
        )

        self.assertFalse(cita_invalida.is_valid())
        self.assertIn("cita_id", cita_invalida.errors)
        self.assertFalse(texto_largo.is_valid())
        self.assertIn("diagnostico_general", texto_largo.errors)
        self.assertFalse(control_invalido.is_valid())
        self.assertIn("diagnostico_general", control_invalido.errors)

    def test_excepciones_publicas_necesarias_siguen_accesibles(self):
        self.client.force_authenticate(user=None)

        self.assertEqual(self.client.get("/api/csrf/").status_code, 200)
        self.assertEqual(self.client.get("/api/catalogos/departamentos/").status_code, 200)
        self.assertEqual(self.client.get("/api/catalogos/ciudades/").status_code, 200)
        self.assertEqual(self.client.get("/api/medicos/especialidades/").status_code, 200)


class HistorialClinicoConcurrencyTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        rol_paciente = Rol.objects.create(nombre="paciente")
        rol_medico = Rol.objects.create(nombre="doctor")
        estado = Estado.objects.create(nombre="completada")
        departamento = Departamento.objects.create(api_id=80, nombre="Atlántico")
        ciudad = Ciudad.objects.create(
            api_id=8001,
            nombre="Barranquilla",
            departamento=departamento,
        )
        especialidad = Especialidad.objects.create(nombre="Medicina interna")
        paciente = Usuario.objects.create(
            nombre="Paciente",
            apellido="Concurrente",
            fecha_nacimiento="1990-01-01",
            estatura=1.70,
            peso=70,
            correo="paciente.concurrente@example.com",
            contraseña="hash",
            cedula="concurrente-paciente",
            telefono="3000000099",
            id_rol=rol_paciente,
        )
        self.medico = Medico.objects.create(
            nombre="Médico",
            apellido="Concurrente",
            cedula="concurrente-medico",
            fecha_nacimiento="1980-01-01",
            telefono="3100000099",
            correo="medico.concurrente@example.com",
            contraseña="hash",
            id_especialidad=especialidad,
            id_rol=rol_medico,
            direccion="Consultorio concurrente",
            ciudad=ciudad,
        )
        self.cita = Cita.objects.create(
            fecha_programada=timezone.now(),
            fecha_final=timezone.now(),
            id_estado=estado,
            id_usuario=paciente,
            id_medico=self.medico,
        )

    def test_creaciones_concurrentes_solo_confirman_un_historial_por_cita(self):
        barrera = Barrier(2)

        def crear_desde_conexion_independiente(indice):
            close_old_connections()
            try:
                medico = Medico.objects.get(id=self.medico.id)
                barrera.wait(timeout=10)
                _, status_code = crearHistorialService(
                    {
                        'cita_id': self.cita.id,
                        'diagnostico_general': f'Diagnóstico {indice}',
                        'motivo_consulta': 'Prueba concurrente',
                    },
                    medico,
                )
                return status_code
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as executor:
            resultados = list(executor.map(crear_desde_conexion_independiente, (1, 2)))

        self.assertEqual(sorted(resultados), [201, 400])
        self.assertEqual(HistorialClinico.objects.filter(cita=self.cita).count(), 1)
        historial = HistorialClinico.objects.get(cita=self.cita)
        self.assertEqual(
            VersionHistorialClinico.objects.filter(historial=historial).count(),
            1,
        )
