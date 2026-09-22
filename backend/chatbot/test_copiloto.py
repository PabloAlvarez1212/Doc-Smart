from datetime import timedelta, datetime, timezone as dt_timezone
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4
from PIL import Image
from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from django.contrib.auth.models import Permission
from django.contrib.sessions.middleware import SessionMiddleware
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.middleware.csrf import get_token
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate
from chatbot import test_medico as fixtures
from chatbot.ai.conversation_manager import ConversationManager
from chatbot.ai.doctor_conversation import _normalizar, _extraer_fecha
from chatbot.ai.tool_executor import ejecutar_tool
from chatbot.consumers import BymaxConsumer
from chatbot.identity_views import IdentidadBymaxView, DiagnosticoBymaxView
from chatbot.models import Chat, Mensaje, EstadoAnimoDiario, PermisoDiagnostico, SesionDiagnostico, ErrorBymax, TurnoBymax
from chatbot.services.identity_service import preguntar_animo, guardar_animo, tono_chat
from chatbot.services.imagen_medica_service import validar_imagen_medica
from chatbot.services.turn_service import iniciar_turno
from chatbot.throttles import ActorScopedRateThrottle
from chatbot.views import ChatbotResponderView, ContextoMedicoView, MensajeListView
from citas.models import Cita
from medicos.models import Medico
from notificaciones.models import Notificacion
from catalogos.models import Rol


class CopilotoTests(TestCase):
    setUpTestData = classmethod(fixtures.BymaxMedicoTests.setUpTestData.__func__)
    cita = fixtures.BymaxMedicoTests.cita
    tool = fixtures.BymaxMedicoTests.tool
    seleccionar = fixtures.BymaxMedicoTests.seleccionar
    request = fixtures.BymaxMedicoTests.request

    def setUp(self):
        fixtures.BymaxMedicoTests.setUp(self)
        cache.clear()

    def operar(self, accion, cita=None):
        cita = cita or Cita.objects.filter(id_medico=self.medico).first()
        return ConversationManager.procesar(self.chat, f"{accion} la cita número {cita.pk}")

    def test_modal_clinico_cambia_contexto_sin_crear_mensajes(self):
        inicial = Mensaje.objects.filter(id_chat=self.chat).count()
        respuesta = self.request(
            ContextoMedicoView,
            self.medico,
            "post",
            {"accion": "seleccionar_paciente", "paciente_id": self.paciente.pk},
            id_chat=self.chat.pk,
        )
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(
            respuesta.data["data"]["paciente_activo"]["id"],
            self.paciente.pk,
        )
        self.assertEqual(Mensaje.objects.filter(id_chat=self.chat).count(), inicial)

        respuesta = self.request(
            ContextoMedicoView,
            self.medico,
            "post",
            {"accion": "cerrar_contexto"},
            id_chat=self.chat.pk,
        )
        self.assertEqual(respuesta.status_code, 200)
        self.assertIsNone(respuesta.data["data"]["paciente_activo"])
        self.assertEqual(Mensaje.objects.filter(id_chat=self.chat).count(), inicial)

    def test_modal_clinico_rechaza_paciente_ajeno(self):
        respuesta = self.request(
            ContextoMedicoView,
            self.medico,
            "post",
            {"accion": "seleccionar_paciente", "paciente_id": self.ajeno.pk},
            id_chat=self.chat.pk,
        )
        self.assertEqual(respuesta.status_code, 400)
        self.assertIsNone(respuesta.data.get("data"))

    def test_operaciones_exigen_confirmacion_y_notifican_una_vez(self):
        self.seleccionar(self.paciente)
        clinico = dict(self.chat.contexto_temporal["clinico"])
        for accion, estado in (("Confirma", "confirmada"), ("Cancela", "cancelada"), ("Completa", "completada")):
            with self.subTest(accion=accion):
                cita = self.cita(self.medico, self.paciente, "pendiente")
                inicial = Notificacion.objects.count()
                with self.captureOnCommitCallbacks(execute=True) as callbacks:
                    self.assertTrue(self.operar(accion, cita)["requires_confirmation"])
                    cita.refresh_from_db()
                    self.assertEqual(cita.id_estado.nombre, "pendiente")
                    resultado = ConversationManager.procesar(self.chat, "Sí confirmar")
                    self.assertTrue(resultado["success"], resultado)
                    self.assertIn("No hay", ConversationManager.procesar(self.chat, "Confirmo"))
                cita.refresh_from_db()
                self.assertEqual(cita.id_estado.nombre, estado)
                self.assertEqual(Notificacion.objects.count(), inicial + 2)
                self.assertEqual(len(callbacks), 2)
                self.chat.refresh_from_db()
                self.assertEqual(self.chat.contexto_temporal["clinico"], clinico)
                self.assertNotIn("operacion_medica", self.chat.contexto_temporal)

    def test_no_cancelar_descarta_sin_escribir_ni_borrar_clinico(self):
        self.seleccionar(self.paciente)
        clinico = dict(self.chat.contexto_temporal["clinico"])
        self.operar("Cancela")
        self.assertIn("no hice cambios", ConversationManager.procesar(self.chat, "No cancelar"))
        self.assertEqual(Notificacion.objects.count(), 0)
        self.chat.refresh_from_db()
        self.assertEqual(self.chat.contexto_temporal["clinico"], clinico)

    @patch("chatbot.services.cita_service.editarCitaService", return_value=({}, 200))
    def test_reprogramar_entrega_instancia_medico_al_servicio_oficial(self, editar):
        cita = Cita.objects.filter(id_medico=self.medico).first()
        fecha = (timezone.localtime() + timedelta(days=5)).strftime("%Y-%m-%d a las %H:%M")
        self.assertTrue(ConversationManager.procesar(self.chat, f"Reprograma la cita almohadilla {cita.pk} para {fecha}")["requires_confirmation"])
        self.assertTrue(ConversationManager.procesar(self.chat, "Hazlo")["success"])
        self.assertIsInstance(editar.call_args.args[2], Medico)
        self.assertEqual(editar.call_args.args[2].pk, self.medico.pk)
        editar.assert_called_once()

    def test_numeros_por_voz_y_fechas(self):
        self.assertEqual(_normalizar("  Reprograma la cita almohadilla nueve. "), "reprograma la cita #9")
        self.assertEqual(_normalizar("Confirma la cita número nueve"), "confirma la cita 9")
        for fecha in ("2027-09-12 a las 11:00", "12 de septiembre de 2027 a las 11 am", "12 de septiembre de 2027 a las 11:00"):
            parsed = _extraer_fecha(fecha)
            self.assertEqual((parsed.year, parsed.month, parsed.day, parsed.hour), (2027, 9, 12, 11))
        respuesta = ConversationManager.procesar(self.chat, f"Selecciona el paciente número {self.segundo.pk}")
        self.assertEqual(respuesta["data"]["paciente_activo"]["id"], self.segundo.pk)
        self.assertEqual(_normalizar("Sí, confirmar."), "si confirmar")

    def test_busqueda_aproximada_aislada_y_ambigua(self):
        self.paciente.nombre = "Kleider"; self.paciente.apellido = "Lamadrid"; self.paciente.save()
        self.ajeno.nombre = "Kleider"; self.ajeno.apellido = "Lamadrid"; self.ajeno.save()
        respuesta = ConversationManager.procesar(self.chat, "Despliega a Kleidr")
        self.assertEqual(respuesta["data"]["paciente_activo"]["id"], self.paciente.pk)
        self.segundo.nombre = "Kleider"; self.segundo.save()
        respuesta = ConversationManager.procesar(self.chat, "Despliega a Kleider")
        self.assertEqual({p["id"] for p in respuesta["data"]["pacientes"]}, {self.paciente.pk, self.segundo.pk})
        self.assertIn("ID exacto", respuesta["message"])

    def test_citas_ambiguas_no_eligen_y_operaciones_ajenas_rechazadas(self):
        self.assertTrue(ConversationManager.procesar(self.chat, "Cancela la cita con Paciente")["requires_selection"])
        ConversationManager.procesar(self.chat, "No")
        ajena = Cita.objects.filter(id_medico=self.otro).first()
        paciente_chat = Chat.objects.create(id_usuario=self.paciente)
        for accion in ("confirmar", "cancelar", "completar", "reprogramar"):
            nombre = f"{accion}_cita_medico"
            for chat in (self.chat, paciente_chat):
                self.assertFalse(ejecutar_tool(nombre, chat, "", {"id_cita": ajena.pk, "confirmado": True})["success"])
        self.assertEqual(Notificacion.objects.count(), 0)

    def test_cambio_concurrente_de_estado_invalida_confirmacion(self):
        cita = Cita.objects.filter(id_medico=self.medico).first()
        self.operar("Completa", cita)
        Cita.objects.filter(pk=cita.pk).update(id_estado=self.estados["reprogramada"])
        resultado = ConversationManager.procesar(self.chat, "Sí")
        self.assertFalse(resultado["success"])
        self.assertEqual(resultado["data"]["error"]["error_code"], "CITA_CONFLICT")
        self.assertEqual(Notificacion.objects.count(), 0)

    def test_conflicto_surgido_entre_preview_y_confirmacion_impide_escritura(self):
        cita = Cita.objects.filter(id_medico=self.medico).first()
        fecha = (timezone.localtime() + timedelta(days=5)).replace(second=0, microsecond=0)
        ConversationManager.procesar(self.chat, f"Reprograma la cita #{cita.pk} para {fecha.strftime('%Y-%m-%d %H:%M')}")
        self.cita(self.medico, self.segundo, fecha=fecha)
        self.assertFalse(ConversationManager.procesar(self.chat, "Sí")["success"])
        cita.refresh_from_db()
        self.assertNotEqual(cita.fecha_programada, fecha)
        self.assertEqual(Notificacion.objects.count(), 0)

    def test_animo_una_vez_dia_separado_por_tipo_actor_y_validado(self):
        self.assertEqual(self.medico.pk, self.paciente.pk)
        for actor in (self.medico, self.paciente):
            self.assertTrue(preguntar_animo(actor)[1])
            self.assertFalse(preguntar_animo(actor)[1])
            self.assertEqual(guardar_animo(actor, 2).puntuacion, 2)
            self.assertEqual(guardar_animo(actor, 9).puntuacion, 2)
        self.assertEqual(EstadoAnimoDiario.objects.count(), 2)
        for valor in (0, 11, True, "5"):
            with self.assertRaises(ValueError): guardar_animo(self.medico, valor)
        self.assertIn("Nunca deduzcas riesgo", tono_chat(self.chat))

    def test_animo_usa_fecha_local_django_y_nuevo_dia(self):
        with patch("chatbot.services.identity_service.timezone.now", return_value=datetime(2027, 9, 8, 2, tzinfo=dt_timezone.utc)):
            registro, nuevo = preguntar_animo(self.medico)
            self.assertEqual(str(registro.fecha), "2027-09-07")
        with patch("chatbot.services.identity_service.timezone.now", return_value=datetime(2027, 9, 8, 6, tzinfo=dt_timezone.utc)):
            self.assertTrue(preguntar_animo(self.medico)[1])

    def test_identidad_no_confia_actor_frontend_y_animo_exige_confirmacion(self):
        respuesta = self.request(IdentidadBymaxView, self.medico)
        self.assertEqual(respuesta.data["data"]["nombre"], str(self.medico))
        self.assertEqual(respuesta.data["data"]["especialidad"], "General")
        self.assertEqual(self.request(IdentidadBymaxView, self.medico, "post", {"puntuacion": 5}).status_code, 400)
        respuesta = self.request(IdentidadBymaxView, self.medico, "post", {"puntuacion": 5, "confirmado": True, "medico_id": self.otro.pk})
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(EstadoAnimoDiario.objects.get().medico_id, self.medico.pk)

    def diagnostico_request(self, actor, data=None, csrf=True, method="post"):
        factory = APIRequestFactory(enforce_csrf_checks=True)
        request = getattr(factory, method)("/api/chatbot/diagnosticos/", data or {}, format="json")
        force_authenticate(request, user=actor)
        if not hasattr(self, "session"):
            SessionMiddleware(lambda r: None).process_request(request)
            self.session = request.session
        request.session = self.session
        if csrf:
            request.META["HTTP_X_CSRFTOKEN"] = get_token(request)
            request.COOKIES["csrftoken"] = request.META["CSRF_COOKIE"]
        return DiagnosticoBymaxView.as_view()(request)

    def autorizar_admin(self):
        self.paciente.id_rol = Rol.objects.create(nombre="admin"); self.paciente.save()
        permiso = Permission.objects.get(codename="view_diagnostics", content_type__app_label="chatbot")
        PermisoDiagnostico.objects.create(usuario=self.paciente, permiso=permiso, activo=True)

    @override_settings(BYMAX_DIAGNOSTICS_ENABLED=True, BYMAX_DIAGNOSTICS_COMMAND="/comando-prueba")
    def test_diagnostico_exige_rol_permiso_csrf_comando_y_expira(self):
        data = {"accion": "activar", "comando": "/comando-prueba", "confirmado": True}
        for actor in (self.paciente, self.medico):
            response = self.diagnostico_request(actor, data)
            self.assertEqual(response.status_code, 403)
            self.assertNotIn("comando-prueba", str(response.data))
        self.autorizar_admin()
        self.assertEqual(self.diagnostico_request(self.paciente, data, csrf=False).status_code, 403)
        self.assertEqual(self.diagnostico_request(self.paciente, {**data, "comando": "incorrecto"}).status_code, 403)
        self.assertEqual(self.diagnostico_request(self.paciente, data).status_code, 200)
        self.assertEqual(SesionDiagnostico.objects.count(), 1)
        self.assertNotEqual(SesionDiagnostico.objects.get().sesion_hash, self.session.session_key)
        self.assertEqual(self.diagnostico_request(self.paciente, method="get").status_code, 200)
        SesionDiagnostico.objects.update(expira_en=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.diagnostico_request(self.paciente, method="get").status_code, 403)

    @override_settings(BYMAX_DIAGNOSTICS_ENABLED=False)
    def test_diagnostico_desactivado_aun_con_permiso(self):
        self.autorizar_admin()
        self.assertEqual(self.diagnostico_request(self.paciente, {"accion": "activar", "confirmado": True}).status_code, 403)

    @override_settings(BYMAX_DIAGNOSTICS_ENABLED=True, BYMAX_DIAGNOSTICS_COMMAND="")
    def test_diagnostico_sanitizado_aislado_y_cierre_auditado(self):
        self.autorizar_admin()
        self.diagnostico_request(self.paciente, {"accion": "activar", "confirmado": True})
        propio = Chat.objects.create(id_usuario=self.paciente)
        ErrorBymax.objects.create(chat=propio, codigo="BYMAX_UNAVAILABLE", operacion="responder")
        ajeno = ErrorBymax.objects.create(chat=self.chat, codigo="CITA_CONFLICT", operacion="reprogramar")
        data = self.diagnostico_request(self.paciente, method="get").data["data"]
        self.assertEqual(len(data["errores"]), 1)
        self.assertNotIn(str(ajeno.correlacion), str(data))
        for campo in ("chat_id", "appointment_id", "token", "traceback", "technical_context"):
            self.assertNotIn(campo, str(data))
        self.diagnostico_request(self.paciente, {"accion": "cerrar", "confirmado": True})
        self.assertIsNotNone(SesionDiagnostico.objects.get().cerrada_en)
        self.assertEqual(self.diagnostico_request(self.paciente, method="get").status_code, 403)

    def test_limites_por_actor_compartidos_rest_ws_sin_colision_ids(self):
        claves = []
        for actor in (self.medico, self.paciente, self.otro):
            throttle = ActorScopedRateThrottle()
            request = SimpleNamespace(user=actor)
            view = SimpleNamespace(throttle_scope="bymax_chat")
            self.assertTrue(throttle.allow_request(request, view))
            claves.append(throttle.get_cache_key(request, view))
        self.assertEqual(len(set(claves)), 3)

    def test_mismo_turno_rest_no_duplica_mensajes_ni_respuesta(self):
        data = {"mensaje": "Mis próximas citas", "request_id": str(uuid4())}
        a = self.request(ChatbotResponderView, self.medico, "post", data, id_chat=self.chat.pk)
        b = self.request(ChatbotResponderView, self.medico, "post", data, id_chat=self.chat.pk)
        self.assertEqual(a.data, b.data)
        self.assertEqual(Mensaje.objects.filter(id_chat=self.chat).count(), 2)
        self.assertEqual(TurnoBymax.objects.count(), 1)
        historial = self.request(MensajeListView, self.medico, id_chat=self.chat.pk).data["data"]
        self.assertEqual(historial[-1]["resultado"], a.data["data"]["resultado"])
        data["mensaje"] = "Otro mensaje"
        self.assertEqual(self.request(ChatbotResponderView, self.medico, "post", data, id_chat=self.chat.pk).status_code, 400)

    def test_turno_en_curso_no_se_ejecuta_y_no_acepta_chat_ajeno(self):
        clave = str(uuid4())
        iniciar_turno(self.chat, clave, "Mis próximas citas")
        data = {"mensaje": "Mis próximas citas", "request_id": clave}
        self.assertEqual(self.request(ChatbotResponderView, self.medico, "post", data, id_chat=self.chat.pk).status_code, 409)
        self.assertEqual(self.request(ChatbotResponderView, self.otro, "post", data, id_chat=self.chat.pk).status_code, 404)
        self.assertFalse(Mensaje.objects.exists())

    def test_websocket_repite_turno_rest_sin_guardar_otra_vez(self):
        data = {"mensaje": "Mis próximas citas", "request_id": str(uuid4())}
        self.request(ChatbotResponderView, self.medico, "post", data, id_chat=self.chat.pk)
        async def conversar():
            async def application(scope, receive, send):
                scope.update(user=self.medico, url_route={"kwargs": {"id_chat": self.chat.pk}})
                await BymaxConsumer.as_asgi()(scope, receive, send)
            socket = WebsocketCommunicator(application, "/ws/chatbot/")
            self.assertTrue((await socket.connect())[0])
            await socket.receive_json_from()
            await socket.send_json_to(data)
            self.assertEqual((await socket.receive_json_from())["tipo"], "fin")
            await socket.disconnect()
        async_to_sync(conversar)()
        self.assertEqual(Mensaje.objects.count(), 2)

    def test_mime_real_extension_y_cursor(self):
        buffer = BytesIO(); Image.new("RGB", (2, 2)).save(buffer, format="PNG")
        for nombre, datos, mime in (("foto.png", b"no-es-imagen", "image/png"), ("foto.jpg", buffer.getvalue(), "image/png"),
            ("foto.png", buffer.getvalue(), "image/jpeg")):
            self.assertIsNotNone(validar_imagen_medica(SimpleUploadedFile(nombre, datos, content_type=mime)))
        archivo = SimpleUploadedFile("foto.png", buffer.getvalue(), content_type="image/png")
        archivo.seek(3)
        self.assertIsNone(validar_imagen_medica(archivo))
        self.assertEqual(archivo.tell(), 3)

    def test_resultado_paciente_con_fechas_conserva_contrato_y_persistencia(self):
        chat = Chat.objects.create(id_usuario=self.paciente)
        resultado = ejecutar_tool("consultar_disponibilidad", chat, "Mis citas", {})
        with patch("chatbot.views.ConversationManager.procesar", return_value=resultado):
            response = self.request(ChatbotResponderView, self.paciente, "post", {"mensaje": "Mis citas"}, id_chat=chat.pk)
        self.assertTrue(response.data["data"]["resultado"]["success"])
        self.assertIsInstance(response.data["data"]["resultado"]["data"]["citas"][0]["fecha"], str)
        self.assertEqual(Mensaje.objects.get(id_chat=chat, es_bot=True).resultado, response.data["data"]["resultado"])

    def test_error_servicio_revierte_cita_y_consume_confirmacion(self):
        cita = Cita.objects.filter(id_medico=self.medico).first()
        self.operar("Completa", cita)
        def falla(*args):
            Cita.objects.filter(pk=cita.pk).update(id_estado=self.estados["completada"])
            Notificacion.objects.create(titulo="Prueba", mensaje="Prueba", tipo="prueba", id_medico=self.medico)
            raise RuntimeError("token-privado-no-publicar")
        with patch("chatbot.services.cita_service.completarCitaService", side_effect=falla):
            resultado = ConversationManager.procesar(self.chat, "Confirmo")
        self.assertFalse(resultado["success"])
        self.assertNotIn("token-privado", str(resultado))
        cita.refresh_from_db(); self.chat.refresh_from_db()
        self.assertEqual(cita.id_estado.nombre, "confirmada")
        self.assertFalse(Notificacion.objects.exists())
        self.assertNotIn("operacion_medica", self.chat.contexto_temporal)

    def test_respuesta_tardia_conserva_caso_original(self):
        self.seleccionar(self.paciente)
        original = Chat.objects.get(pk=self.chat.pk)
        self.seleccionar(self.segundo)
        with patch("chatbot.ai.doctor_conversation.preguntar_gemini", return_value="Resumen") as gemini:
            ConversationManager.procesar(original, "Resume su caso")
        self.assertEqual(original.contexto_clinico_id, original.contexto_temporal["clinico"]["sesion_id"])
        self.assertNotEqual(original.contexto_clinico_id, self.chat.contexto_clinico_id)
        self.assertNotIn(self.segundo.nombre, str(gemini.call_args))

    def test_identidad_conversacional_medica_procede_del_backend(self):
        with patch("chatbot.ai.doctor_conversation.preguntar_gemini") as gemini:
            respuesta = ConversationManager.procesar(self.chat, "¿Cuál es mi especialidad?")
        self.assertIn(self.medico.nombre, respuesta)
        self.assertIn("General", respuesta)
        gemini.assert_not_called()

    def test_uuid_de_imagen_rechaza_contenido_diferente(self):
        clave = uuid4()
        iniciar_turno(self.chat, clave, "Imagen", SimpleUploadedFile("foto.png", b"primera"))
        with self.assertRaises(ValueError):
            iniciar_turno(self.chat, clave, "Imagen", SimpleUploadedFile("foto.png", b"segunda"))
