from datetime import timedelta

from rest_framework.test import (
    APIRequestFactory,
    force_authenticate,
)
from unittest.mock import patch
from catalogos.models import Estado
from chat_citas.tests import ChatFixture

from citas.models import Cita
from citas.services import (
    listarCitasMedicoService,
    listarCitasPacienteService,
    resumenCitasMedicoService,
)
from citas.views import CitaMedicoView


class AgendaHistorialTests(ChatFixture):

    def setUp(self):

        self.ids = {
            "confirmada": self.cita.pk
        }

        nombres = [
            "pendiente",
            "reprogramada",
            "completada",
            "cancelada",
            "vencida",
            "inasistencia_paciente",
        ]

        for indice, nombre in enumerate(nombres, 1):

            estado, _ = Estado.objects.get_or_create(
                nombre=nombre
            )

            cita = Cita.objects.create(
                id_usuario=self.patients[0],
                id_medico=self.doctors[1],
                id_estado=estado,
                fecha_programada=(
                    self.now
                    + timedelta(days=indice + 4)
                ),
            )

            self.ids[nombre] = cita.pk

        # Cita de otro médico.
        self.cita_ajena = Cita.objects.create(
            id_usuario=self.patients[0],
            id_medico=self.doctors[0],
            id_estado=self.states["confirmada"],
            fecha_programada=(
                self.now + timedelta(days=20)
            ),
        )

    def consultar(self, **params):

        return listarCitasMedicoService(
            medico_id=self.doctors[1].pk,
            page=1,
            page_size=10,
            **params
        )

    # ==========================================
    # AGENDA
    # ==========================================

    def test_agenda_solo_estados_activos(self):

        resultado, codigo = self.consultar(
            seccion="agenda"
        )

        self.assertEqual(codigo, 200)

        estados = {
            cita["estado"].lower()
            for cita in resultado["data"]
        }

        self.assertEqual(
            estados,
            {
                "pendiente",
                "confirmada",
                "reprogramada",
            }
        )

        self.assertEqual(
            resultado["paginacion"]["count"],
            3
        )

    # ==========================================
    # HISTORIAL
    # ==========================================

    def test_historial_solo_estados_finales(self):

        resultado, codigo = self.consultar(
            seccion="historial"
        )

        self.assertEqual(codigo, 200)

        estados = {
            cita["estado"].lower()
            for cita in resultado["data"]
        }

        self.assertEqual(
            estados,
            {
                "completada",
                "cancelada",
                "vencida",
                "inasistencia_paciente",
            }
        )

        self.assertEqual(
            resultado["paginacion"]["count"],
            4
        )

    # ==========================================
    # FILTROS EXCLUYENTES
    # ==========================================

    def test_estado_no_cruza_secciones(self):

        historial, codigo = self.consultar(
            seccion="historial",
            estado="cancelada"
        )

        self.assertEqual(codigo, 200)
        self.assertEqual(
            historial["paginacion"]["count"],
            1
        )

        agenda, codigo = self.consultar(
            seccion="agenda",
            estado="cancelada"
        )

        self.assertEqual(codigo, 200)
        self.assertEqual(
            agenda["paginacion"]["count"],
            0
        )

    # ==========================================
    # PAGINACIÓN
    # ==========================================

    def test_paginacion_ocurre_despues_del_filtro(self):

        pagina_1, codigo_1 = listarCitasMedicoService(
            medico_id=self.doctors[1].pk,
            seccion="historial",
            page=1,
            page_size=2,
        )

        pagina_2, codigo_2 = listarCitasMedicoService(
            medico_id=self.doctors[1].pk,
            seccion="historial",
            page=2,
            page_size=2,
        )

        self.assertEqual(codigo_1, 200)
        self.assertEqual(codigo_2, 200)

        self.assertEqual(
            pagina_1["paginacion"]["count"],
            4
        )

        self.assertEqual(
            pagina_1["paginacion"]["total_pages"],
            2
        )

        self.assertEqual(len(pagina_1["data"]), 2)
        self.assertEqual(len(pagina_2["data"]), 2)

        ids_1 = {
            cita["id"]
            for cita in pagina_1["data"]
        }

        ids_2 = {
            cita["id"]
            for cita in pagina_2["data"]
        }

        # Ninguna cita debe repetirse.
        self.assertFalse(ids_1.intersection(ids_2))

        # Ambas páginas deben contener
        # exactamente las citas del historial.
        ids_historial = {
            self.ids[estado]
            for estado in (
                "completada",
                "cancelada",
                "vencida",
                "inasistencia_paciente",
            )
        }

        self.assertEqual(
            ids_1.union(ids_2),
            ids_historial
        )

    # ==========================================
    # SECCIÓN INVÁLIDA
    # ==========================================

    def test_seccion_invalida(self):

        _, codigo = self.consultar(
            seccion="seccion_inexistente"
        )

        self.assertEqual(codigo, 400)

    # ==========================================
    # COMPATIBILIDAD
    # ==========================================

    def test_sin_seccion_conserva_comportamiento(self):

        resultado, codigo = self.consultar()

        self.assertEqual(codigo, 200)

        # Las siete citas del médico deben aparecer.
        self.assertEqual(
            resultado["paginacion"]["count"],
            7
        )

        # Nunca debe aparecer una cita ajena.
        ids = {
            cita["id"]
            for cita in resultado["data"]
        }

        self.assertNotIn(
            self.cita_ajena.pk,
            ids
        )

    # ==========================================
    # RESUMEN MÉDICO
    # ==========================================

    def test_resumen_cuenta_inasistencias(self):

        resultado, codigo = resumenCitasMedicoService(
            self.doctors[1].pk
        )

        self.assertEqual(codigo, 200)

        self.assertEqual(
            resultado["inasistencias"],
            1
        )

        self.assertEqual(
            resultado["total"],
            7
        )

    # ==========================================
    # ENDPOINT
    # ==========================================

    def test_endpoint_medico_transmite_seccion(self):

        request = APIRequestFactory().get(
            "/api/citas/medico/",
            {
                "seccion": "historial",
                "page": 1,
                "page_size": 6,
            }
        )

        force_authenticate(
            request,
            user=self.doctors[1]
        )

        response = CitaMedicoView.as_view()(
            request
        )

        self.assertEqual(
            response.status_code,
            200
        )

        self.assertEqual(
            response.data["data"]["paginacion"]["count"],
            4
        )

    def test_agenda_prioriza_citas_listas_para_cierre(self):
        medico = self.doctors[1]
        paciente = self.patients[0]
        confirmada = self.states["confirmada"]

        def crear(inicio, fin):
            return Cita.objects.create(
                id_medico=medico,
                id_usuario=paciente,
                id_estado=confirmada,
                fecha_programada=inicio,
                fecha_final=fin,
            )

        cierre_antiguo = crear(
            self.now - timedelta(hours=3),
            self.now - timedelta(hours=2),
        )

        cierre_reciente = crear(
            self.now - timedelta(hours=1),
            self.now - timedelta(minutes=20),
        )

        proxima = crear(
            self.now + timedelta(hours=1),
            self.now + timedelta(hours=2),
        )

        with patch("citas.services.timezone.now", return_value=self.now):
            pagina_1, codigo = listarCitasMedicoService(
                medico_id=medico.pk,
                seccion="agenda",
                page=1,
                page_size=2,
            )

            pagina_2, _ = listarCitasMedicoService(
                medico_id=medico.pk,
                seccion="agenda",
                page=2,
                page_size=2,
            )

        self.assertEqual(codigo, 200)

        self.assertEqual(
            [cita["id"] for cita in pagina_1["data"]],
            [cierre_reciente.pk, cierre_antiguo.pk],
        )

        self.assertEqual(
            pagina_2["data"][0]["id"],
            proxima.pk,
        )


    def test_paciente_prioriza_proximas_citas(self):
        proxima = Cita.objects.create(
            id_medico=self.doctors[1],
            id_usuario=self.patients[0],
            id_estado=self.states["pendiente"],
            fecha_programada=self.now + timedelta(hours=1),
        )

        cancelada_futura = Cita.objects.create(
            id_medico=self.doctors[1],
            id_usuario=self.patients[0],
            id_estado=self.states["cancelada"],
            fecha_programada=self.now + timedelta(days=30),
        )

        with patch("citas.services.timezone.now", return_value=self.now):
            resultado, codigo = listarCitasPacienteService(
                usuario_id=self.patients[0].pk,
                page=1,
                page_size=20,
            )

        ids = [cita["id"] for cita in resultado["data"]]

        self.assertEqual(codigo, 200)
        self.assertEqual(ids[0], proxima.pk)
        self.assertLess(
            ids.index(proxima.pk),
            ids.index(cancelada_futura.pk),
        )