from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from catalogos.models import Estado, Rol
from citas.models import Cita
from citas.services import obtenerEstadisticasCitas
from medicos.models import Especialidad, Medico
from users.models import Usuario


class EstadisticasCitasPorEstadoTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        rol_medico = Rol.objects.create(nombre="medico")
        rol_paciente = Rol.objects.create(nombre="paciente")
        especialidad = Especialidad.objects.create(nombre="Medicina general")
        cls.medico = Medico.objects.create(
            nombre="Médico",
            apellido="Prueba",
            cedula="citas-medico-001",
            fecha_nacimiento="1985-01-01",
            telefono="3000000001",
            correo="medico.citas@example.test",
            contraseña="hash-ficticio",
            id_especialidad=especialidad,
            id_rol=rol_medico,
            direccion="Dirección ficticia",
        )
        cls.paciente = Usuario.objects.create(
            nombre="Paciente",
            apellido="Prueba",
            fecha_nacimiento="1990-01-01",
            estatura=1.70,
            peso=70,
            correo="paciente.citas@example.test",
            contraseña="hash-ficticio",
            cedula="citas-paciente-001",
            telefono="3000000002",
            id_rol=rol_paciente,
        )
        cls.estados = {
            nombre: Estado.objects.create(nombre=nombre)
            for nombre in ("completada", "pendiente", "cancelada")
        }

    def crear_cita(self, estado, fecha_cancelacion=None, desplazamiento=0):
        return Cita.objects.create(
            fecha_programada=timezone.now() + timedelta(days=desplazamiento),
            id_estado=self.estados[estado],
            id_usuario=self.paciente,
            id_medico=self.medico,
            fecha_cancelacion=fecha_cancelacion,
        )

    def test_distribucion_conserva_totales_y_excluye_cancelacion_invalida(self):
        self.crear_cita("completada", desplazamiento=1)
        self.crear_cita("completada", desplazamiento=2)
        self.crear_cita("pendiente", desplazamiento=3)
        self.crear_cita("cancelada", fecha_cancelacion=timezone.now(), desplazamiento=4)
        self.crear_cita("cancelada", fecha_cancelacion=None, desplazamiento=5)

        data, status_code = obtenerEstadisticasCitas()
        totales = {
            item["estado"].lower(): item["total"]
            for item in data["citas_por_estado"]
        }

        self.assertEqual(status_code, 200)
        self.assertEqual(
            totales,
            {"completada": 2, "pendiente": 1, "cancelada": 1},
        )
        self.assertNotIn("tasa_cancelacion", data)

    def test_sin_citas_retorna_distribucion_vacia(self):
        data, status_code = obtenerEstadisticasCitas()

        self.assertEqual(status_code, 200)
        self.assertEqual(data["citas_por_estado"], [])
        self.assertNotIn("tasa_cancelacion", data)
