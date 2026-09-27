from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from catalogos.models import Rol
from medicos.models import Especialidad, Medico, SolicitudValidacionMedico
from medicos.services import obtenerEstadisticasMedicosService
from storage_app.models import Archivo


class TiempoPromedioValidacionTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        rol = Rol.objects.create(nombre="medico")
        especialidad = Especialidad.objects.create(nombre="Medicina general")
        cls.medico = Medico.objects.create(
            nombre="Médico",
            apellido="Prueba",
            cedula="validacion-001",
            fecha_nacimiento="1990-01-01",
            telefono="3000000000",
            correo="promedio.validacion@example.test",
            contraseña="hash-ficticio",
            id_especialidad=especialidad,
            id_rol=rol,
            direccion="Dirección ficticia",
        )
        cls.archivo = Archivo.objects.create(
            medico=cls.medico,
            nombre_original="hoja-vida.pdf",
            storage_key="pruebas/estadisticas/hoja-vida.pdf",
            content_type="application/pdf",
            tamano=128,
            tipo="documento",
            categoria="hoja_vida",
        )

    def crear_solicitud(self, duracion=None):
        solicitud = SolicitudValidacionMedico.objects.create(
            medico=self.medico,
            hoja_vida=self.archivo,
        )

        if duracion is not None:
            fecha_solicitud = timezone.now() - duracion
            SolicitudValidacionMedico.objects.filter(pk=solicitud.pk).update(
                fecha_solicitud=fecha_solicitud,
                fecha_revision=fecha_solicitud + duracion,
                estado=SolicitudValidacionMedico.EstadoSolicitud.APROBADO,
            )

        return solicitud

    def test_sin_solicitudes_revisadas_retorna_valor_nulo(self):
        self.crear_solicitud()

        data, status_code = obtenerEstadisticasMedicosService()

        self.assertEqual(status_code, 200)
        self.assertEqual(
            data["tiempo_promedio_validacion"],
            {"segundos": None, "solicitudes_revisadas": 0},
        )

    def test_una_solicitud_revisada_retorna_su_duracion(self):
        self.crear_solicitud(timedelta(minutes=45))

        data, _ = obtenerEstadisticasMedicosService()

        self.assertEqual(
            data["tiempo_promedio_validacion"],
            {"segundos": 2700, "solicitudes_revisadas": 1},
        )

    def test_promedia_revisadas_y_excluye_solicitudes_pendientes(self):
        self.crear_solicitud(timedelta(hours=2))
        self.crear_solicitud(timedelta(hours=4))
        self.crear_solicitud()

        data, _ = obtenerEstadisticasMedicosService()

        self.assertEqual(
            data["tiempo_promedio_validacion"],
            {"segundos": 10800, "solicitudes_revisadas": 2},
        )

    def test_duracion_de_varios_dias_se_mantiene_como_valor_numerico(self):
        self.crear_solicitud(timedelta(days=2, hours=12))

        data, _ = obtenerEstadisticasMedicosService()

        self.assertEqual(
            data["tiempo_promedio_validacion"],
            {"segundos": 216000, "solicitudes_revisadas": 1},
        )

    def test_estado_validacion_usa_solamente_la_ultima_solicitud(self):
        fecha_base = timezone.now() - timedelta(days=3)
        estados = (
            SolicitudValidacionMedico.EstadoSolicitud.RECHAZADO,
            SolicitudValidacionMedico.EstadoSolicitud.PENDIENTE,
            SolicitudValidacionMedico.EstadoSolicitud.APROBADO,
        )

        for indice, estado in enumerate(estados):
            solicitud = SolicitudValidacionMedico.objects.create(
                medico=self.medico,
                hoja_vida=self.archivo,
                estado=estado,
            )
            SolicitudValidacionMedico.objects.filter(pk=solicitud.pk).update(
                fecha_solicitud=fecha_base + timedelta(days=indice),
            )

        data, _ = obtenerEstadisticasMedicosService()
        estados_actuales = {
            item["estado"]: item["total_medicos"]
            for item in data["medicos_por_estado_validacion"]
        }

        self.assertEqual(estados_actuales, {"aprobado": 1})

    def test_medico_sin_solicitudes_conserva_estado_sin_solicitud(self):
        data, _ = obtenerEstadisticasMedicosService()
        estados_actuales = {
            item["estado"]: item["total_medicos"]
            for item in data["medicos_por_estado_validacion"]
        }

        self.assertEqual(estados_actuales, {"sin_solicitud": 1})
