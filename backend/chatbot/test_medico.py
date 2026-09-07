from datetime import timedelta
from unittest.mock import patch

from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from catalogos.models import Estado, Rol
from citas.models import Cita
from chatbot.ai.conversation_manager import ConversationManager
from chatbot.ai.doctor_conversation import construir_contexto_medico, DOCTOR_SYSTEM_PROMPT
from chatbot.ai.tool_executor import ejecutar_tool
from chatbot.ai.tool_manager import ToolManager
from chatbot.consumers import BymaxConsumer
from chatbot.models import Chat, Mensaje, ToolLog
from chatbot.services.chat_service import ChatService
from chatbot.tools.medico_clinico import BuscarProximosPacientesTool, contexto_activo
from chatbot.views import ChatListView, MensajeListView, ChatbotResponderView, ContextoMedicoView
from historial_medico.models import HistorialClinico
from medicos.models import Especialidad, Medico
from storage_app.views import ArchivoListaCrearView, ArchivoUrlView
from storage_app.models import Archivo
from users.models import Usuario


class BymaxMedicoTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        rol = Rol.objects.create(nombre="paciente")
        rol_medico = Rol.objects.create(nombre="medico")
        especialidad = Especialidad.objects.create(nombre="General")
        cls.pacientes = [Usuario.objects.create(
            nombre=f"Paciente {i}", apellido="Prueba", fecha_nacimiento="1990-01-01",
            estatura=1.7, peso=70, correo=f"p{i}@example.com", contraseña="hash",
            cedula=f"p{i}", telefono="000", id_rol=rol,
        ) for i in range(3)]
        cls.medicos = [Medico.objects.create(
            nombre=f"Médico {i}", apellido="Prueba", fecha_nacimiento="1980-01-01",
            correo=f"m{i}@example.com", contraseña="hash", cedula=f"m{i}", telefono="000",
            id_rol=rol_medico, id_especialidad=especialidad, direccion="Prueba",
        ) for i in range(2)]
        cls.estados = {nombre: Estado.objects.create(nombre=nombre) for nombre in
                       ("pendiente", "confirmada", "reprogramada", "completada", "cancelada")}

    def setUp(self):
        self.medico, self.otro = self.medicos
        self.paciente, self.segundo, self.ajeno = self.pacientes
        self.chat = Chat.objects.create(id_medico=self.medico)
        self.cita(self.medico, self.paciente)
        self.cita(self.medico, self.segundo)
        self.cita(self.otro, self.ajeno)
        self.factory = APIRequestFactory()

    def cita(self, medico, paciente, estado="confirmada", fecha=None):
        return Cita.objects.create(id_medico=medico, id_usuario=paciente,
                                   id_estado=self.estados[estado], fecha_programada=fecha or timezone.now() + timedelta(days=1))

    def tool(self, nombre, parametros=None):
        return ejecutar_tool(nombre, self.chat, "Solicitud", parametros or {})

    def seleccionar(self, paciente):
        return self.tool("seleccionar_paciente", {"paciente_id": paciente.id})

    def request(self, view, user, method="get", data=None, **kwargs):
        request = getattr(self.factory, method)("/api/chatbot/", data or {}, format="json")
        force_authenticate(request, user=user)
        return view.as_view()(request, **kwargs)

    def test_proximas_filtra_actor_fecha_estado_orden_y_una_consulta(self):
        ahora = timezone.now()
        Cita.objects.all().delete()
        primera = self.cita(self.medico, self.paciente, "pendiente", ahora)
        segunda = self.cita(self.medico, self.segundo, "reprogramada", ahora + timedelta(hours=1))
        tercera = self.cita(self.medico, self.paciente, "confirmada", ahora + timedelta(hours=2))
        self.cita(self.medico, self.paciente, fecha=ahora - timedelta(seconds=1))
        self.cita(self.medico, self.paciente, "cancelada")
        self.cita(self.medico, self.paciente, "completada")
        self.cita(self.otro, self.ajeno)
        with patch("chatbot.tools.medico_clinico.timezone.now", return_value=ahora), self.assertNumQueries(1):
            resultado = BuscarProximosPacientesTool().execute(self.chat, "Mis citas", {"id_medico": self.otro.id})
        citas = resultado["data"]["citas"]
        self.assertEqual([item["id_cita"] for item in citas], [primera.id, segunda.id, tercera.id])
        self.assertEqual(set(citas[0]), {"id_cita", "fecha_programada", "estado", "paciente"})
        self.assertEqual(set(citas[0]["paciente"]), {"id", "nombre"})
        self.assertTrue(citas[0]["fecha_programada"].endswith("-05:00"))

    def test_lista_vacia_y_herramienta_no_permitida_a_paciente(self):
        Cita.objects.filter(id_medico=self.medico).delete()
        self.assertEqual(self.tool("buscar_proximos_pacientes")["data"], {"citas": []})
        chat_paciente = Chat.objects.create(id_usuario=self.paciente)
        self.assertFalse(ejecutar_tool("buscar_proximos_pacientes", chat_paciente, "", {})["success"])
        self.assertFalse(self.tool("agendar_cita", {"confirmado": True})["success"])

    def test_chats_aislados_incluso_con_ids_coincidentes(self):
        self.assertEqual(self.medico.id, self.paciente.id)
        chat_paciente = Chat.objects.create(id_usuario=self.paciente)
        for actor in (self.paciente, self.otro):
            self.assertIsNone(ChatService.obtener_chat(self.chat.id, actor))
            self.assertEqual(self.request(MensajeListView, actor, id_chat=self.chat.id).status_code, 404)
            self.assertFalse(ChatService.eliminar_chat(self.chat.id, actor))
        self.assertIsNone(ChatService.obtener_chat(chat_paciente.id, self.medico))
        self.assertEqual(len(ChatService.listar_chats(self.medico)), 1)
        response = self.request(ChatListView, self.medico, "post")
        self.assertEqual(response.status_code, 201)
        self.assertIsNone(response.data["data"]["id_usuario"])
        self.assertEqual(response.data["data"]["id_medico"], self.medico.id)

    def test_propietario_unico_en_base_de_datos(self):
        for datos in ({}, {"id_usuario": self.paciente, "id_medico": self.medico}):
            with self.assertRaises(IntegrityError), transaction.atomic():
                Chat.objects.create(**datos)

    def test_contexto_persistente_rechaza_ajenos_e_historiales_de_otros(self):
        propio = HistorialClinico.objects.create(usuario=self.paciente, medico=self.medico,
                  motivo_consulta="Motivo propio", diagnostico_general="Diagnóstico propio")
        HistorialClinico.objects.create(usuario=self.paciente, medico=self.otro,
                  motivo_consulta="Secreto ajeno", diagnostico_general="Secreto ajeno")
        self.assertTrue(self.seleccionar(self.paciente)["success"])
        self.chat.refresh_from_db()
        self.assertEqual(contexto_activo(self.chat)["id"], self.paciente.id)
        self.assertFalse(self.seleccionar(self.ajeno)["success"])
        datos = self.tool("consultar_historial_paciente", {"paciente_id": self.ajeno.id, "id_medico": self.otro.id})
        self.assertEqual([item["id"] for item in datos["data"]["historiales"]], [propio.id])
        self.assertNotIn("Secreto ajeno", str(datos))

    def test_cambiar_y_cerrar_no_envia_caso_anterior_al_modelo(self):
        self.seleccionar(self.paciente)
        anterior = self.chat.contexto_clinico_id
        Mensaje.objects.create(id_chat=self.chat, contenido="secreto-del-primer-caso", contexto_clinico=anterior)
        self.assertIn("secreto-del-primer-caso", str(construir_contexto_medico(self.chat, "Resumen")))
        self.seleccionar(self.segundo)
        self.assertNotIn("secreto-del-primer-caso", str(construir_contexto_medico(self.chat, "Resumen")))
        Mensaje.objects.create(id_chat=self.chat, contenido="respuesta-tardia-caso-anterior", contexto_clinico=anterior)
        self.assertNotIn("respuesta-tardia", str(construir_contexto_medico(self.chat, "Resumen")))
        Mensaje.objects.create(id_chat=self.chat, contenido="secreto-del-segundo-caso", contexto_clinico=self.chat.contexto_clinico_id)
        self.tool("cerrar_contexto_paciente")
        self.assertIsNone(contexto_activo(self.chat))
        self.assertNotIn("secreto-del", str(construir_contexto_medico(self.chat, "Ayuda")))
        self.seleccionar(self.paciente)
        self.assertNotIn("secreto-del", str(construir_contexto_medico(self.chat, "Resumen")))
        self.assertEqual(self.chat.mensajes.count(), 3)

    def test_revocar_vinculo_impide_lectura_aunque_contexto_persista(self):
        self.seleccionar(self.paciente)
        Cita.objects.filter(id_medico=self.medico, id_usuario=self.paciente).delete()
        self.assertFalse(self.tool("consultar_historial_paciente")["success"])
        self.assertIsNone(contexto_activo(self.chat))

    def test_auditoria_medica_sin_payload_clinico(self):
        respuesta = ToolManager.ejecutar("seleccionar_paciente", self.chat, "Seleccionar", {"paciente_id": self.paciente.id})
        self.assertTrue(respuesta["success"])
        log = ToolLog.objects.get()
        self.assertEqual(log.medico_id, self.medico.id)
        self.assertIsNone(log.usuario_id)
        self.assertNotIn(self.paciente.nombre, str(log.parametros) + str(log.respuesta))

    @patch("chatbot.ai.doctor_conversation.preguntar_gemini", return_value="Borrador para revisión")
    def test_medico_usa_prompt_propio_y_stream_mismo_contexto(self, gemini):
        self.seleccionar(self.paciente)
        self.assertEqual(ConversationManager.procesar(self.chat, "Prepara nota"), "Borrador para revisión")
        self.assertEqual(gemini.call_args.kwargs["system_prompt"], DOCTOR_SYSTEM_PROMPT)
        resultado = ConversationManager.procesar(self.chat, "Prepara nota", streaming=True)
        self.assertTrue(resultado["stream"])
        self.assertEqual(gemini.call_count, 1)
        self.assertEqual(self.chat.id_usuario_id, None)

    def test_api_contexto_y_rest_responder_respetan_actor(self):
        self.assertEqual(self.request(ContextoMedicoView, self.paciente, id_chat=self.chat.id).status_code, 403)
        self.assertEqual(self.request(ContextoMedicoView, self.otro, id_chat=self.chat.id).status_code, 404)
        response = self.request(ContextoMedicoView, self.medico, id_chat=self.chat.id)
        self.assertEqual(response.status_code, 200)
        self.assertIn("no-store", response["Cache-Control"])
        self.assertEqual(len(response.data["data"]["citas"]), 2)
        response = self.request(ChatbotResponderView, self.medico, "post", {"mensaje": f"Seleccionar paciente #{self.paciente.id}"}, id_chat=self.chat.id)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["resultado"]["data"]["paciente_activo"]["id"], self.paciente.id)

    def test_websocket_busca_por_tipo_de_actor(self):
        consumer = BymaxConsumer()
        consumer.id_chat = self.chat.id
        self.assertIsNone(async_to_sync(consumer._obtener_chat)(self.paciente))
        self.assertIsNone(async_to_sync(consumer._obtener_chat)(self.otro))
        self.assertEqual(async_to_sync(consumer._obtener_chat)(self.medico).id, self.chat.id)

    def test_storage_no_confunde_id_medico_con_paciente(self):
        self.assertEqual(self.request(ArchivoListaCrearView, self.medico).status_code, 403)
        self.assertEqual(self.request(ArchivoUrlView, self.medico, pk=1).status_code, 403)

    def test_websocket_rechaza_ajenos_y_responde_al_medico(self):
        async def conversar(actor, permitido):
            async def application(scope, receive, send):
                scope = {**scope, "user": actor, "url_route": {"kwargs": {"id_chat": self.chat.id}}}
                await BymaxConsumer.as_asgi()(scope, receive, send)
            socket = WebsocketCommunicator(application, f"/ws/chatbot/{self.chat.id}/")
            conectado, codigo = await socket.connect()
            self.assertEqual(conectado, permitido)
            if permitido:
                self.assertEqual((await socket.receive_json_from())["tipo"], "conectado")
                await socket.send_json_to({"mensaje": "Mis próximas citas"})
                self.assertEqual((await socket.receive_json_from())["tipo"], "inicio")
                self.assertEqual((await socket.receive_json_from())["tipo"], "texto")
                fin = await socket.receive_json_from()
                self.assertEqual(fin["tipo"], "fin")
                self.assertEqual(len(fin["resultado"]["data"]["citas"]), 2)
            else:
                self.assertEqual(codigo, 4404)
            await socket.disconnect()
        for actor in (self.paciente, self.otro):
            async_to_sync(conversar)(actor, False)
        async_to_sync(conversar)(self.medico, True)

    @patch("chatbot.views.guardar_archivo_usuario")
    @patch("chatbot.views.analizar_imagen_medica", return_value="Análisis paciente")
    @patch("chatbot.ai.doctor_conversation.preguntar_gemini", return_value="Análisis médico")
    def test_imagenes_conservan_flujo_paciente_y_aislan_medico(self, gemini, analizar_paciente, guardar):
        self.seleccionar(self.paciente)
        for actor, chat, categoria, usuario_id in (
            (self.medico, self.chat, f"general/bymax/medicos/{self.medico.id}", None),
            (self.paciente, Chat.objects.create(id_usuario=self.paciente), "general/bymax", self.paciente.id),
        ):
            archivo = Archivo.objects.create(usuario_id=usuario_id, nombre_original="test.png",
                storage_key=f"{categoria}/{chat.id}/test.png", tamano=8, tipo="imagen", categoria=categoria)
            guardar.return_value = archivo
            request = self.factory.post("/api/chatbot/", {"mensaje": "Analiza esta imagen",
                "imagen": SimpleUploadedFile("test.png", b"fake-png", content_type="image/png")}, format="multipart")
            force_authenticate(request, user=actor)
            response = ChatbotResponderView.as_view()(request, id_chat=chat.id)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(guardar.call_args.kwargs["categoria"], categoria)
            self.assertEqual(guardar.call_args.kwargs["usuario_id"], usuario_id)
            self.assertEqual(guardar.call_args.kwargs["referencia_id"], chat.id)
            self.assertEqual(Mensaje.objects.get(id_chat=chat, es_bot=False).archivo_id, archivo.id)
        self.assertEqual(analizar_paciente.call_count, 1)
        self.assertEqual(gemini.call_count, 1)
        self.assertEqual(gemini.call_args.kwargs["system_prompt"], DOCTOR_SYSTEM_PROMPT)
        self.assertEqual(gemini.call_args.args[0][-1]["parts"][-1].inline_data.data, b"fake-png")

    def test_rechazo_de_herramienta_se_registra_como_fallo(self):
        respuesta = ToolManager.ejecutar("seleccionar_paciente", self.chat, "Seleccionar", {"paciente_id": self.ajeno.id})
        self.assertFalse(respuesta["success"])
        self.assertFalse(ToolLog.objects.get().correcto)
