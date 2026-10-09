from datetime import datetime, time, timedelta
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from catalogos.models import Estado, Rol
from citas.models import Cita
from citas.services import crearCitaService, editarCitaService
from medicos.models import DisponibilidadMedico, Especialidad, Medico, ExcepcionDisponibilidadMedico
from medicos.services_disponibilidad import esHorarioDisponible, generarSlotsDisponibles
from medicos.views import HorariosDisponiblesMedicoView
from users.models import Usuario


class DisponibilidadConfirmacionTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        rol = Rol.objects.create(nombre="paciente")
        cls.paciente = Usuario.objects.create(nombre="Paciente", apellido="Agenda", cedula="agenda-p",
            correo="agenda-p@example.test", fecha_nacimiento="1990-01-01", id_rol=rol, peso=70, estatura=1.7)
        cls.otro = Usuario.objects.create(nombre="Otro", apellido="Paciente", cedula="agenda-o",
            correo="agenda-o@example.test", fecha_nacimiento="1990-01-01", id_rol=rol, peso=70, estatura=1.7)
        cls.medico = Medico.objects.create(nombre="Doctor", apellido="Agenda", cedula="agenda-m",
            correo="agenda-m@example.test", fecha_nacimiento="1980-01-01", id_rol=Rol.objects.create(nombre="medico"),
            id_especialidad=Especialidad.objects.create(nombre="General"), duracion_consulta=30)
        cls.pendiente = Estado.objects.create(nombre="pendiente")
        Estado.objects.create(nombre="reprogramada")
        cls.cancelada = Estado.objects.create(nombre="cancelada")

    def setUp(self):
        self.fecha = timezone.localdate() + timedelta(days=2)
        self.inicio = timezone.make_aware(datetime.combine(self.fecha, time(9)))
        DisponibilidadMedico.objects.create(medico=self.medico, dia_semana=self.fecha.weekday(),
            hora_inicio=time(9), hora_fin=time(12))

    def cita(self, inicio=None, fin=None, estado=None):
        return Cita.objects.create(id_medico=self.medico, id_usuario=self.paciente,
            id_estado=estado or self.pendiente, fecha_programada=inicio or self.inicio,
            fecha_final=fin)

    def test_segundos_no_son_un_slot(self):
        self.assertFalse(esHorarioDisponible(self.medico, self.inicio + timedelta(seconds=1)))

    def test_cita_del_dia_previo_bloquea_intervalo(self):
        self.cita(self.inicio - timedelta(hours=12), self.inicio + timedelta(minutes=15))
        self.assertFalse(esHorarioDisponible(self.medico, self.inicio))

    def test_reprogramacion_fuera_jornada_no_modifica(self):
        cita = self.cita()
        _, codigo = editarCitaService(cita.pk, {"fecha_programada": self.inicio + timedelta(hours=5)}, self.paciente)
        self.assertEqual(codigo, 400)
        cita.refresh_from_db()
        self.assertEqual(cita.fecha_programada, self.inicio)

    def test_reprogramacion_solapada_no_modifica(self):
        cita = self.cita()
        self.cita(self.inicio + timedelta(minutes=40), self.inicio + timedelta(minutes=80))
        _, codigo = editarCitaService(cita.pk, {"fecha_programada": self.inicio + timedelta(minutes=30)}, self.paciente)
        self.assertEqual(codigo, 400)

    def test_reprogramacion_excluye_propia_cita_y_actualiza_fin(self):
        cita = self.cita(fin=self.inicio + timedelta(minutes=60))
        nueva = self.inicio + timedelta(minutes=30)
        self.assertTrue(esHorarioDisponible(self.medico, nueva, excluir_cita_id=cita.pk))
        _, codigo = editarCitaService(cita.pk, {"fecha_programada": nueva}, self.paciente)
        self.assertEqual(codigo, 200)
        cita.refresh_from_db()
        self.assertEqual(cita.fecha_final, nueva + timedelta(minutes=30))

    def test_cancelada_no_bloquea_reprogramacion(self):
        cita = self.cita()
        nueva = self.inicio + timedelta(minutes=30)
        self.cita(nueva, nueva + timedelta(minutes=30), self.cancelada)
        _, codigo = editarCitaService(cita.pk, {"fecha_programada": nueva}, self.paciente)
        self.assertEqual(codigo, 200)

    def test_bloqueo_aplicado_entre_oferta_y_confirmacion(self):
        self.assertTrue(esHorarioDisponible(self.medico, self.inicio))
        ExcepcionDisponibilidadMedico.objects.create(medico=self.medico, fecha=self.fecha, tipo="NO_DISPONIBLE")
        _, codigo = crearCitaService({"id_medico": self.medico.pk, "fecha_programada": self.inicio}, self.paciente.pk)
        self.assertEqual(codigo, 400)
        self.assertFalse(Cita.objects.exists())

    def test_slot_ofrecido_crea_una_sola_cita(self):
        self.assertTrue(generarSlotsDisponibles(self.medico, self.fecha))
        datos = {
            "id_medico": self.medico.pk,
            "fecha_programada": self.inicio,
            "motivo_consulta": "Consulta general de prueba",
        }
        self.assertEqual(crearCitaService(datos, self.paciente.pk)[1], 201)
        self.assertEqual(crearCitaService(datos, self.paciente.pk)[1], 400)
        self.assertEqual(Cita.objects.count(), 1)

    def test_reprogramacion_ajena_no_modifica(self):
        cita = self.cita()
        _, codigo = editarCitaService(cita.pk, {"fecha_programada": self.inicio + timedelta(minutes=30)}, self.otro)
        self.assertEqual(codigo, 404)
        cita.refresh_from_db()
        self.assertEqual(cita.fecha_programada, self.inicio)

    def test_reprogramacion_respeta_bloqueo_nuevo(self):
        cita = self.cita()
        nueva = self.inicio + timedelta(minutes=30)
        self.assertTrue(esHorarioDisponible(self.medico, nueva, excluir_cita_id=cita.pk))
        ExcepcionDisponibilidadMedico.objects.create(medico=self.medico, fecha=self.fecha, tipo="NO_DISPONIBLE")
        self.assertEqual(editarCitaService(cita.pk, {"fecha_programada": nueva}, self.medico)[1], 400)
        cita.refresh_from_db()
        self.assertEqual(cita.fecha_programada, self.inicio)

    def test_medico_propietario_reprograma_slot_disponible(self):
        cita = self.cita()
        nueva = self.inicio + timedelta(minutes=30)
        self.assertEqual(editarCitaService(cita.pk, {"fecha_programada": nueva}, self.medico)[1], 200)
        cita.refresh_from_db()
        self.assertEqual(cita.fecha_programada, nueva)

    def test_endpoint_horarios_excluye_la_cita_propia_para_reprogramar(self):
        cita = self.cita(fin=self.inicio + timedelta(minutes=30))
        request = APIRequestFactory().get(
            f"/medicos/{self.medico.pk}/horarios-disponibles/",
            {
                "fecha": self.fecha.isoformat(),
                "excluir_cita_id": cita.pk,
            },
        )
        force_authenticate(request, user=self.paciente)

        response = HorariosDisponiblesMedicoView.as_view()(
            request,
            medico_id=self.medico.pk,
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn(
            "09:00",
            [slot["hora_inicio"] for slot in response.data["data"]["horarios"]],
        )

    def test_endpoint_horarios_no_permite_excluir_una_cita_ajena(self):
        cita = self.cita(fin=self.inicio + timedelta(minutes=30))
        request = APIRequestFactory().get(
            f"/medicos/{self.medico.pk}/horarios-disponibles/",
            {
                "fecha": self.fecha.isoformat(),
                "excluir_cita_id": cita.pk,
            },
        )
        force_authenticate(request, user=self.otro)

        response = HorariosDisponiblesMedicoView.as_view()(
            request,
            medico_id=self.medico.pk,
        )

        self.assertEqual(response.status_code, 404)
