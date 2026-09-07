from datetime import datetime, timedelta, timezone as datetime_timezone
from types import SimpleNamespace
from unittest.mock import patch

from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from catalogos.models import Estado, Rol
from citas.models import Cita
from chatbot.ai.conversation_manager import ConversationManager
from chatbot.ai.doctor_conversation import construir_contexto_medico, DOCTOR_SYSTEM_PROMPT, ejecutar as ejecutar_medico
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

    def test_proximas_filtra_actor_fecha_estado_orden_sin_n_mas_uno(self):
        ahora = timezone.now()
        Cita.objects.all().delete()
        primera = self.cita(self.medico, self.paciente, "pendiente", ahora)
        segunda = self.cita(self.medico, self.segundo, "reprogramada", ahora + timedelta(hours=1))
        tercera = self.cita(self.medico, self.paciente, "confirmada", ahora + timedelta(hours=2))
        self.cita(self.medico, self.paciente, fecha=ahora - timedelta(seconds=1))
        self.cita(self.medico, self.paciente, "cancelada")
        self.cita(self.medico, self.paciente, "completada")
        self.cita(self.otro, self.ajeno)
        # Una consulta valida al propietario médico y otra carga todas las citas.
        with patch("chatbot.tools.medico_clinico.timezone.now", return_value=ahora), self.assertNumQueries(2):
            resultado = BuscarProximosPacientesTool().execute(self.chat, "Mis citas", {"id_medico": self.otro.id})
        citas = resultado["data"]["citas"]
        self.assertEqual([item["id_cita"] for item in citas], [primera.id, segunda.id, tercera.id])
        self.assertEqual(set(citas[0]), {"id_cita", "fecha_programada", "estado", "atrasada", "paciente"})
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

    @patch("chatbot.ai.doctor_conversation.preguntar_gemini")
    def test_frases_agenda_usan_herramienta_sin_paciente_y_sin_gemini(self, gemini):
        consultas = {
            "¿Qué citas tengo pendientes?": {"alcance": "pendientes"},
            "¿Puedes decirme qué citas tengo pendientes por completar?": {"alcance": "pendientes"},
            "¿Con qué usuarios tengo una cita pendiente?": {"alcance": "pendientes"},
            "¿Con qué usuarios tengo cita?": {"alcance": "proximas"},
            "¿Con qué usuarios tengo citas?": {"alcance": "proximas"},
            "Muéstrame mis próximas citas.": {"alcance": "proximas"},
            "¿Cuál es mi agenda?": {"alcance": "proximas"},
            "¿Qué pacientes atiendo hoy?": {"alcance": "hoy"},
            "¿Cuáles son mis pacientes programados?": {"alcance": "proximas"},
            "¿A quién atiendo después?": {"alcance": "siguiente"},
            "¿Quién sigue?": {"alcance": "siguiente"},
            "Muéstrame mis citas confirmadas.": {"alcance": "proximas", "estado": "confirmada"},
            "Quisiera ver las citas que tengo reprogramadas": {"alcance": "proximas", "estado": "reprogramada"},
            "Necesito saber cuáles citas me quedan por completar": {"alcance": "pendientes"},
            "Lista los pacientes de hoy": {"alcance": "hoy"},
            "Mis próximas citas pendientes": {"alcance": "proximas"},
        }
        for mensaje, filtros in consultas.items():
            for streaming in (False, True):
                with self.subTest(mensaje=mensaje, streaming=streaming), patch(
                    "chatbot.ai.doctor_conversation.ejecutar", wraps=ejecutar_medico,
                ) as ejecutar:
                    respuesta = ConversationManager.procesar(self.chat, mensaje, streaming=streaming)
                    self.assertTrue(respuesta["success"])
                    ejecutar.assert_called_once_with(self.chat, "buscar_proximos_pacientes", mensaje, filtros)
                    self.assertEqual(self.chat.contexto_temporal, {})
        gemini.assert_not_called()

    def test_pendientes_incluyen_atrasadas_excluyen_ajenas_y_terminadas(self):
        ahora = timezone.now()
        propias = [self.cita(self.medico, self.paciente, estado, ahora - timedelta(days=indice + 1))
                   for indice, estado in enumerate(("pendiente", "confirmada", "reprogramada"))]
        ajena = self.cita(self.otro, self.ajeno, "pendiente", ahora - timedelta(days=5))
        cancelada = self.cita(self.medico, self.paciente, "cancelada", ahora - timedelta(days=5))
        completada = self.cita(self.medico, self.paciente, "completada", ahora - timedelta(days=5))
        respuesta = self.tool("buscar_proximos_pacientes", {"alcance": "pendientes", "medico_id": self.otro.id})
        datos = respuesta["data"]["citas"]
        ids = [cita["id_cita"] for cita in datos]
        self.assertEqual(ids[:3], [cita.id for cita in reversed(propias)])
        self.assertTrue(all(cita["atrasada"] for cita in datos[:3]))
        self.assertTrue(all(not cita["atrasada"] for cita in datos[3:]))
        self.assertTrue({ajena.id, cancelada.id, completada.id}.isdisjoint(ids))
        self.assertIn(self.paciente.nombre, respuesta["message"])
        self.assertIn("Situación: atrasada", respuesta["message"])
        self.assertIn("Estado: confirmada", respuesta["message"])

    @override_settings(TIME_ZONE="America/Bogota")
    def test_hoy_respeta_medianoche_bogota_y_no_el_dia_utc(self):
        # A las 02:00 UTC del día 8 todavía es el día 7 en Bogotá.
        ahora = datetime(2026, 9, 8, 2, tzinfo=datetime_timezone.utc)
        inicio = datetime(2026, 9, 7, 5, tzinfo=datetime_timezone.utc)
        fin = inicio + timedelta(days=1)
        Cita.objects.all().delete()
        self.cita(self.medico, self.paciente, fecha=inicio - timedelta(microseconds=1))
        primera = self.cita(self.medico, self.paciente, fecha=inicio)
        ultima = self.cita(self.medico, self.segundo, fecha=fin - timedelta(microseconds=1))
        self.cita(self.medico, self.paciente, fecha=fin)
        self.cita(self.otro, self.ajeno, fecha=inicio)
        with patch("chatbot.tools.medico_clinico.timezone.now", return_value=ahora):
            datos = self.tool("buscar_proximos_pacientes", {"alcance": "hoy"})["data"]["citas"]
        self.assertEqual([cita["id_cita"] for cita in datos], [primera.id, ultima.id])
        self.assertTrue(datos[0]["atrasada"])
        self.assertFalse(datos[1]["atrasada"])
        self.assertTrue(all(cita["fecha_programada"].startswith("2026-09-07") for cita in datos))

    def test_siguiente_y_filtros_de_estado(self):
        ahora = timezone.now()
        self.cita(self.medico, self.paciente, fecha=ahora - timedelta(hours=1))
        siguiente = self.cita(self.medico, self.segundo, "reprogramada", ahora + timedelta(hours=1))
        datos = self.tool("buscar_proximos_pacientes", {"alcance": "siguiente"})["data"]["citas"]
        self.assertEqual([cita["id_cita"] for cita in datos], [siguiente.id])
        for estado in ("confirmada", "reprogramada"):
            with self.subTest(estado=estado):
                datos = self.tool("buscar_proximos_pacientes", {"estado": estado})["data"]["citas"]
                self.assertTrue(datos)
                self.assertTrue(all(cita["estado"] == estado for cita in datos))

    def test_lista_pendientes_vacia_es_exito_http_200(self):
        Cita.objects.filter(id_medico=self.medico).delete()
        response = self.request(ChatbotResponderView, self.medico, "post",
                                {"mensaje": "¿Qué citas tengo pendientes?"}, id_chat=self.chat.id)
        self.assertEqual(response.status_code, 200)
        resultado = response.data["data"]["resultado"]
        self.assertTrue(resultado["success"])
        self.assertEqual(resultado["data"], {"citas": []})
        self.assertIn("No tienes citas pendientes", response.data["data"]["respuesta"])

    @patch("chatbot.ai.doctor_conversation.preguntar_gemini")
    def test_consultas_clinicas_individuales_exigen_contexto_autorizado(self, gemini):
        for mensaje in ("Analiza el caso de Ana", "Resume su historia clínica", "Revisa sus medicamentos",
                        "Compara sus resultados", "¿Qué diagnóstico diferencial considerarías?",
                        "Resume la historia clínica del paciente de mi próxima cita"):
            for streaming in (False, True):
                with self.subTest(mensaje=mensaje, streaming=streaming):
                    respuesta = ConversationManager.procesar(self.chat, mensaje, streaming=streaming)
                    self.assertFalse(respuesta["success"])
                    self.assertIn("paciente autorizado", respuesta["message"])
        self.chat.contexto_temporal = {"clinico": {"paciente_id": self.ajeno.id}}
        self.chat.save(update_fields=["contexto_temporal"])
        self.assertFalse(ConversationManager.procesar(self.chat, "Analiza el caso de Ana")["success"])
        gemini.assert_not_called()
        self.assertFalse(ToolLog.objects.exists())

    @patch("chatbot.ai.doctor_conversation.preguntar_gemini")
    def test_agenda_no_lee_historial_ni_cambia_paciente_activo(self, gemini):
        self.seleccionar(self.paciente)
        contexto = dict(self.chat.contexto_temporal)
        Mensaje.objects.create(id_chat=self.chat, contenido="Selecciona un paciente para revisar su historia.", es_bot=True)
        with patch("chatbot.ai.doctor_conversation.construir_contexto_medico") as construir:
            respuesta = ConversationManager.procesar(self.chat, "¿Con qué usuarios tengo una cita pendiente?")
        self.assertTrue(respuesta["success"])
        self.assertEqual(self.chat.contexto_temporal, contexto)
        construir.assert_not_called()
        gemini.assert_not_called()

    def test_agenda_audita_solo_filtros_operativos_y_cantidad(self):
        resultado = ToolManager.ejecutar("buscar_proximos_pacientes", self.chat, "Mis pendientes", {
            "alcance": "pendientes", "estado": "confirmada", "medico_id": self.otro.id,
            "correo": "secreto@example.com", "diagnostico": "secreto clínico",
        })
        log = ToolLog.objects.get()
        self.assertEqual(log.medico_id, self.medico.id)
        self.assertEqual(log.parametros, {"alcance": "pendientes", "estado": "confirmada"})
        self.assertEqual(log.respuesta, {"cantidad_resultados": len(resultado["data"]["citas"])})
        self.assertTrue(log.correcto)
        self.assertGreaterEqual(log.latencia, 0)
        for privado in (self.paciente.nombre, self.paciente.correo, "secreto", "medico_id"):
            self.assertNotIn(privado, str(log.parametros) + str(log.respuesta))

    def test_agenda_rechaza_filtros_invalidos_sin_guardar_su_contenido(self):
        respuesta = ToolManager.ejecutar("buscar_proximos_pacientes", self.chat, "", {"alcance": "secreto"})
        self.assertFalse(respuesta["success"])
        log = ToolLog.objects.get()
        self.assertFalse(log.correcto)
        self.assertEqual(log.respuesta, {"cantidad_resultados": 0})
        self.assertNotIn("secreto", str(log.parametros))

    def test_agenda_verifica_medico_persistido_no_solo_id_numerico(self):
        herramienta = BuscarProximosPacientesTool()
        self.assertFalse(herramienta.execute(SimpleNamespace(id_medico_id=self.medico.id), "", {})["success"])
        chat_paciente = Chat.objects.create(id_usuario=self.paciente)
        self.assertEqual(self.paciente.id, self.medico.id)
        self.assertFalse(herramienta.execute(chat_paciente, "", {})["success"])
        self.chat.id_medico = self.otro  # No cambia el propietario persistido del chat.
        self.assertFalse(herramienta.execute(self.chat, "", {})["success"])

    def test_agenda_numero_consultas_constante_al_crecer_lista(self):
        for cantidad in (1, 15):
            for _ in range(cantidad):
                self.cita(self.medico, self.paciente)
            with self.assertNumQueries(2):
                respuesta = self.tool("buscar_proximos_pacientes", {"alcance": "pendientes"})
            for cita in respuesta["data"]["citas"]:
                self.assertEqual(set(cita), {"id_cita", "fecha_programada", "estado", "atrasada", "paciente"})
                self.assertEqual(set(cita["paciente"]), {"id", "nombre"})

    @patch("chatbot.ai.conversation_manager.extraer_y_guardar_memoria")
    @patch("chatbot.ai.conversation_manager.procesar_mensaje")
    @patch("chatbot.ai.doctor_conversation.procesar_medico")
    def test_consulta_de_paciente_conserva_router_y_herramienta_originales(self, medico, router, memoria):
        from chatbot.ai.router_decision import RouterDecision
        router.return_value = RouterDecision(tool=True, tool_name="consultar_disponibilidad", parametros={})
        chat_paciente = Chat.objects.create(id_usuario=self.paciente)
        with patch("chatbot.ai.tool_manager.ToolManager._localizar", side_effect=lambda respuesta, mensaje: respuesta):
            respuesta = ConversationManager.procesar(chat_paciente, "Muéstrame mis próximas citas")
        self.assertTrue(respuesta["success"])
        self.assertTrue(respuesta["data"]["citas"])
        self.assertIn("medico", respuesta["data"]["citas"][0])
        self.assertNotIn("atrasada", respuesta["data"]["citas"][0])
        medico.assert_not_called()
        router.assert_called_once()
        self.assertEqual(ToolLog.objects.get().nombre_tool, "consultar_disponibilidad")
