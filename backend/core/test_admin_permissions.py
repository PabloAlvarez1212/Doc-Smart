from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory, force_authenticate

from catalogos.views import (
    CiudadDetailView,
    CiudadesDetailView,
    EstadoDetailView,
    EstadoListView,
    MedioDetailView,
    MedioListView,
    RolDetailView,
    RolListView,
)
from citas.views import CitaListView, RecordatorioDetailView, RecordatorioListView
from medicos.views import (
    AprobarSolicitudValidacionView,
    EspecialidadDetailView,
    EspecialidadListView,
    HojaVidaSolicitudValidacionView,
    ListarSolicitudesValidacionView,
    MedicoDetailView,
    MedicoListView,
    MetricasValidacionMedicosView,
    RechazarSolicitudValidacionView,
)
from users.views import PerfilAdminView, UsuarioDetailView, UsuarioListView
from utils import IsAdmin


class AdminEndpointPermissionTests(SimpleTestCase):
    """Matriz transversal de permisos para todos los endpoints administrativos."""

    admin_operations = (
        (CitaListView, "get", {}),
        (RecordatorioListView, "get", {}),
        (RecordatorioListView, "post", {}),
        (RecordatorioDetailView, "delete", {"pk": 1}),
        (MedicoListView, "get", {}),
        (ListarSolicitudesValidacionView, "get", {}),
        (MetricasValidacionMedicosView, "get", {}),
        (HojaVidaSolicitudValidacionView, "get", {"solicitud_id": 1}),
        (AprobarSolicitudValidacionView, "patch", {"solicitud_id": 1}),
        (RechazarSolicitudValidacionView, "patch", {"solicitud_id": 1}),
        (MedicoDetailView, "get", {"id_medico": 1}),
        (MedicoDetailView, "put", {"id_medico": 1}),
        (MedicoDetailView, "delete", {"id_medico": 1}),
        (EspecialidadListView, "post", {}),
        (EspecialidadDetailView, "put", {"id_especialidad": 1}),
        (EspecialidadDetailView, "delete", {"id_especialidad": 1}),
        (PerfilAdminView, "get", {}),
        (UsuarioListView, "get", {}),
        (UsuarioDetailView, "get", {"pk": 1}),
        (UsuarioDetailView, "put", {"pk": 1}),
        (UsuarioDetailView, "delete", {"pk": 1}),
        (RolListView, "get", {}),
        (RolListView, "post", {}),
        (RolDetailView, "get", {"id": 1}),
        (RolDetailView, "put", {"id": 1}),
        (RolDetailView, "delete", {"id": 1}),
        (EstadoListView, "get", {}),
        (EstadoListView, "post", {}),
        (EstadoDetailView, "get", {"id": 1}),
        (EstadoDetailView, "put", {"id": 1}),
        (EstadoDetailView, "delete", {"id": 1}),
        (CiudadesDetailView, "post", {}),
        (CiudadDetailView, "put", {"id": 1}),
        (CiudadDetailView, "delete", {"id": 1}),
        (MedioListView, "get", {}),
        (MedioListView, "post", {}),
        (MedioDetailView, "get", {"id": 1}),
        (MedioDetailView, "put", {"id": 1}),
        (MedioDetailView, "delete", {"id": 1}),
    )

    def setUp(self):
        self.factory = APIRequestFactory()
        self.actors = {
            "admin": SimpleNamespace(
                is_authenticated=True,
                id_rol=SimpleNamespace(nombre="admin"),
            ),
            "paciente": SimpleNamespace(
                is_authenticated=True,
                id_rol=SimpleNamespace(nombre="paciente"),
            ),
            "medico": SimpleNamespace(
                is_authenticated=True,
                id_rol=SimpleNamespace(nombre="medico"),
            ),
            "anonimo": None,
        }

    def _execute(self, view_class, method, actor, kwargs):
        request = getattr(self.factory, method)(
            "/api/prueba-admin/",
            {},
            format="json",
        )
        if actor is not None:
            force_authenticate(request, user=actor)

        with patch.object(
            view_class,
            method,
            return_value=Response({"ok": True}, status=200),
        ):
            return view_class.as_view()(request, **kwargs)

    def test_matriz_de_acceso_en_todos_los_endpoints_administrativos(self):
        expected_status = {
            "admin": 200,
            "paciente": 403,
            "medico": 403,
            "anonimo": 401,
        }

        self.assertEqual(len(self.admin_operations), 39)

        for view_class, method, kwargs in self.admin_operations:
            for actor_name, actor in self.actors.items():
                with self.subTest(
                    view=view_class.__name__,
                    method=method,
                    actor=actor_name,
                ):
                    response = self._execute(view_class, method, actor, kwargs)
                    self.assertEqual(response.status_code, expected_status[actor_name])

    def test_vistas_admin_completas_declaran_ambas_barreras(self):
        admin_only_views = (
            CitaListView,
            RecordatorioListView,
            RecordatorioDetailView,
            MedicoListView,
            ListarSolicitudesValidacionView,
            MetricasValidacionMedicosView,
            HojaVidaSolicitudValidacionView,
            AprobarSolicitudValidacionView,
            RechazarSolicitudValidacionView,
            MedicoDetailView,
            PerfilAdminView,
            UsuarioListView,
            UsuarioDetailView,
            RolListView,
            RolDetailView,
            EstadoListView,
            EstadoDetailView,
            MedioListView,
            MedioDetailView,
        )

        for view_class in admin_only_views:
            with self.subTest(view=view_class.__name__):
                self.assertIn(IsAuthenticated, view_class.permission_classes)
                self.assertIn(IsAdmin, view_class.permission_classes)

    def test_vistas_mixtas_restringen_solo_las_mutaciones(self):
        cases = (
            (EspecialidadListView, "GET"),
            (EspecialidadDetailView, "GET"),
            (CiudadesDetailView, "GET"),
            (CiudadDetailView, "GET"),
        )

        for view_class, public_method in cases:
            view = view_class()
            view.request = SimpleNamespace(method=public_method)
            with self.subTest(view=view_class.__name__, method=public_method):
                self.assertEqual(
                    [type(permission) for permission in view.get_permissions()],
                    [AllowAny],
                )

            view.request = SimpleNamespace(method="POST")
            with self.subTest(view=view_class.__name__, method="POST"):
                self.assertEqual(
                    [type(permission) for permission in view.get_permissions()],
                    [IsAuthenticated, IsAdmin],
                )

