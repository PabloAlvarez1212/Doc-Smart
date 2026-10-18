from datetime import datetime, time, timedelta
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from io import StringIO
from unittest.mock import patch
from django.core.management import call_command

from catalogos.models import Estado, Rol
from citas.models import Cita
from citas.services import crearCitaService, editarCitaService, cancelarCitaService
from medicos.models import DisponibilidadMedico, Especialidad, Medico, ExcepcionDisponibilidadMedico
from medicos.services_disponibilidad import esHorarioDisponible, generarSlotsDisponibles
from medicos.views import HorariosDisponiblesMedicoView
from users.models import Usuario
from citas.views import CitaCancelarView


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

    def test_citas_finalizadas_no_bloquean_horarios(self):

        estados_finalizados = [
            "cancelada",
            "completada",
            "vencida",
            "inasistencia_paciente",
        ]

        for nombre_estado in estados_finalizados:

            with self.subTest(estado=nombre_estado):

                estado, _ = Estado.objects.get_or_create(
                    nombre=nombre_estado
                )

                cita = self.cita(
                    fin=self.inicio + timedelta(minutes=30),
                    estado=estado,
                )

                self.assertTrue(
                    esHorarioDisponible(
                        self.medico,
                        self.inicio
                    )
                )

                cita.delete()

    def test_citas_activas_bloquean_horarios(self):

        estados_activos = [
            "pendiente",
            "confirmada",
            "reprogramada",
        ]

        for nombre_estado in estados_activos:

            with self.subTest(estado=nombre_estado):

                estado, _ = Estado.objects.get_or_create(
                    nombre=nombre_estado
                )

                cita = self.cita(
                    fin=self.inicio + timedelta(minutes=30),
                    estado=estado,
                )

                self.assertFalse(
                    esHorarioDisponible(
                        self.medico,
                        self.inicio
                    )
                )

                cita.delete()


    def test_solicitudes_expiradas_liberan_horario(self):

        estados = [
            "pendiente",
            "reprogramada",
        ]

        for nombre_estado in estados:

            with self.subTest(estado=nombre_estado):

                estado, _ = Estado.objects.get_or_create(
                    nombre=nombre_estado
                )

                cita = self.cita(
                    fin=self.inicio + timedelta(minutes=30),
                    estado=estado,
                )

                cita.fecha_limite_confirmacion = (
                    timezone.now() - timedelta(minutes=1)
                )

                cita.save(
                    update_fields=["fecha_limite_confirmacion"]
                )

                self.assertTrue(
                    esHorarioDisponible(
                        self.medico,
                        self.inicio
                    )
                )

                cita.delete()


    def test_confirmada_sigue_bloqueando_horario(self):

        estado, _ = Estado.objects.get_or_create(
            nombre="confirmada"
        )

        cita = self.cita(
            fin=self.inicio + timedelta(minutes=30),
            estado=estado,
        )

        cita.fecha_limite_confirmacion = (
            timezone.now() - timedelta(hours=1)
        )

        cita.save(
            update_fields=["fecha_limite_confirmacion"]
        )

        self.assertFalse(
            esHorarioDisponible(
                self.medico,
                self.inicio
            )
        )

    def test_comando_vence_solicitudes_expiradas(self):

        Estado.objects.get_or_create(nombre="vencida")

        estados = [
            self.pendiente,
            Estado.objects.get(nombre="reprogramada"),
        ]

        citas = []

        for indice, estado in enumerate(estados):

            inicio = self.inicio + timedelta(hours=indice)

            cita = self.cita(
                inicio=inicio,
                fin=inicio + timedelta(minutes=30),
                estado=estado,
            )

            cita.fecha_limite_confirmacion = (
                timezone.now() - timedelta(minutes=5)
            )

            cita.save(
                update_fields=["fecha_limite_confirmacion"]
            )

            citas.append(cita)

        with patch(
            "citas.services.enviarNotificacion"
        ) as mock_notificacion, patch(
            "citas.services.enviarCorreosCitaVencida"
        ) as mock_correo:

            with self.captureOnCommitCallbacks(execute=True):

                call_command(
                    "procesar_citas_vencidas",
                    stdout=StringIO(),
                )

                # Ejecutar nuevamente para comprobar
                # que no se procesen dos veces.
                call_command(
                    "procesar_citas_vencidas",
                    stdout=StringIO(),
                )

            self.assertEqual(mock_notificacion.call_count, 4)
            self.assertEqual(mock_correo.call_count, 2)

        for cita in citas:

            cita.refresh_from_db()

            self.assertEqual(
                cita.id_estado.nombre.lower(),
                "vencida"
            )

            self.assertIsNotNone(
                cita.fecha_vencimiento
            )


    def test_comando_no_vence_citas_vigentes(self):

        Estado.objects.get_or_create(nombre="vencida")

        # Solicitud pendiente dentro del plazo.
        pendiente = self.cita(
            fin=self.inicio + timedelta(minutes=30),
            estado=self.pendiente,
        )

        pendiente.fecha_limite_confirmacion = (
            timezone.now() + timedelta(hours=5)
        )

        pendiente.save(
            update_fields=["fecha_limite_confirmacion"]
        )

        # Cita confirmada cuyo antiguo límite expiró.
        estado_confirmada, _ = Estado.objects.get_or_create(
            nombre="confirmada"
        )

        confirmada = self.cita(
            inicio=self.inicio + timedelta(hours=1),
            fin=self.inicio + timedelta(hours=1, minutes=30),
            estado=estado_confirmada,
        )

        confirmada.fecha_limite_confirmacion = (
            timezone.now() - timedelta(hours=1)
        )

        confirmada.save(
            update_fields=["fecha_limite_confirmacion"]
        )

        with patch(
            "citas.services.enviarNotificacion"
        ) as mock_notificacion:

            call_command(
                "procesar_citas_vencidas",
                stdout=StringIO(),
            )

            mock_notificacion.assert_not_called()

        pendiente.refresh_from_db()
        confirmada.refresh_from_db()

        self.assertEqual(
            pendiente.id_estado.nombre.lower(),
            "pendiente"
        )

        self.assertEqual(
            confirmada.id_estado.nombre.lower(),
            "confirmada"
        )

    def test_no_reprograma_solicitudes_con_plazo_expirado(self):

        estados = ["pendiente", "reprogramada"]

        for nombre_estado in estados:

            with self.subTest(estado=nombre_estado):

                estado = Estado.objects.get(nombre=nombre_estado)

                cita = self.cita(
                    fin=self.inicio + timedelta(minutes=30),
                    estado=estado,
                )

                cita.fecha_limite_confirmacion = (
                    timezone.now() - timedelta(minutes=5)
                )

                cita.save(
                    update_fields=["fecha_limite_confirmacion"]
                )

                nueva_fecha = self.inicio + timedelta(minutes=30)

                _, codigo = editarCitaService(
                    cita.pk,
                    {"fecha_programada": nueva_fecha},
                    self.paciente,
                )

                self.assertEqual(codigo, 400)

                cita.refresh_from_db()

                self.assertEqual(
                    cita.fecha_programada,
                    self.inicio
                )

                self.assertEqual(cita.id_estado_id, estado.pk)

                cita.delete()


    def test_no_reprograma_confirmada_que_ya_comenzo(self):

        estado, _ = Estado.objects.get_or_create(
            nombre="confirmada"
        )

        inicio_pasado = timezone.now() - timedelta(hours=2)

        cita = self.cita(
            inicio=inicio_pasado,
            fin=inicio_pasado + timedelta(minutes=30),
            estado=estado,
        )

        _, codigo = editarCitaService(
            cita.pk,
            {"fecha_programada": self.inicio},
            self.medico,
        )

        self.assertEqual(codigo, 400)

        cita.refresh_from_db()

        self.assertEqual(
            cita.fecha_programada,
            inicio_pasado
        )


    def test_no_reprograma_pendiente_antigua_sin_limite(self):

        cita = self.cita(
            fin=self.inicio + timedelta(minutes=30)
        )

        # Simular una solicitud creada hace dos días.
        Cita.objects.filter(pk=cita.pk).update(
            fecha_creacion=timezone.now() - timedelta(days=2)
        )

        cita.refresh_from_db()

        self.assertIsNone(
            cita.fecha_limite_confirmacion
        )

        _, codigo = editarCitaService(
            cita.pk,
            {
                "fecha_programada":
                    self.inicio + timedelta(minutes=30)
            },
            self.paciente,
        )

        self.assertEqual(codigo, 400)

        cita.refresh_from_db()

        self.assertEqual(
            cita.fecha_programada,
            self.inicio
        )


    def test_cita_antigua_sin_limite_pasa_a_vencida(self):

        Estado.objects.get_or_create(nombre="vencida")

        cita = self.cita(
            fin=self.inicio + timedelta(minutes=30)
        )

        # Simular una cita creada hace dos días.
        fecha_antigua = timezone.now() - timedelta(days=2)

        Cita.objects.filter(pk=cita.pk).update(
            fecha_creacion=fecha_antigua
        )

        cita.refresh_from_db()

        self.assertIsNone(
            cita.fecha_limite_confirmacion
        )

        with patch(
            "citas.services.enviarNotificacion"
        ) as mock_notificacion, patch(
            "citas.services.enviarCorreosCitaVencida"
        ) as mock_correo:

            with self.captureOnCommitCallbacks(execute=True):

                call_command(
                    "procesar_citas_vencidas",
                    stdout=StringIO()
                )

                # Verificar que no se procese dos veces.
                call_command(
                    "procesar_citas_vencidas",
                    stdout=StringIO()
                )

            self.assertEqual(mock_notificacion.call_count, 2)
            self.assertEqual(mock_correo.call_count, 1)

        cita.refresh_from_db()

        self.assertEqual(
            cita.id_estado.nombre.lower(),
            "vencida"
        )

        self.assertIsNotNone(
            cita.fecha_limite_confirmacion
        )

        self.assertIsNotNone(
            cita.fecha_vencimiento
        )

        self.assertEqual(
            cita.fecha_limite_confirmacion,
            min(
                cita.fecha_creacion + timedelta(hours=24),
                cita.fecha_programada
            )
        )


    def test_cita_sin_limite_vigente_no_vence(self):

        cita = self.cita(
            fin=self.inicio + timedelta(minutes=30)
        )

        self.assertIsNone(
            cita.fecha_limite_confirmacion
        )

        with patch(
            "citas.services.enviarNotificacion"
        ) as mock_notificacion:

            call_command(
                "procesar_citas_vencidas",
                stdout=StringIO()
            )

            mock_notificacion.assert_not_called()

        cita.refresh_from_db()

        self.assertEqual(
            cita.id_estado.nombre.lower(),
            "pendiente"
        )

        self.assertIsNone(
            cita.fecha_vencimiento
        )

    def test_pendiente_antigua_sin_limite_libera_horario(self):

        cita = self.cita(
            fin=self.inicio + timedelta(minutes=30)
        )

        Cita.objects.filter(pk=cita.pk).update(
            fecha_creacion=timezone.now() - timedelta(days=2)
        )

        self.assertTrue(
            esHorarioDisponible(
                self.medico,
                self.inicio
            )
        )


    def test_pendiente_reciente_sin_limite_bloquea_horario(self):

        self.cita(
            fin=self.inicio + timedelta(minutes=30)
        )

        self.assertFalse(
            esHorarioDisponible(
                self.medico,
                self.inicio
            )
        )


    def test_reprogramada_antigua_sin_limite_conserva_bloqueo(self):

        estado = Estado.objects.get(
            nombre="reprogramada"
        )

        cita = self.cita(
            fin=self.inicio + timedelta(minutes=30),
            estado=estado,
        )

        Cita.objects.filter(pk=cita.pk).update(
            fecha_creacion=timezone.now() - timedelta(days=2)
        )

        self.assertFalse(
            esHorarioDisponible(
                self.medico,
                self.inicio
            )
        )


    def test_no_cancelar_citas_finalizadas(self):

        estados = [
            "Cancelada",
            "Completada",
            "Vencida",
            "Inasistencia_Paciente",
        ]

        for nombre_estado in estados:

            with self.subTest(estado=nombre_estado):

                estado = Estado.objects.create(
                    nombre=nombre_estado
                )

                cita = self.cita(
                    fin=self.inicio + timedelta(minutes=30),
                    estado=estado,
                )

                _, codigo = cancelarCitaService(
                    cita.pk,
                    self.paciente
                )

                self.assertEqual(codigo, 400)

                cita.refresh_from_db()

                self.assertEqual(
                    cita.id_estado_id,
                    estado.pk
                )

                self.assertIsNone(
                    cita.fecha_cancelacion
                )

                cita.delete()


    def test_cancelar_cita_pendiente(self):

        cita = self.cita(
            fin=self.inicio + timedelta(minutes=30)
        )

        with patch(
            "citas.services.enviarNotificacion"
        ), patch(
            "citas.services.enviarCorreosCitaCancelada"
        ):

            with self.captureOnCommitCallbacks(execute=True):

                _, codigo = cancelarCitaService(
                    cita.pk,
                    self.paciente
                )

        self.assertEqual(codigo, 200)

        cita.refresh_from_db()

        self.assertEqual(
            cita.id_estado.nombre.lower(),
            "cancelada"
        )

        self.assertIsNotNone(
            cita.fecha_cancelacion
        )

        # El horario debe quedar disponible.
        self.assertTrue(
            esHorarioDisponible(
                self.medico,
                self.inicio
            )
        )

    def test_cancelacion_guarda_motivo_y_responsable(self):

        actores = [
            (self.paciente, "paciente"),
            (self.medico, "medico"),
        ]

        for actor, responsable in actores:

            with self.subTest(responsable=responsable):

                cita = self.cita(
                    fin=self.inicio + timedelta(minutes=30)
                )

                resultado, codigo = cancelarCitaService(
                    cita.pk,
                    actor,
                    motivo_cancelacion="  Motivo de prueba  "
                )

                self.assertEqual(codigo, 200)

                cita.refresh_from_db()

                self.assertEqual(
                    cita.id_estado.nombre.lower(),
                    "cancelada"
                )

                self.assertEqual(
                    cita.motivo_cancelacion,
                    "Motivo de prueba"
                )

                self.assertEqual(
                    cita.cancelada_por,
                    responsable
                )

                self.assertIsNotNone(
                    cita.fecha_cancelacion
                )


    def test_endpoint_cancelacion_exige_motivo(self):

        cita = self.cita(
            fin=self.inicio + timedelta(minutes=30)
        )

        request = APIRequestFactory().put(
            f"/citas/{cita.pk}/cancelar/",
            {},
            format="json"
        )

        force_authenticate(
            request,
            user=self.paciente
        )

        response = CitaCancelarView.as_view()(
            request,
            pk=cita.pk
        )

        self.assertEqual(
            response.status_code,
            400
        )

        cita.refresh_from_db()

        self.assertEqual(
            cita.id_estado.nombre.lower(),
            "pendiente"
        )

        self.assertIsNone(
            cita.fecha_cancelacion
        )

        self.assertIsNone(
            cita.motivo_cancelacion
        )

    def test_endpoint_cancelacion_con_motivo(self):

        cita = self.cita(
            fin=self.inicio + timedelta(minutes=30)
        )

        request = APIRequestFactory().put(
            f"/citas/{cita.pk}/cancelar/",
            {
                "motivo_cancelacion":
                    "No podré asistir a la consulta"
            },
            format="json"
        )

        force_authenticate(
            request,
            user=self.paciente
        )

        response = CitaCancelarView.as_view()(
            request,
            pk=cita.pk
        )

        self.assertEqual(
            response.status_code,
            200
        )

        cita.refresh_from_db()

        self.assertEqual(
            cita.motivo_cancelacion,
            "No podré asistir a la consulta"
        )

        self.assertEqual(
            cita.cancelada_por,
            "paciente"
        )

        self.assertEqual(
            cita.id_estado.nombre.lower(),
            "cancelada"
        )