from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from catalogos.models import Rol
from chatbot.views import ChatListView
from citas.views import CitaDetailView
from medicos.models import Especialidad, Medico, SolicitudValidacionMedico
from medicos.views import (
    DashboardInicioMedicoView,
    FotoPerfilMedicoView,
    MiValidacionMedicoView,
    PerfilMedicoView,
    ReintentarSolicitudValidacionView,
)
from storage_app.models import Archivo
from users.models import Usuario
from utils import IsMedico, IsMedicoAprobado, IsPacienteOrMedicoAprobado


class ProteccionMedicosAprobadosTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        rol_medico = Rol.objects.create(nombre="medico")
        rol_paciente = Rol.objects.create(nombre="paciente")
        especialidad = Especialidad.objects.create(nombre="Medicina general")

        cls.paciente = Usuario.objects.create(
            nombre="Paciente",
            apellido="Prueba",
            fecha_nacimiento="1992-01-01",
            estatura=1.70,
            peso=70,
            correo="paciente.permisos@example.test",
            contraseña="hash-ficticio",
            cedula="paciente-permisos",
            telefono="3000000000",
            id_rol=rol_paciente,
        )

        cls.medicos = {}
        for indice, estado in enumerate(("aprobado", "pendiente", "rechazado", None)):
            medico = Medico.objects.create(
                nombre=f"Médico {estado or 'sin solicitud'}",
                apellido="Prueba",
                cedula=f"medico-permisos-{indice}",
                fecha_nacimiento="1985-01-01",
                telefono=f"300000000{indice + 1}",
                correo=f"medico.permisos.{indice}@example.test",
                contraseña="hash-ficticio",
                id_especialidad=especialidad,
                id_rol=rol_medico,
                direccion="Dirección de prueba",
            )
            cls.medicos[estado or "sin_solicitud"] = medico

            if estado:
                archivo = Archivo.objects.create(
                    medico=medico,
                    nombre_original=f"hoja-vida-{indice}.pdf",
                    storage_key=f"pruebas/permisos/hoja-vida-{indice}.pdf",
                    content_type="application/pdf",
                    tamano=128,
                    tipo="documento",
                    categoria="hoja_vida",
                )
                SolicitudValidacionMedico.objects.create(
                    medico=medico,
                    hoja_vida=archivo,
                    estado=estado,
                )

    def setUp(self):
        self.factory = APIRequestFactory()

    def ejecutar(self, view, actor, metodo="get", data=None, **kwargs):
        request = getattr(self.factory, metodo)("/api/prueba/", data or {}, format="json")
        force_authenticate(request, user=actor)
        return view.as_view()(request, **kwargs)

    def test_is_medico_aprobado_consulta_la_ultima_solicitud_en_bd(self):
        medico = self.medicos["aprobado"]
        permiso = IsMedicoAprobado()
        request = self.factory.get("/api/prueba/")
        request.user = medico

        self.assertTrue(permiso.has_permission(request, None))

        archivo = Archivo.objects.create(
            medico=medico,
            nombre_original="nueva-hoja-vida.pdf",
            storage_key="pruebas/permisos/nueva-hoja-vida.pdf",
            content_type="application/pdf",
            tamano=128,
            tipo="documento",
            categoria="hoja_vida",
        )
        SolicitudValidacionMedico.objects.create(
            medico=medico,
            hoja_vida=archivo,
            estado=SolicitudValidacionMedico.EstadoSolicitud.RECHAZADO,
        )

        self.assertFalse(permiso.has_permission(request, None))

    @patch("medicos.views.obtenerDashboardMedicoInicioService", return_value=({}, 200))
    def test_endpoint_profesional_exige_aprobacion_actual(self, dashboard):
        aprobado = self.ejecutar(
            DashboardInicioMedicoView,
            self.medicos["aprobado"],
        )
        self.assertEqual(aprobado.status_code, 200)
        dashboard.assert_called_once_with(self.medicos["aprobado"].id)

        for estado in ("pendiente", "rechazado", "sin_solicitud"):
            with self.subTest(estado=estado):
                response = self.ejecutar(
                    DashboardInicioMedicoView,
                    self.medicos[estado],
                )
                self.assertEqual(response.status_code, 403)

    def test_perfil_y_validacion_siguen_disponibles_sin_aprobacion(self):
        for estado in ("pendiente", "rechazado"):
            medico = self.medicos[estado]
            with self.subTest(estado=estado, endpoint="perfil"):
                with patch(
                    "medicos.views.obtenerPerfilMedicoService",
                    return_value=({}, 200),
                ):
                    response = self.ejecutar(PerfilMedicoView, medico)
                self.assertEqual(response.status_code, 200)

            with self.subTest(estado=estado, endpoint="mi-validacion"):
                with patch(
                    "medicos.views.obtenerMiValidacionService",
                    return_value=({}, 200),
                ):
                    response = self.ejecutar(MiValidacionMedicoView, medico)
                self.assertEqual(response.status_code, 200)

    @patch("citas.views.obtenerCitaService", return_value=({}, 200))
    def test_cita_compartida_permite_paciente_y_medico_aprobado(self, obtener):
        for actor in (self.paciente, self.medicos["aprobado"]):
            with self.subTest(actor=type(actor).__name__):
                response = self.ejecutar(CitaDetailView, actor, pk=10)
                self.assertEqual(response.status_code, 200)

        for estado in ("pendiente", "rechazado", "sin_solicitud"):
            with self.subTest(estado=estado):
                response = self.ejecutar(
                    CitaDetailView,
                    self.medicos[estado],
                    pk=10,
                )
                self.assertEqual(response.status_code, 403)

        self.assertEqual(obtener.call_count, 2)

    @patch("chatbot.views.ChatService.listar_chats", return_value=[])
    def test_bymax_http_permite_paciente_y_solo_medico_aprobado(self, listar):
        for actor in (self.paciente, self.medicos["aprobado"]):
            with self.subTest(actor=type(actor).__name__):
                response = self.ejecutar(ChatListView, actor)
                self.assertEqual(response.status_code, 200)

        for estado in ("pendiente", "rechazado", "sin_solicitud"):
            with self.subTest(estado=estado):
                response = self.ejecutar(ChatListView, self.medicos[estado])
                self.assertEqual(response.status_code, 403)

        self.assertEqual(listar.call_count, 2)

    def test_endpoints_de_cuenta_conservan_is_medico(self):
        for view in (
            PerfilMedicoView,
            MiValidacionMedicoView,
            ReintentarSolicitudValidacionView,
            FotoPerfilMedicoView,
        ):
            permisos = view.permission_classes
            self.assertIn(IsMedico, permisos)
            self.assertNotIn(IsMedicoAprobado, permisos)

    def test_permissions_compuestas_no_confian_en_el_rol_del_jwt(self):
        permiso = IsPacienteOrMedicoAprobado()
        for actor, esperado in (
            (self.paciente, True),
            (self.medicos["aprobado"], True),
            (self.medicos["pendiente"], False),
            (self.medicos["rechazado"], False),
            (self.medicos["sin_solicitud"], False),
        ):
            request = self.factory.get("/api/prueba/")
            request.user = actor
            with self.subTest(actor=str(actor)):
                self.assertEqual(
                    permiso.has_permission(request, None),
                    esperado,
                )
