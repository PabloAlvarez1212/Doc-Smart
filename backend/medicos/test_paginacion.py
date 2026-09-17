from types import SimpleNamespace

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from catalogos.models import Ciudad, Departamento, Rol
from medicos.models import Especialidad, Medico, SolicitudValidacionMedico
from medicos.views import ListarSolicitudesValidacionView
from storage_app.models import Archivo


class SolicitudesPaginacionTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        rol = Rol.objects.create(nombre="doctor")
        cls.especialidad = Especialidad.objects.create(nombre="General")
        cls.departamento = Departamento.objects.create(nombre="Departamento")
        cls.ciudad = Ciudad.objects.create(nombre="Ciudad", departamento=cls.departamento)
        medico = Medico.objects.create(
            nombre="Ana", apellido="Prueba", cedula="100", correo="ana@example.test",
            fecha_nacimiento="1990-01-01", id_rol=rol, id_especialidad=cls.especialidad,
            ciudad=cls.ciudad,
        )
        archivo = Archivo.objects.create(
            medico=medico, nombre_original="hoja.pdf", storage_key="prueba/hoja.pdf",
            categoria="hoja_vida",
        )
        cls.solicitudes = [SolicitudValidacionMedico.objects.create(
            medico=medico, hoja_vida=archivo,
            estado="rechazado" if indice % 2 else "pendiente",
            motivo_rechazo="Documento incompleto" if indice % 2 else None,
        ) for indice in range(21)]
        # Fechas iguales también deben mantener un orden estable entre páginas.
        SolicitudValidacionMedico.objects.update(fecha_solicitud=timezone.now())

    def listar(self, **params):
        request = APIRequestFactory().get("/api/medicos/solicitudes-validacion/", params)
        force_authenticate(request, user=SimpleNamespace(
            is_authenticated=True, id_rol=SimpleNamespace(nombre="admin"),
        ))
        return ListarSolicitudesValidacionView.as_view()(request)

    def test_paginas_y_metadatos(self):
        primera = self.listar().data
        segunda = self.listar(page=2).data["data"]
        self.assertTrue(primera["ok"])
        data = primera["data"]
        self.assertEqual((data["count"], data["total_pages"], data["current_page"], data["page_size"]), (21, 3, 1, 10))
        self.assertEqual(len(data["results"]), 10)
        self.assertIsNone(data["previous"])
        self.assertIsNotNone(data["next"])
        self.assertEqual([r["id"] for r in segunda["results"]], [r.id for r in reversed(self.solicitudes)][10:20])

    def test_filtros_combinados_antes_de_paginar(self):
        data = self.listar(
            page=2, page_size=3, busqueda="Ana Prueba", estado="rechazado",
            especialidad=self.especialidad.id, departamento=self.departamento.id, ciudad=self.ciudad.id,
        ).data["data"]
        self.assertEqual((data["count"], data["total_pages"], data["current_page"]), (10, 4, 2))
        self.assertEqual(len(data["results"]), 3)
        self.assertTrue(all(r["estado"] == "rechazado" for r in data["results"]))
        self.assertIn("estado=rechazado", data["next"])
        self.assertEqual(data["results"][0]["motivo_rechazo"], "Documento incompleto")
        self.assertIn("fecha_revision", data["results"][0])
        for filtro in ("busqueda", "estado", "especialidad", "departamento", "ciudad"):
            with self.subTest(filtro=filtro):
                valor = "sin coincidencias" if filtro == "busqueda" else ("aprobado" if filtro == "estado" else 9999)
                self.assertEqual(self.listar(**{filtro: valor}).data["data"]["count"], 0)

    def test_parametros_invalidos_y_limite(self):
        for campo in ("page", "page_size"):
            for valor in ("0", "-1", "1.5", "abc", "", "1.0", "9" * 5000):
                with self.subTest(campo=campo, valor=valor[:20]):
                    response = self.listar(**{campo: valor})
                    self.assertEqual(response.status_code, 400)
                    self.assertFalse(response.data["ok"])
                    self.assertIn(campo, response.data["errores"])
        self.assertEqual(self.listar(page_size=100).data["data"]["page_size"], 50)

    def test_ultima_pagina_desaparece_tras_revision(self):
        for nuevo_estado in ("aprobado", "rechazado"):
            with self.subTest(estado=nuevo_estado):
                SolicitudValidacionMedico.objects.update(estado="pendiente")
                ultima = self.listar(page=3, estado="pendiente").data["data"]["results"][0]
                SolicitudValidacionMedico.objects.filter(pk=ultima["id"]).update(estado=nuevo_estado)
                data = self.listar(page=3, estado="pendiente").data["data"]
                self.assertEqual((data["current_page"], data["total_pages"], data["count"]), (2, 2, 20))
                self.assertEqual(len(data["results"]), 10)
                self.assertIsNone(data["next"])

    def test_sin_resultados_vuelve_a_primera_pagina(self):
        data = self.listar(page=99, busqueda="inexistente").data["data"]
        self.assertEqual((data["results"], data["count"], data["current_page"], data["total_pages"]), ([], 0, 1, 1))
        self.assertIsNone(data["next"])
        self.assertIsNone(data["previous"])
