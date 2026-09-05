from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from types import SimpleNamespace
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.core.cache import cache
from django.db import IntegrityError, close_old_connections, transaction
from django.test import TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.settings import api_settings
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from catalogos.models import Ciudad, Departamento, Estado, Rol
from chatbot.ai.tool_executor import ejecutar_tool
from chatbot.services.historial_service import HistorialService
from citas.models import Cita
from historial_medico.models import HistorialClinico, VersionHistorialClinico
from historial_medico.serializers import CrearHistorialSerializer, EditarHistorialSerializer
from historial_medico.services import crearHistorialService, editarHistorialService
from medicos.models import Especialidad, Medico
from users.models import Usuario


TEST_CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'historial-tests',
    },
}


@override_settings(CACHES=TEST_CACHES)
class HistorialClinicoSecurityTests(APITestCase):
    """Verifica separación de roles y ownership, incluso con IDs colisionados."""

    @classmethod
    def setUpTestData(cls):
        rol_paciente = Rol.objects.create(nombre="paciente")
        rol_medico = Rol.objects.create(nombre="doctor")
        rol_admin = Rol.objects.create(nombre="admin")
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
        cls.usuario_admin = Usuario.objects.create(
            id=103,
            nombre="Usuario",
            apellido="Administrativo",
            fecha_nacimiento="1992-01-01",
            estatura=1.68,
            peso=65,
            correo="admin.history@example.com",
            contraseña="hash",
            cedula="1003",
            telefono="3000000003",
            id_rol=rol_admin,
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

    def setUp(self):
        cache.clear()

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
            {item["id"] for item in patient_response.data["data"]["results"]},
            {self.historial_paciente_uno.id},
        )

        self.authenticate_with_cookie(self.medico_uno, "medico")
        doctor_response = self.client.get("/api/historial/medico/")

        self.assertEqual(doctor_response.status_code, 200)
        self.assertEqual(
            {item["id"] for item in doctor_response.data["data"]["results"]},
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
        ids = {item["id"] for item in response.data["data"]["results"]}
        self.assertEqual(ids, {self.historial_paciente_uno.id})

    def test_medico_solo_lista_los_historiales_que_creo(self):
        self.authenticate(self.medico_uno)
        response = self.client.get("/api/historial/medico/")

        self.assertEqual(response.status_code, 200)
        ids = {item["id"] for item in response.data["data"]["results"]}
        self.assertEqual(ids, {self.historial_medico_uno.id})

    def test_matriz_de_acceso_a_detalle_respeta_rol_y_ownership(self):
        escenarios = [
            (self.paciente_uno, self.historial_paciente_uno, 200),
            (self.paciente_dos, self.historial_paciente_uno, 404),
            (self.medico_uno, self.historial_medico_uno, 200),
            (self.medico_dos, self.historial_medico_uno, 404),
            (self.usuario_admin, self.historial_paciente_uno, 403),
        ]

        for actor, historial, estado_esperado in escenarios:
            with self.subTest(actor=type(actor).__name__, actor_id=actor.id):
                self.authenticate(actor)
                response = self.client.get(f"/api/historial/{historial.id}/")
                self.assertEqual(response.status_code, estado_esperado)

    def test_usuario_autenticado_sin_rol_clinico_no_accede_a_endpoints(self):
        self.authenticate(self.usuario_admin)
        endpoints = [
            ("get", "/api/historial/paciente/", None),
            ("get", "/api/historial/medico/", None),
            ("get", f"/api/historial/{self.historial_paciente_uno.id}/", None),
            (
                "post",
                "/api/historial/",
                {
                    "cita_id": self.cita_paciente_uno.id,
                    "diagnostico_general": "Dato ficticio",
                    "motivo_consulta": "Control",
                },
            ),
            (
                "patch",
                f"/api/historial/{self.historial_paciente_uno.id}/",
                {
                    "diagnostico_general": "Dato ficticio modificado",
                    "motivo_cambio": "Prueba de permisos",
                },
            ),
        ]

        for method, url, payload in endpoints:
            with self.subTest(method=method, url=url):
                response = getattr(self.client, method)(url, payload, format="json")
                self.assertEqual(response.status_code, 403)

    def test_paciente_no_puede_modificar_ni_siquiera_su_historial(self):
        diagnostico_original = self.historial_paciente_uno.diagnostico_general
        self.authenticate(self.paciente_uno)

        response = self.client.patch(
            f"/api/historial/{self.historial_paciente_uno.id}/",
            {
                "diagnostico_general": "Intento de cambio del paciente",
                "motivo_cambio": "Prueba de permisos",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.historial_paciente_uno.refresh_from_db()
        self.assertEqual(
            self.historial_paciente_uno.diagnostico_general,
            diagnostico_original,
        )
        self.assertFalse(self.historial_paciente_uno.versiones.exists())

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

    def test_medico_no_puede_crear_historial_desde_cita_ajena(self):
        self.authenticate(self.medico_uno)

        response = self.client.post(
            "/api/historial/",
            {
                "cita_id": self.cita_paciente_uno.id,
                "diagnostico_general": "Intento sobre cita ajena",
                "motivo_consulta": "Prueba de ownership",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            HistorialClinico.objects.filter(cita=self.cita_paciente_uno).count(),
            1,
        )

    def test_creacion_rechaza_cita_inexistente_sin_revelar_datos(self):
        secreto = "dato-clinico-que-no-debe-aparecer"
        self.authenticate(self.medico_uno)

        response = self.client.post(
            "/api/historial/",
            {
                "cita_id": 999999,
                "diagnostico_general": secreto,
                "motivo_consulta": "Prueba",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 404)
        self.assertNotIn(secreto, str(response.data))
        self.assertFalse(
            HistorialClinico.objects.filter(diagnostico_general=secreto).exists()
        )

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

    def test_creacion_duplicada_por_api_no_genera_otro_historial_ni_version(self):
        cita = Cita.objects.create(
            fecha_programada=timezone.now(),
            fecha_final=timezone.now(),
            id_estado=self.estado_completado,
            id_usuario=self.paciente_uno,
            id_medico=self.medico_uno,
        )
        self.authenticate(self.medico_uno)
        payload = {
            "cita_id": cita.id,
            "diagnostico_general": "Diagnostico ficticio",
            "motivo_consulta": "Control ficticio",
        }

        primera = self.client.post("/api/historial/", payload, format="json")
        duplicada = self.client.post("/api/historial/", payload, format="json")

        self.assertEqual(primera.status_code, 201)
        self.assertEqual(duplicada.status_code, 400)
        self.assertEqual(HistorialClinico.objects.filter(cita=cita).count(), 1)
        historial = HistorialClinico.objects.get(cita=cita)
        self.assertEqual(historial.versiones.count(), 1)

    def test_creacion_revierte_historial_si_falla_la_version_inicial(self):
        cita = Cita.objects.create(
            fecha_programada=timezone.now(),
            fecha_final=timezone.now(),
            id_estado=self.estado_completado,
            id_usuario=self.paciente_uno,
            id_medico=self.medico_uno,
        )
        secreto = "fallo-interno-con-dato-clinico"
        self.authenticate(self.medico_uno)

        with patch(
            "historial_medico.services._crear_version",
            side_effect=RuntimeError(secreto),
        ):
            response = self.client.post(
                "/api/historial/",
                {
                    "cita_id": cita.id,
                    "diagnostico_general": "Diagnostico transaccional",
                    "motivo_consulta": "Control",
                },
                format="json",
            )

        self.assertEqual(response.status_code, 500)
        self.assertFalse(HistorialClinico.objects.filter(cita=cita).exists())
        self.assertNotIn(secreto, str(response.data))

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

    def test_ningun_estado_no_completado_permite_crear_historial(self):
        self.authenticate(self.medico_uno)

        for nombre_estado in ("programada", "cancelada", "en curso"):
            with self.subTest(estado=nombre_estado):
                estado = Estado.objects.create(nombre=nombre_estado)
                cita = Cita.objects.create(
                    fecha_programada=timezone.now(),
                    id_estado=estado,
                    id_usuario=self.paciente_uno,
                    id_medico=self.medico_uno,
                )
                response = self.client.post(
                    "/api/historial/",
                    {
                        "cita_id": cita.id,
                        "diagnostico_general": "No debe persistirse",
                        "motivo_consulta": "Cita no completada",
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

    def test_restriccion_de_base_de_datos_impide_version_duplicada(self):
        VersionHistorialClinico.objects.create(
            historial=self.historial_medico_uno,
            version=1,
            diagnostico_general="Version inicial",
            observaciones="",
            motivo_consulta="Control",
            motivo_cambio="Creacion inicial",
            medico_editor=self.medico_uno,
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                VersionHistorialClinico.objects.create(
                    historial=self.historial_medico_uno,
                    version=1,
                    diagnostico_general="Version duplicada",
                    observaciones="",
                    motivo_consulta="Control",
                    motivo_cambio="Duplicado",
                    medico_editor=self.medico_uno,
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

    def test_patch_parcial_conserva_campos_y_encadena_versiones_completas(self):
        diagnostico_inicial = self.historial_medico_uno.diagnostico_general
        motivo_inicial = self.historial_medico_uno.motivo_consulta
        self.authenticate(self.medico_uno)

        primera = self.client.patch(
            f"/api/historial/{self.historial_medico_uno.id}/",
            {
                "observaciones": "Primera observacion ficticia",
                "motivo_cambio": "Se agrega observacion",
            },
            format="json",
        )
        segunda = self.client.patch(
            f"/api/historial/{self.historial_medico_uno.id}/",
            {
                "diagnostico_general": "Diagnostico ficticio actualizado",
                "motivo_cambio": "Se precisa el diagnostico",
            },
            format="json",
        )

        self.assertEqual(primera.status_code, 200)
        self.assertEqual(segunda.status_code, 200)
        self.historial_medico_uno.refresh_from_db()
        versiones = list(self.historial_medico_uno.versiones.all())
        self.assertEqual([version.version for version in versiones], [1, 2, 3])
        self.assertEqual(versiones[0].diagnostico_general, diagnostico_inicial)
        self.assertEqual(versiones[1].diagnostico_general, diagnostico_inicial)
        self.assertEqual(versiones[1].observaciones, "Primera observacion ficticia")
        self.assertEqual(versiones[2].observaciones, "Primera observacion ficticia")
        self.assertEqual(versiones[2].motivo_consulta, motivo_inicial)
        self.assertEqual(
            self.historial_medico_uno.diagnostico_general,
            "Diagnostico ficticio actualizado",
        )

    def test_patch_noop_no_crea_version(self):
        self.authenticate(self.medico_uno)

        response = self.client.patch(
            f"/api/historial/{self.historial_medico_uno.id}/",
            {
                "diagnostico_general": self.historial_medico_uno.diagnostico_general,
                "motivo_cambio": "No existe un cambio real",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(self.historial_medico_uno.versiones.exists())
        self.assertEqual(self.historial_medico_uno.version_actual, 1)

    def test_patch_no_permite_reasignar_ownership_cita_ni_version_actual(self):
        self.authenticate(self.medico_uno)
        usuario_id = self.historial_medico_uno.usuario_id
        medico_id = self.historial_medico_uno.medico_id
        cita_id = self.historial_medico_uno.cita_id

        response = self.client.patch(
            f"/api/historial/{self.historial_medico_uno.id}/",
            {
                "observaciones": "Observacion autorizada",
                "motivo_cambio": "Actualizacion de observacion",
                "usuario": self.paciente_uno.id,
                "medico": self.medico_dos.id,
                "cita_id": self.cita_paciente_uno.id,
                "version_actual": 99,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.historial_medico_uno.refresh_from_db()
        self.assertEqual(self.historial_medico_uno.usuario_id, usuario_id)
        self.assertEqual(self.historial_medico_uno.medico_id, medico_id)
        self.assertEqual(self.historial_medico_uno.cita_id, cita_id)
        self.assertEqual(self.historial_medico_uno.version_actual, 2)

    def test_edicion_revierte_cambios_si_falla_la_nueva_version(self):
        diagnostico_original = self.historial_medico_uno.diagnostico_general
        VersionHistorialClinico.objects.create(
            historial=self.historial_medico_uno,
            version=1,
            diagnostico_general=diagnostico_original,
            observaciones=self.historial_medico_uno.observaciones,
            motivo_consulta=self.historial_medico_uno.motivo_consulta,
            motivo_cambio="Version inicial ficticia",
            medico_editor=self.medico_uno,
        )
        secreto = "error-interno-clinico-no-expuesto"
        self.authenticate(self.medico_uno)

        with patch(
            "historial_medico.services._crear_version",
            side_effect=RuntimeError(secreto),
        ):
            response = self.client.patch(
                f"/api/historial/{self.historial_medico_uno.id}/",
                {
                    "diagnostico_general": "Cambio que debe revertirse",
                    "motivo_cambio": "Prueba de rollback",
                },
                format="json",
            )

        self.assertEqual(response.status_code, 500)
        self.historial_medico_uno.refresh_from_db()
        self.assertEqual(
            self.historial_medico_uno.diagnostico_general,
            diagnostico_original,
        )
        self.assertEqual(self.historial_medico_uno.version_actual, 1)
        self.assertEqual(self.historial_medico_uno.versiones.count(), 1)
        self.assertNotIn(secreto, str(response.data))

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

    def test_serializers_normalizan_unicode_y_validan_patch(self):
        crear = CrearHistorialSerializer(
            data={
                "cita_id": 1,
                "diagnostico_general": "Cafe\u0301 clinico",
                "observaciones": "  observacion segura  ",
                "motivo_consulta": "Control",
            }
        )
        editar = EditarHistorialSerializer(
            data={
                "observaciones": "",
                "motivo_cambio": "Correccion valida",
            }
        )

        self.assertTrue(crear.is_valid(), crear.errors)
        self.assertEqual(crear.validated_data["diagnostico_general"], "Café clinico")
        self.assertEqual(crear.validated_data["observaciones"], "observacion segura")
        self.assertTrue(editar.is_valid(), editar.errors)
        self.assertEqual(editar.validated_data["observaciones"], "")

    def test_errores_de_serializer_no_reflejan_contenido_clinico(self):
        secreto = "diagnostico-privado-irrepetible"
        self.authenticate(self.medico_uno)

        response = self.client.post(
            "/api/historial/",
            {
                "cita_id": self.cita_medico_uno.id,
                "diagnostico_general": f"{secreto}\x00",
                "motivo_consulta": "Control",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertNotIn(secreto, str(response.data))
        self.assertIn("no-store", response.headers["Cache-Control"])

    def test_listado_esta_paginado_y_admite_ordenamiento_controlado(self):
        fecha_base = timezone.now()
        historiales = []
        for indice in range(2):
            cita = Cita.objects.create(
                fecha_programada=fecha_base - timedelta(days=indice + 1),
                fecha_final=fecha_base,
                id_estado=self.estado_completado,
                id_usuario=self.paciente_uno,
                id_medico=self.medico_dos,
            )
            historiales.append(
                HistorialClinico.objects.create(
                    diagnostico_general=f"Diagnóstico {indice}",
                    observaciones="",
                    motivo_consulta="Control",
                    cita=cita,
                    usuario=self.paciente_uno,
                    medico=self.medico_dos,
                )
            )

        HistorialClinico.objects.filter(
            id=historiales[0].id
        ).update(fecha_creacion=fecha_base - timedelta(days=2))
        HistorialClinico.objects.filter(
            id=historiales[1].id
        ).update(fecha_creacion=fecha_base + timedelta(days=2))
        HistorialClinico.objects.filter(
            id=self.historial_paciente_uno.id
        ).update(fecha_creacion=fecha_base)
        self.authenticate(self.paciente_uno)

        primera = self.client.get(
            "/api/historial/paciente/?ordering=fecha_creacion&page_size=2&page=1"
        )
        segunda = self.client.get(
            "/api/historial/paciente/?ordering=fecha_creacion&page_size=2&page=2"
        )
        orden_invalido = self.client.get(
            "/api/historial/paciente/?ordering=diagnostico_general&page_size=3"
        )

        self.assertEqual(primera.status_code, 200)
        self.assertEqual(primera.data["data"]["count"], 3)
        self.assertEqual(primera.data["data"]["total_pages"], 2)
        self.assertEqual(primera.data["data"]["current_page"], 1)
        self.assertEqual(
            [item["id"] for item in primera.data["data"]["results"]],
            [historiales[0].id, self.historial_paciente_uno.id],
        )
        self.assertEqual(
            [item["id"] for item in segunda.data["data"]["results"]],
            [historiales[1].id],
        )
        self.assertEqual(
            [item["id"] for item in orden_invalido.data["data"]["results"]],
            [
                historiales[1].id,
                self.historial_paciente_uno.id,
                historiales[0].id,
            ],
        )

    def test_paginacion_limita_page_size_y_maneja_pagina_invalida(self):
        for indice in range(50):
            cita = Cita.objects.create(
                fecha_programada=timezone.now() - timedelta(minutes=indice),
                fecha_final=timezone.now(),
                id_estado=self.estado_completado,
                id_usuario=self.paciente_uno,
                id_medico=self.medico_dos,
            )
            HistorialClinico.objects.create(
                diagnostico_general=f"Diagnostico paginado {indice}",
                observaciones="",
                motivo_consulta="Control",
                cita=cita,
                usuario=self.paciente_uno,
                medico=self.medico_dos,
            )
        self.authenticate(self.paciente_uno)

        primera = self.client.get("/api/historial/paciente/?page_size=999&page=1")
        segunda = self.client.get("/api/historial/paciente/?page_size=999&page=2")
        invalida = self.client.get("/api/historial/paciente/?page=desconocida")

        self.assertEqual(primera.status_code, 200)
        self.assertEqual(primera.data["data"]["count"], 51)
        self.assertEqual(primera.data["data"]["page_size"], 50)
        self.assertEqual(len(primera.data["data"]["results"]), 50)
        self.assertEqual(segunda.status_code, 200)
        self.assertEqual(len(segunda.data["data"]["results"]), 1)
        self.assertEqual(invalida.status_code, 404)
        self.assertIn("no-store", invalida.headers["Cache-Control"])

    def test_respuestas_clinicas_impiden_almacenamiento_en_cache(self):
        self.authenticate(self.paciente_uno)
        respuestas = [
            self.client.get("/api/historial/paciente/"),
            self.client.get(
                f"/api/historial/{self.historial_paciente_uno.id}/"
            ),
            self.client.get("/api/historial/999999/"),
        ]
        cita = Cita.objects.create(
            fecha_programada=timezone.now(),
            fecha_final=timezone.now(),
            id_estado=self.estado_completado,
            id_usuario=self.paciente_uno,
            id_medico=self.medico_uno,
        )
        self.authenticate(self.medico_uno)
        respuestas.extend([
            self.client.get("/api/historial/medico/"),
            self.client.post(
                "/api/historial/",
                {
                    "cita_id": cita.id,
                    "diagnostico_general": "Diagnóstico",
                    "motivo_consulta": "Control",
                },
                format="json",
            ),
            self.client.patch(
                f"/api/historial/{self.historial_medico_uno.id}/",
                {
                    "observaciones": "Observación actualizada",
                    "motivo_cambio": "Actualización clínica",
                },
                format="json",
            ),
        ])

        for response in respuestas:
            with self.subTest(status=response.status_code):
                cache_control = response.headers["Cache-Control"]
                self.assertIn("no-store", cache_control)
                self.assertIn("private", cache_control)
                self.assertIn("must-revalidate", cache_control)
                self.assertEqual(response.headers["Pragma"], "no-cache")
                self.assertEqual(response.headers["Expires"], "0")
                self.assertIn("Cookie", response.headers["Vary"])
                self.assertIn("Authorization", response.headers["Vary"])

    def test_excepcion_interna_no_expone_contenido_sensible(self):
        secreto = "diagnóstico-secreto token-super-secreto"
        self.authenticate(self.paciente_uno)

        with patch(
            "historial_medico.views.obtenerHistorialService",
            side_effect=RuntimeError(secreto),
        ):
            with self.assertLogs("historial_medico.views", level="ERROR") as logs:
                response = self.client.get(
                    f"/api/historial/{self.historial_paciente_uno.id}/"
                )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(
            response.data["errores"]["detalle"],
            "Error interno del servidor",
        )
        self.assertNotIn(secreto, str(response.data))
        self.assertNotIn(secreto, "\n".join(logs.output))
        self.assertIn("RuntimeError", "\n".join(logs.output))

    def test_denegaciones_cruzadas_no_exponen_contenido_del_recurso(self):
        secreto_paciente = self.historial_paciente_uno.diagnostico_general
        secreto_medico = self.historial_medico_uno.diagnostico_general

        self.authenticate(self.paciente_dos)
        respuesta_paciente = self.client.get(
            f"/api/historial/{self.historial_paciente_uno.id}/"
        )
        self.authenticate(self.medico_dos)
        respuesta_medico = self.client.get(
            f"/api/historial/{self.historial_medico_uno.id}/"
        )

        self.assertEqual(respuesta_paciente.status_code, 404)
        self.assertEqual(respuesta_medico.status_code, 404)
        self.assertNotIn(secreto_paciente, str(respuesta_paciente.data))
        self.assertNotIn(secreto_medico, str(respuesta_medico.data))

    def test_throttle_limita_lecturas_sin_colisionar_roles(self):
        self.authenticate(self.paciente_uno)

        for _ in range(60):
            response = self.client.get("/api/historial/paciente/")
            self.assertEqual(response.status_code, 200)

        limitada = self.client.get("/api/historial/paciente/")
        self.assertEqual(limitada.status_code, 429)
        self.assertIn("no-store", limitada.headers["Cache-Control"])
        self.assertIn("Retry-After", limitada.headers)

        # paciente_uno y medico_uno tienen la misma PK, pero cuotas separadas.
        self.authenticate(self.medico_uno)
        respuesta_medico = self.client.get("/api/historial/medico/")
        self.assertEqual(respuesta_medico.status_code, 200)

    def test_throttle_limita_escrituras_y_permite_uso_normal(self):
        cita = Cita.objects.create(
            fecha_programada=timezone.now(),
            fecha_final=timezone.now(),
            id_estado=self.estado_completado,
            id_usuario=self.paciente_uno,
            id_medico=self.medico_uno,
        )
        self.authenticate(self.medico_uno)
        payload = {
            "cita_id": cita.id,
            "diagnostico_general": "Diagnóstico autorizado",
            "motivo_consulta": "Control",
        }

        permitida = self.client.post("/api/historial/", payload, format="json")
        self.assertEqual(permitida.status_code, 201)

        for _ in range(9):
            duplicada = self.client.post(
                "/api/historial/",
                payload,
                format="json",
            )
            self.assertEqual(duplicada.status_code, 400)

        limitada = self.client.post("/api/historial/", payload, format="json")
        self.assertEqual(limitada.status_code, 429)
        self.assertIn("Retry-After", limitada.headers)
        self.assertIn("no-store", limitada.headers["Cache-Control"])

    def test_throttle_de_escritura_comparte_cuota_entre_post_y_patch(self):
        cita = Cita.objects.create(
            fecha_programada=timezone.now(),
            fecha_final=timezone.now(),
            id_estado=self.estado_completado,
            id_usuario=self.paciente_uno,
            id_medico=self.medico_uno,
        )
        otra_cita = Cita.objects.create(
            fecha_programada=timezone.now(),
            fecha_final=timezone.now(),
            id_estado=self.estado_completado,
            id_usuario=self.paciente_uno,
            id_medico=self.medico_uno,
        )
        self.authenticate(self.medico_uno)
        creada = self.client.post(
            "/api/historial/",
            {
                "cita_id": cita.id,
                "diagnostico_general": "Diagnostico inicial",
                "motivo_consulta": "Control",
            },
            format="json",
        )
        historial_id = creada.data["data"]["id"]

        for indice in range(9):
            response = self.client.patch(
                f"/api/historial/{historial_id}/",
                {
                    "observaciones": f"Observacion {indice}",
                    "motivo_cambio": f"Cambio ficticio {indice}",
                },
                format="json",
            )
            self.assertEqual(response.status_code, 200)

        limitada = self.client.post(
            "/api/historial/",
            {
                "cita_id": otra_cita.id,
                "diagnostico_general": "No debe crearse",
                "motivo_consulta": "Control",
            },
            format="json",
        )

        self.assertEqual(limitada.status_code, 429)
        self.assertFalse(HistorialClinico.objects.filter(cita=otra_cita).exists())
        self.assertIn("Retry-After", limitada.headers)

    def test_bymax_consulta_los_campos_reales_del_historial_con_ownership(self):
        resultado = ejecutar_tool(
            nombre_tool="consultar_historial",
            chat=SimpleNamespace(id_usuario=self.paciente_uno),
            mensaje="Muéstrame mi historial clínico",
            parametros={"limite": 5},
        )

        self.assertTrue(resultado["success"])
        registros = resultado["data"]["historial"]
        self.assertEqual(len(registros), 1)
        self.assertEqual(
            registros[0]["diagnostico_general"],
            self.historial_paciente_uno.diagnostico_general,
        )
        self.assertEqual(
            registros[0]["motivo_consulta"],
            self.historial_paciente_uno.motivo_consulta,
        )
        self.assertEqual(registros[0]["version"], 1)
        self.assertEqual(registros[0]["medico"], "Médico Dos")
        self.assertNotIn("tratamiento", registros[0])
        self.assertNotIn(
            self.historial_medico_uno.diagnostico_general,
            str(registros),
        )

    def test_bymax_normaliza_limites_invalidos_y_excesivos(self):
        self.assertEqual(HistorialService.normalizar_limite("invalido"), 5)
        self.assertEqual(HistorialService.normalizar_limite(0), 1)
        self.assertEqual(HistorialService.normalizar_limite(999), 10)

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

    def test_ediciones_concurrentes_conservan_ambas_versiones_sin_perdidas(self):
        _, estado_creacion = crearHistorialService(
            {
                "cita_id": self.cita.id,
                "diagnostico_general": "Diagnostico inicial concurrente",
                "observaciones": "Observacion inicial",
                "motivo_consulta": "Control concurrente",
            },
            self.medico,
        )
        self.assertEqual(estado_creacion, 201)
        historial = HistorialClinico.objects.get(cita=self.cita)
        barrera = Barrier(2)

        def editar_desde_conexion_independiente(indice):
            close_old_connections()
            try:
                medico = Medico.objects.get(id=self.medico.id)
                barrera.wait(timeout=10)
                _, status_code = editarHistorialService(
                    historial.id,
                    {
                        "diagnostico_general": f"Diagnostico concurrente {indice}",
                        "motivo_cambio": f"Edicion concurrente {indice}",
                    },
                    medico,
                )
                return status_code
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as executor:
            resultados = list(
                executor.map(editar_desde_conexion_independiente, (1, 2))
            )

        self.assertEqual(resultados, [200, 200])
        historial.refresh_from_db()
        versiones = list(historial.versiones.all())
        self.assertEqual(historial.version_actual, 3)
        self.assertEqual([version.version for version in versiones], [1, 2, 3])
        diagnosticos_concurrentes = {
            "Diagnostico concurrente 1",
            "Diagnostico concurrente 2",
        }
        self.assertEqual(
            {version.diagnostico_general for version in versiones[1:]},
            diagnosticos_concurrentes,
        )
        self.assertEqual(historial.diagnostico_general, versiones[-1].diagnostico_general)
