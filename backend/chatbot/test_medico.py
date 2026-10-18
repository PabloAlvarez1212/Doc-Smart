from datetime import datetime, timedelta, timezone as datetime_timezone
from types import SimpleNamespace
from unittest.mock import patch
from io import BytesIO
from PIL import Image

from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, transaction
from django.test import TestCase, TransactionTestCase, override_settings
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
from medicos.models import Especialidad, Medico, SolicitudValidacionMedico
from notificaciones.consumers import NotificacionConsumer
from storage_app.views import ArchivoListaCrearView, ArchivoUrlView
from storage_app.models import Archivo
from users.models import Usuario
from chatbot.ai.conversation_flow import ConversationFlow
from chatbot.ai.flow_manager import FlowManager
from chatbot.tools.citas import CancelarCitaTool

TEST_CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "bymax-medico-tests",
    },
}

TEST_CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}


@override_settings(CACHES=TEST_CACHES, CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
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
        for indice, medico in enumerate(cls.medicos):
            hoja_vida = Archivo.objects.create(
                medico=medico,
                nombre_original=f"hoja-vida-{indice}.pdf",
                storage_key=f"pruebas/bymax/hoja-vida-{indice}.pdf",
                content_type="application/pdf",
                tamano=128,
                tipo="documento",
                categoria="hoja_vida",
            )
            SolicitudValidacionMedico.objects.create(
                medico=medico,
                hoja_vida=hoja_vida,
                estado=SolicitudValidacionMedico.EstadoSolicitud.APROBADO,
            )
        cls.estados = {nombre: Estado.objects.create(nombre=nombre) for nombre in
                       ("pendiente", "confirmada", "reprogramada", "completada", "cancelada")}

    def setUp(self):
        correo = patch('notificaciones.email_citas_services.resend.Emails.send', return_value={'id': 'test-email'})
        correo.start()
        self.addCleanup(correo.stop)
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

    def test_busqueda_paciente_conserva_id_y_codigo_normalizado(self):
        from chatbot.services.cita_service import CitaService
        cita = Cita.objects.filter(id_usuario=self.paciente).first()
        self.assertEqual(CitaService.obtener_cita_usuario(cita.pk, self.paciente).pk, cita.pk)
        self.assertEqual(CitaService.obtener_cita_usuario(str(cita.pk), self.paciente).pk, cita.pk)
        self.assertEqual(CitaService.obtener_cita_usuario_codigo(f' {cita.codigo_cita.lower()} ', self.paciente).pk, cita.pk)
        self.assertIsNone(CitaService.obtener_cita_usuario(cita.pk, self.ajeno))
        self.assertIsNone(CitaService.obtener_cita_usuario_codigo(cita.codigo_cita, self.ajeno))

    def test_paciente_agendar_reprogramar_exigen_autorizacion_de_un_uso(self):
        from chatbot.tools.citas import AgendarCitaTool, ReprogramarCitaTool
        cita = Cita.objects.filter(id_usuario=self.paciente).first()
        fecha = (timezone.now() + timedelta(days=4)).isoformat()
        for tool, params, target, success_status in (
            (AgendarCitaTool(), {'id_medico': self.medico.pk, 'fecha': fecha}, 'agendar', 201),
            (ReprogramarCitaTool(), {'codigo_cita': cita.codigo_cita, 'fecha': fecha}, 'reprogramar', 200),
        ):
            with self.subTest(tool=tool.name), patch('chatbot.tools.citas.CitaService.horario_disponible', return_value=True), patch(f'chatbot.tools.citas.CitaService.{target}', return_value=({}, success_status)) as service:
                chat = Chat.objects.create(id_usuario=self.paciente)
                self.assertFalse(tool.execute(chat, 'Solicitud directa', {**params, 'confirmado': True})['success'])
                service.assert_not_called()
                previa = tool.execute(chat, 'Solicitud', params)
                self.assertTrue(previa['requires_confirmation'])
                ConversationFlow.iniciar(chat, f'confirmar:{tool.name}')
                ConversationFlow.guardar(chat, previa['data'])
                decision = FlowManager.continuar(chat, 'Sí')
                self.assertTrue(tool.execute(chat, 'Sí', decision.parametros)['success'])
                self.assertFalse(tool.execute(chat, 'Sí', decision.parametros)['success'])
                service.assert_called_once()

    def test_autorizacion_paciente_rechaza_cambios_expiracion_y_no(self):
        from chatbot.tools.citas import AgendarCitaTool
        params = {'id_medico': self.medico.pk, 'fecha': (timezone.now() + timedelta(days=4)).isoformat()}
        for scenario in ('alterada', 'expirada', 'rechazada'):
            with self.subTest(scenario=scenario), patch('chatbot.tools.citas.CitaService.horario_disponible', return_value=True), patch('chatbot.tools.citas.CitaService.agendar') as service:
                chat = Chat.objects.create(id_usuario=self.paciente)
                tool = AgendarCitaTool()
                previa = tool.execute(chat, 'Agendar', params)
                ConversationFlow.iniciar(chat, 'confirmar:agendar_cita')
                ConversationFlow.guardar(chat, previa['data'])
                if scenario == 'rechazada':
                    FlowManager.continuar(chat, 'No')
                    confirmed = {**previa['data'], 'confirmado': True}
                else:
                    confirmed = FlowManager.continuar(chat, 'Sí').parametros
                    if scenario == 'alterada':
                        confirmed = {**confirmed, 'fecha': (timezone.now() + timedelta(days=5)).isoformat()}
                    else:
                        chat.contexto_temporal['_operacion_autorizada']['expira_en'] = timezone.now().timestamp() - 1
                        chat.save(update_fields=['contexto_temporal'])
                self.assertFalse(tool.execute(chat, 'Sí', confirmed)['success'])
                service.assert_not_called()

    def test_medico_cancelacion_exige_codigo_incluso_con_una_cita_y_contexto(self):
        self.seleccionar(self.paciente)
        contexto_clinico = dict(self.chat.contexto_temporal['clinico'])
        Cita.objects.filter(id_medico=self.medico).exclude(id_usuario=self.paciente).delete()
        cita = Cita.objects.get(id_medico=self.medico)
        ConversationManager.procesar(self.chat, 'Mis próximas citas')
        response = ConversationManager.procesar(self.chat, 'Quiero cancelar esa cita')
        self.assertTrue(response.get('requires_input'), response)
        self.assertIn('código', response['message'])
        self.assertNotIn('motivo', response['message'])
        cita.refresh_from_db()
        self.assertEqual(cita.id_estado.nombre, 'confirmada')
        response = ConversationManager.procesar(self.chat, f'{cita.codigo_cita}.')
        self.assertTrue(response.get('requires_input'), response)
        self.assertIn('motivo', response['message'])
        response = ConversationManager.procesar(self.chat, 'No podré atender por motivos personales.')
        self.assertTrue(response.get('requires_confirmation'), response)
        self.assertIn(cita.codigo_cita, response['message'])
        cita.refresh_from_db()
        self.assertEqual(cita.id_estado.nombre, 'confirmada')
        self.assertTrue(ConversationManager.procesar(self.chat, 'Sí.')['success'])
        cita.refresh_from_db()
        self.assertEqual(cita.id_estado.nombre, 'cancelada')
        self.assertEqual(cita.cancelada_por, 'medico')
        self.assertEqual(cita.motivo_cancelacion, 'No podré atender por motivos personales.')
        self.chat.refresh_from_db()
        self.assertEqual(self.chat.contexto_temporal['clinico'], contexto_clinico)
        self.assertNotIn('operacion_medica', self.chat.contexto_temporal)
        self.assertIn('No hay', ConversationManager.procesar(self.chat, 'Sí.'))

    def test_medico_previsualizacion_no_es_autorizacion_para_cancelar(self):
        cita = Cita.objects.filter(id_medico=self.medico, id_usuario=self.paciente).first()
        previa = ConversationManager.procesar(self.chat, f'Cancela la cita {cita.codigo_cita}')
        self.assertTrue(previa.get('requires_input'), previa)
        previa = ConversationManager.procesar(self.chat, 'No puedo atender por una emergencia familiar.')
        self.assertTrue(previa.get('requires_confirmation'), previa)
        self.assertFalse(self.tool('cancelar_cita_medico', {**previa['data'], 'confirmado': True})['success'])
        cita.refresh_from_db()
        self.assertEqual(cita.id_estado.nombre, 'confirmada')

    def seleccionar(self, paciente):
        return self.tool("seleccionar_paciente", {"paciente_id": paciente.id})

    def request(self, view, user, method="get", data=None, **kwargs):
        request = getattr(self.factory, method)("/api/chatbot/", data or {}, format="json")
        force_authenticate(request, user=user)
        return view.as_view()(request, **kwargs)

    def preparar_cancelacion_http(self):
        from django.core.cache import cache
        from rest_framework.test import APIClient
        cache.clear()
        self.chat_paciente = Chat.objects.create(id_usuario=self.paciente)
        self.cita_paciente = Cita.objects.filter(id_usuario=self.paciente, id_medico=self.medico).first()
        self.cita_paciente.codigo_cita = 'DOC-06O5VFRK'
        self.cita_paciente.save(update_fields=['codigo_cita'])
        self.motivo_paciente = 'No podré asistir por motivos personales.'
        self.cliente_paciente = APIClient()
        self.cliente_paciente.force_authenticate(self.paciente)
        memoria = patch('chatbot.ai.conversation_manager.extraer_y_guardar_memoria')
        memoria.start(); self.addCleanup(memoria.stop)
        router = patch('chatbot.ai.router.obtener_cliente')
        cliente = router.start(); self.addCleanup(router.stop)
        cliente.return_value.responses.create.return_value.output_text = '{"accion":"flujo","nombre":"cancelar_cita"}'
        generador = patch('chatbot.ai.router.preguntar_openai', return_value='La cita fue cancelada correctamente.')
        self.generador_paciente = generador.start(); self.addCleanup(generador.stop)
        return cliente

    def mensaje_paciente_http(self, mensaje):
        response = self.cliente_paciente.post(f'/api/chatbot/chats/{self.chat_paciente.pk}/responder/', {'mensaje': mensaje}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.chat_paciente.refresh_from_db()
        self.cita_paciente.refresh_from_db()
        return response.data['data']

    def confirmar_cancelacion_http(self):
        self.mensaje_paciente_http('Quiero cancelar una cita médica.')
        self.mensaje_paciente_http(self.cita_paciente.codigo_cita)
        return self.mensaje_paciente_http(self.motivo_paciente)

    def test_http_codigo_incorrecto_corregido_conserva_motivo_y_cancela_realmente(self):
        cliente = self.preparar_cancelacion_http()
        from types import SimpleNamespace
        cliente.return_value.responses.create.side_effect = [
            SimpleNamespace(output_text='{"accion":"flujo","nombre":"cancelar_cita"}'),
            SimpleNamespace(output_text='{"accion":"openai"}'),
            SimpleNamespace(output_text='{"accion":"openai"}'),
        ]
        self.generador_paciente.side_effect = ['¿Confirmas la cancelación de la cita DOC-06O5VFRK?', 'La cita DOC-06O5VFRK fue cancelada correctamente.']
        mensajes = ['Quiero cancelar una cita médica.', 'DOC-06O5VFRD', self.motivo_paciente, 'DOC-06O5VFRK', 'si', 'cancelar la cita']
        snapshots = []
        for mensaje in mensajes:
            result = self.mensaje_paciente_http(mensaje)
            snapshots.append((self.chat_paciente.estado_conversacion, dict(self.chat_paciente.contexto_temporal), self.cita_paciente.id_estado.nombre, result))
        self.assertTrue(all(item[2] == 'confirmada' for item in snapshots[:4]))
        self.assertEqual(snapshots[2][1].get('motivo_cancelacion'), self.motivo_paciente)
        self.assertEqual(snapshots[3][0], 'confirmar:cancelar_cita')
        self.assertEqual(snapshots[3][1]['codigo_cita'], 'DOC-06O5VFRK')
        self.assertEqual(snapshots[4][2], 'cancelada')
        self.assertTrue(snapshots[4][3]['resultado']['success'])
        self.assertEqual(self.cita_paciente.motivo_cancelacion, self.motivo_paciente)
        self.assertEqual(self.cita_paciente.cancelada_por, 'paciente')
        self.assertIsNotNone(self.cita_paciente.fecha_cancelacion)
        self.generador_paciente.assert_not_called()

    def test_http_cancelar_no_puede_responder_exito_generado_sin_operacion(self):
        cliente = self.preparar_cancelacion_http()
        cliente.return_value.responses.create.return_value.output_text = '{"accion":"openai"}'
        response = self.mensaje_paciente_http('cancelar la cita')
        self.assertEqual(self.cita_paciente.id_estado.nombre, 'confirmada')
        self.assertNotIn('cancelada correctamente', response['respuesta'])
        self.assertEqual(self.chat_paciente.estado_conversacion, 'cancelar_cita')
        self.generador_paciente.assert_not_called()

    def test_http_no_descarta_y_si_sin_pendiente_no_cancela(self):
        self.preparar_cancelacion_http()
        self.confirmar_cancelacion_http()
        self.assertEqual(self.chat_paciente.estado_conversacion, 'confirmar:cancelar_cita')
        self.mensaje_paciente_http('No.')
        self.assertEqual(self.chat_paciente.estado_conversacion, 'normal')
        self.assertNotIn('_cancelacion_autorizada', self.chat_paciente.contexto_temporal)
        self.mensaje_paciente_http('Sí.')
        self.assertEqual(self.cita_paciente.id_estado.nombre, 'confirmada')
        self.assertIsNone(self.cita_paciente.motivo_cancelacion)

    def test_http_fallo_cancelacion_no_publica_exito_y_no_reutiliza_autorizacion(self):
        self.preparar_cancelacion_http()
        self.confirmar_cancelacion_http()
        with patch('chatbot.tools.citas.CitaService.cancelar', return_value=('No se pudo cancelar', 400)) as cancelar:
            response = self.mensaje_paciente_http('Sí.')
            self.assertFalse(response['resultado']['success'])
            self.assertNotIn('cancelada correctamente', response['respuesta'])
            self.assertEqual(self.cita_paciente.id_estado.nombre, 'confirmada')
            self.mensaje_paciente_http('Sí.')
            cancelar.assert_called_once()

    def test_http_servicio_200_sin_persistencia_no_es_cancelacion_exitosa(self):
        self.preparar_cancelacion_http()
        self.confirmar_cancelacion_http()
        with patch('chatbot.tools.citas.CitaService.cancelar', return_value=('Cancelada correctamente', 200)):
            response = self.mensaje_paciente_http('confirmo')
        self.assertEqual(self.cita_paciente.id_estado.nombre, 'confirmada')
        self.assertFalse(response['resultado']['success'])
        self.assertNotIn('cancelada correctamente', response['respuesta'].lower())

    def test_http_cancelacion_confirmada_no_se_repite_y_reporta_estado_cancelado(self):
        from chatbot.services.cita_service import CitaService
        self.preparar_cancelacion_http()
        self.confirmar_cancelacion_http()
        with patch('chatbot.tools.citas.CitaService.cancelar', wraps=CitaService.cancelar) as cancelar:
            self.assertTrue(self.mensaje_paciente_http('Sí.')['resultado']['success'])
            timestamp = self.cita_paciente.fecha_cancelacion
            response = self.mensaje_paciente_http('si')
            self.assertIn('No hay una operación pendiente', response['respuesta'])
            cancelar.assert_called_once()
        self.assertEqual(self.cita_paciente.fecha_cancelacion, timestamp)
        response = self.confirmar_cancelacion_http()
        self.assertFalse(response['resultado']['success'])
        self.assertIn('ya está cancelada', response['respuesta'])

    def test_http_no_cancela_cita_ajena_ni_por_bandera_directa(self):
        self.preparar_cancelacion_http()
        ajena = Cita.objects.filter(id_usuario=self.segundo, id_medico=self.medico).first()
        self.mensaje_paciente_http('Quiero cancelar una cita médica.')
        self.mensaje_paciente_http(ajena.codigo_cita)
        response = self.mensaje_paciente_http(self.motivo_paciente)
        self.assertFalse(response['resultado']['success'])
        self.mensaje_paciente_http('Sí.')
        ajena.refresh_from_db()
        self.assertEqual(ajena.id_estado.nombre, 'confirmada')
        self.assertIsNone(ajena.motivo_cancelacion)
        response = self.cliente_paciente.post(f'/api/chatbot/chats/{self.chat_paciente.pk}/responder/', {
            'mensaje': 'cancelar la cita', 'confirmado': True, 'codigo_cita': self.cita_paciente.codigo_cita,
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.cita_paciente.refresh_from_db()
        self.assertEqual(self.cita_paciente.id_estado.nombre, 'confirmada')

    def test_http_autorizacion_cancelacion_alterada_o_expirada_es_rechazada(self):
        original = FlowManager._continuar_confirmacion
        for scenario in ('codigo', 'motivo', 'expirada'):
            with self.subTest(scenario=scenario):
                self.preparar_cancelacion_http()
                self.confirmar_cancelacion_http()
                otra = self.cita(self.medico, self.paciente)
                def alterar(chat, mensaje):
                    decision = original(chat, mensaje)
                    if scenario == 'expirada':
                        chat.contexto_temporal['_cancelacion_autorizada']['expira_en'] = timezone.now().timestamp() - 1
                        chat.save(update_fields=['contexto_temporal'])
                    else:
                        key = 'codigo_cita' if scenario == 'codigo' else 'motivo_cancelacion'
                        decision.parametros[key] = otra.codigo_cita if scenario == 'codigo' else 'Otro motivo no confirmado.'
                    return decision
                with patch('chatbot.ai.flow_manager.FlowManager._continuar_confirmacion', side_effect=alterar):
                    response = self.mensaje_paciente_http('Sí.')
                self.assertFalse(response['resultado']['success'])
                self.assertEqual(self.cita_paciente.id_estado.nombre, 'confirmada')
                self.assertNotIn('_cancelacion_autorizada', self.chat_paciente.contexto_temporal)
                otra.refresh_from_db()
                self.assertEqual(otra.id_estado.nombre, 'confirmada')

    def test_http_excepcion_servicio_revierte_escritura_y_consume_autorizacion(self):
        self.preparar_cancelacion_http()
        self.confirmar_cancelacion_http()
        def fallar(*args, **kwargs):
            Cita.objects.filter(pk=self.cita_paciente.pk).update(id_estado=self.estados['cancelada'])
            raise RuntimeError('fallo simulado después de escribir')
        with patch('chatbot.tools.citas.CitaService.cancelar', side_effect=fallar) as cancelar:
            response = self.mensaje_paciente_http('Sí.')
            self.assertFalse(response['resultado']['success'])
            self.assertEqual(self.cita_paciente.id_estado.nombre, 'confirmada')
            self.assertNotIn('_cancelacion_autorizada', self.chat_paciente.contexto_temporal)
            self.mensaje_paciente_http('si')
            cancelar.assert_called_once()

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
        self.assertEqual(set(citas[0]), {"id_cita", "codigo_cita", "fecha_programada", "estado", "atrasada", "paciente"})
        self.assertEqual([item['codigo_cita'] for item in citas], [primera.codigo_cita, segunda.codigo_cita, tercera.codigo_cita])
        self.assertIn(f'Código de cita: {primera.codigo_cita}', resultado['message'])
        self.assertNotIn('Cita: #', resultado['message'])
        self.assertNotIn('(paciente #', resultado['message'])
        self.assertEqual(set(citas[0]["paciente"]), {"id", "nombre"})
        self.assertTrue(citas[0]["fecha_programada"].endswith("-05:00"))

    def test_lista_vacia_y_herramienta_no_permitida_a_paciente(self):
        Cita.objects.filter(id_medico=self.medico).delete()
        self.assertEqual(self.tool("buscar_proximos_pacientes")["data"], {"citas": []})
        chat_paciente = Chat.objects.create(id_usuario=self.paciente)
        self.assertFalse(ejecutar_tool("buscar_proximos_pacientes", chat_paciente, "", {})["success"])
        self.assertFalse(self.tool("agendar_cita", {"confirmado": True})["success"])

    def test_chats_aislados_por_tipo_de_actor(self):
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

    @patch("chatbot.ai.doctor_conversation.preguntar_openai", return_value="Borrador para revisión")
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


    def test_storage_no_confunde_id_medico_con_paciente(self):
        self.assertEqual(self.request(ArchivoListaCrearView, self.medico).status_code, 403)
        self.assertEqual(self.request(ArchivoUrlView, self.medico, pk=1).status_code, 403)


    @patch("chatbot.views.guardar_archivo_usuario")
    @patch("chatbot.views.analizar_imagen_medica", return_value="Análisis paciente")
    @patch("chatbot.ai.doctor_conversation.preguntar_openai", return_value="Análisis médico")
    def test_imagenes_conservan_flujo_paciente_y_aislan_medico(self, gemini, analizar_paciente, guardar):
        self.seleccionar(self.paciente)
        buffer = BytesIO()
        Image.new("RGB", (2, 2)).save(buffer, format="PNG")
        png = buffer.getvalue()
        for actor, chat, categoria, usuario_id in (
            (self.medico, self.chat, f"general/bymax/medicos/{self.medico.id}", None),
            (self.paciente, Chat.objects.create(id_usuario=self.paciente), "general/bymax", self.paciente.id),
        ):
            archivo = Archivo.objects.create(usuario_id=usuario_id, nombre_original="test.png",
                storage_key=f"{categoria}/{chat.id}/test.png", tamano=8, tipo="imagen", categoria=categoria)
            guardar.return_value = archivo
            request = self.factory.post("/api/chatbot/", {"mensaje": "Analiza esta imagen",
                "imagen": SimpleUploadedFile("test.png", png, content_type="image/png")}, format="multipart")
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
        self.assertTrue(gemini.call_args.args[0][-1]["parts"][-1]["image_bytes"].startswith(b"\x89PNG"))

    def test_rechazo_de_herramienta_se_registra_como_fallo(self):
        respuesta = ToolManager.ejecutar("seleccionar_paciente", self.chat, "Seleccionar", {"paciente_id": self.ajeno.id})
        self.assertFalse(respuesta["success"])
        self.assertFalse(ToolLog.objects.get().correcto)

    @patch("chatbot.ai.doctor_conversation.preguntar_openai")
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

    @patch("chatbot.ai.doctor_conversation.preguntar_openai",return_value="Análisis clínico general", )
    def test_consulta_clinica_sin_paciente_activo(self, gemini):
        mensaje = "Analiza este caso clínico con los datos proporcionados"
        respuesta = ConversationManager.procesar(self.chat, mensaje)
        streaming = ConversationManager.procesar(self.chat,mensaje,streaming=True,)
        self.assertEqual(respuesta, "Análisis clínico general")
        self.assertTrue(streaming["stream"])
        contenido = str(streaming["contents"])
        self.assertIn("paciente activo", contenido)
        self.assertIn("No afirmes haber consultado", contenido)
        self.assertFalse(ToolLog.objects.exists())
        gemini.assert_called_once()

    @patch("chatbot.ai.doctor_conversation.preguntar_openai")
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
                self.assertEqual(set(cita), {"id_cita", "codigo_cita", "fecha_programada", "estado", "atrasada", "paciente"})
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

    def test_reprogramacion_medica_pide_confirmacion_y_conserva_contexto(self):
        self.seleccionar(self.paciente)
        self.chat.refresh_from_db()
        sesion_clinica = dict(self.chat.contexto_temporal["clinico"])
        cita = Cita.objects.filter(
            id_medico=self.medico,
            id_usuario=self.paciente,
        ).first()
        nueva_fecha = timezone.localtime() + timedelta(days=5)
        mensaje = (
            f"Reprograma la cita #{cita.codigo_cita} para el "
            f"{nueva_fecha.strftime('%Y-%m-%d %H:%M')}"
        )

        respuesta = ConversationManager.procesar(self.chat, mensaje)

        self.assertTrue(respuesta["requires_confirmation"])
        self.chat.refresh_from_db()
        self.assertEqual(
            self.chat.contexto_temporal["clinico"],
            sesion_clinica,
        )
        self.assertEqual(
            self.chat.contexto_temporal["operacion_medica"]["estado"],
            "confirmacion",
        )

    @patch("chatbot.services.cita_service.CitaService.reprogramar_medico")
    def test_confirmacion_medica_ejecuta_una_vez(self, reprogramar):
        reprogramar.return_value = ({"id": 1}, 200)
        cita = Cita.objects.filter(id_medico=self.medico).first()
        nueva_fecha = timezone.localtime() + timedelta(days=5)
        ConversationManager.procesar(
            self.chat,
            f"Reprograma la cita #{cita.codigo_cita} para el "
            f"{nueva_fecha.strftime('%Y-%m-%d %H:%M')}",
        )

        respuesta = ConversationManager.procesar(self.chat, "Sí")

        self.assertTrue(respuesta["success"])
        reprogramar.assert_called_once()
        self.chat.refresh_from_db()
        self.assertNotIn("operacion_medica", self.chat.contexto_temporal)

        # Una confirmación repetida no puede volver a ejecutar la escritura.
        ConversationManager.procesar(self.chat, "Sí")
        reprogramar.assert_called_once()

    def test_medico_no_reprograma_cita_ajena(self):

        # Obtener una cita perteneciente a otro médico.
        cita_ajena = Cita.objects.filter(
            id_medico=self.otro
        ).first()

        self.assertIsNotNone(cita_ajena)

        fecha_original = cita_ajena.fecha_programada

        self.assertNotEqual(
            cita_ajena.id_medico_id,
            self.medico.id,
        )

        nueva_fecha = timezone.localtime() + timedelta(days=5)

        # Intentar reprogramar utilizando el código público
        # de una cita perteneciente a otro médico.
        respuesta = self.tool(
            "reprogramar_cita_medico",
            {
                "codigo_cita": cita_ajena.codigo_cita,
                "fecha": nueva_fecha.isoformat(),
            },
        )

        # No debe solicitar más datos ni permitir confirmar.
        self.assertFalse(
            respuesta.get("requires_input", False),
            respuesta,
        )

        self.assertFalse(
            respuesta.get("requires_confirmation", False),
            respuesta,
        )

        # La operación debe rechazarse.
        self.assertFalse(
            respuesta["success"],
            respuesta,
        )

        # La cita ajena debe permanecer intacta.
        cita_ajena.refresh_from_db()

        self.assertEqual(
            cita_ajena.fecha_programada,
            fecha_original,
        )

    def test_paciente_no_ejecuta_reprogramacion_medica(self):
        chat_paciente = Chat.objects.create(id_usuario=self.paciente)
        respuesta = ejecutar_tool(
            "reprogramar_cita_medico",
            chat_paciente,
            "Reprogramar",
            {
                "id_cita": 1,
                "fecha": (timezone.now() + timedelta(days=2)).isoformat(),
            },
        )
        self.assertFalse(respuesta["success"])

    def test_cancelacion_medica_codigo_motivo_y_confirmacion(self):
        cita = Cita.objects.filter(
            id_medico=self.medico,
            id_usuario=self.paciente,
        ).first()
        codigo = cita.codigo_cita
        motivo = "No podré atender esta consulta por motivos personales."
        # 1. El médico solicita cancelar mediante código.
        respuesta = ConversationManager.procesar(
            self.chat,
            f"Cancela la cita {codigo}",
        )
        self.assertIsInstance(respuesta, dict)
        self.assertTrue(respuesta.get("requires_input"), respuesta)
        self.assertIn("motivo", respuesta["message"].lower())
        cita.refresh_from_db()
        self.assertEqual(cita.id_estado.nombre.lower(), "confirmada")
        # 2. El médico proporciona el motivo.
        respuesta = ConversationManager.procesar(
            self.chat,
            motivo,
        )
        self.assertIsInstance(respuesta, dict)
        self.assertTrue(respuesta.get("requires_confirmation"), respuesta)
        self.assertIn(codigo, respuesta["message"])
        self.assertIn(motivo, respuesta["message"])

        # El motivo debe conservarse en la operación pendiente.
        self.chat.refresh_from_db()
        operacion = self.chat.contexto_temporal["operacion_medica"]
        self.assertEqual(
            operacion["parametros"]["motivo_cancelacion"],
            motivo,
        )

        # 3. Todavía no se debe haber cancelado.
        cita.refresh_from_db()
        self.assertEqual(cita.id_estado.nombre.lower(), "confirmada")
        # 4. El médico confirma.
        respuesta = ConversationManager.procesar(
            self.chat,
            "Sí",
        )
        self.assertIsInstance(respuesta, dict)
        self.assertTrue(respuesta.get("success"), respuesta)
        # 5. Verificar la base de datos.
        cita.refresh_from_db()
        self.assertEqual(cita.id_estado.nombre.lower(), "cancelada")
        self.assertEqual(cita.cancelada_por, "medico")
        self.assertEqual(cita.motivo_cancelacion, motivo)
        # La operación pendiente debe desaparecer.
        self.chat.refresh_from_db()
        self.assertNotIn(
            "operacion_medica",
            self.chat.contexto_temporal,
        )

    def test_cancelacion_medica_rechazada_no_modifica_cita(self):
        cita = Cita.objects.filter(
            id_medico=self.medico,
            id_usuario=self.paciente,
        ).first()
        ConversationManager.procesar(
            self.chat,
            f"Cancela la cita {cita.codigo_cita}",
        )
        ConversationManager.procesar(
            self.chat,
            "Tengo un inconveniente con mi horario.",
        )
        # El médico rechaza la operación.
        ConversationManager.procesar(self.chat, "No")
        cita.refresh_from_db()
        self.assertEqual(
            cita.id_estado.nombre.lower(),
            "confirmada",
        )

        self.assertIsNone(cita.motivo_cancelacion)
        self.chat.refresh_from_db()
        self.assertNotIn(
            "operacion_medica",
            self.chat.contexto_temporal,
        )

    def test_cancelacion_medica_rechaza_codigo_ajeno(self):
        cita_ajena = Cita.objects.filter(
            id_medico=self.otro,
            id_usuario=self.ajeno,
        ).first()
        respuesta = self.tool(
            "cancelar_cita_medico",
            {
                "codigo_cita": cita_ajena.codigo_cita,
                "motivo_cancelacion": "No podré atender la consulta.",
            },
        )

        self.assertFalse(respuesta["success"])
        cita_ajena.refresh_from_db()
        self.assertEqual(
            cita_ajena.id_estado.nombre.lower(),
            "confirmada",
        )

    def test_cancelacion_medica_no_permite_confirmacion_directa(self):
        cita = Cita.objects.filter(
            id_medico=self.medico,
            id_usuario=self.paciente,
        ).first()
        # Intento de saltarse la confirmación conversacional.
        respuesta = self.tool(
            "cancelar_cita_medico",
            {
                "codigo_cita": cita.codigo_cita,
                "motivo_cancelacion": "No podré atender la consulta.",
                "confirmado": True,
            },
        )
        self.assertFalse(respuesta["success"])
        cita.refresh_from_db()
        self.assertEqual(
            cita.id_estado.nombre.lower(),
            "confirmada",
        )

    def test_bymax_paciente_cancela_codigo_con_motivo(self):
        cita = Cita.objects.filter(
            id_usuario=self.paciente,
            id_medico=self.medico,
        ).first()

        chat = Chat.objects.create(id_usuario=self.paciente)
        herramienta = CancelarCitaTool()

        motivo = "No podré asistir por motivos laborales."

        parametros = {
            "codigo_cita": cita.codigo_cita,
            "motivo_cancelacion": motivo,
        }

        # Solicitar confirmación sin cancelar todavía.
        previa = herramienta.execute(chat, "Cancelar", parametros)

        self.assertTrue(previa["requires_confirmation"])
        self.assertIn(cita.codigo_cita, previa["message"])
        self.assertIn(motivo, previa["message"])

        cita.refresh_from_db()
        self.assertEqual(cita.id_estado.nombre.lower(), "confirmada")

        # Simular el contexto de confirmación de ByMax.
        ConversationFlow.iniciar(chat, "confirmar:cancelar_cita")
        ConversationFlow.guardar(chat, previa["data"])

        decision = FlowManager.continuar(chat, "Sí")

        self.assertEqual(decision.tool_name, "cancelar_cita")

        respuesta = herramienta.execute(
            chat,
            "Sí",
            decision.parametros,
        )

        self.assertTrue(respuesta["success"], respuesta)

        cita.refresh_from_db()

        self.assertEqual(cita.id_estado.nombre.lower(), "cancelada")
        self.assertEqual(cita.cancelada_por, "paciente")
        self.assertEqual(cita.motivo_cancelacion, motivo)


    def test_bymax_paciente_rechaza_cancelacion(self):
        cita = Cita.objects.filter(
            id_usuario=self.paciente,
            id_medico=self.medico,
        ).first()

        chat = Chat.objects.create(id_usuario=self.paciente)
        herramienta = CancelarCitaTool()

        previa = herramienta.execute(
            chat,
            "Cancelar",
            {
                "codigo_cita": cita.codigo_cita,
                "motivo_cancelacion": "Tengo un inconveniente personal.",
            },
        )

        self.assertTrue(previa["requires_confirmation"])

        ConversationFlow.iniciar(chat, "confirmar:cancelar_cita")
        ConversationFlow.guardar(chat, previa["data"])

        respuesta = FlowManager.continuar(chat, "No")

        self.assertIsInstance(respuesta, str)

        cita.refresh_from_db()

        self.assertEqual(cita.id_estado.nombre.lower(), "confirmada")
        self.assertIsNone(cita.motivo_cancelacion)
        self.assertEqual(chat.estado_conversacion, "normal")


    def test_bymax_paciente_no_cancela_cita_ajena(self):
        cita_ajena = Cita.objects.filter(
            id_usuario=self.segundo,
            id_medico=self.medico,
        ).first()

        chat = Chat.objects.create(id_usuario=self.paciente)

        respuesta = CancelarCitaTool().execute(
            chat,
            "Cancelar",
            {
                "codigo_cita": cita_ajena.codigo_cita,
                "motivo_cancelacion": "No podré asistir.",
            },
        )

        self.assertFalse(respuesta["success"])

        cita_ajena.refresh_from_db()

        self.assertEqual(
            cita_ajena.id_estado.nombre.lower(),
            "confirmada",
        )

    def test_bymax_paciente_no_permite_confirmacion_directa(self):
        cita = Cita.objects.filter(
            id_usuario=self.paciente,
            id_medico=self.medico,
        ).first()

        estado_original = cita.id_estado.nombre
        motivo_original = cita.motivo_cancelacion
        chat = Chat.objects.create(
            id_usuario=self.paciente
        )

        # Intentamos cancelar sin haber iniciado
        # ninguna confirmación conversacional.
        respuesta = CancelarCitaTool().execute(
            chat,
            "Sí",
            {
                "codigo_cita": cita.codigo_cita,
                "motivo_cancelacion": "No podré asistir.",
                "confirmado": True,
            },
        )

        # La operación debe rechazarse.
        self.assertFalse(
            respuesta["success"],
            respuesta,
        )
        cita.refresh_from_db()
        # La cita debe conservar sus datos originales.
        self.assertEqual(
            cita.id_estado.nombre,
            estado_original,
        )
        self.assertEqual(
            cita.motivo_cancelacion,
            motivo_original,
        )

    def test_bymax_paciente_rechaza_motivo_modificado(self):

        cita = Cita.objects.filter(
            id_usuario=self.paciente,
            id_medico=self.medico,
        ).first()

        chat = Chat.objects.create(id_usuario=self.paciente)
        herramienta = CancelarCitaTool()

        motivo = "No podré asistir por motivos laborales."

        previa = herramienta.execute(chat, "Cancelar", {
            "codigo_cita": cita.codigo_cita,
            "motivo_cancelacion": motivo,
        })

        self.assertTrue(previa["requires_confirmation"])

        ConversationFlow.iniciar(chat, "confirmar:cancelar_cita")
        ConversationFlow.guardar(chat, previa["data"])

        decision = FlowManager.continuar(chat, "Sí")

        # Modificar los parámetros después de la confirmación.
        parametros_alterados = {
            **decision.parametros,
            "motivo_cancelacion": "Un motivo diferente",
        }

        respuesta = herramienta.execute(
            chat, "Sí", parametros_alterados,
        )

        self.assertFalse(respuesta["success"], respuesta)

        cita.refresh_from_db()
        self.assertEqual(cita.id_estado.nombre.lower(), "confirmada")
        self.assertIsNone(cita.motivo_cancelacion)

    def test_bymax_paciente_no_reutiliza_confirmacion(self):

        cita = Cita.objects.filter(
            id_usuario=self.paciente,
            id_medico=self.medico,
        ).first()

        chat = Chat.objects.create(id_usuario=self.paciente)
        herramienta = CancelarCitaTool()

        previa = herramienta.execute(chat, "Cancelar", {
            "codigo_cita": cita.codigo_cita,
            "motivo_cancelacion": "No podré asistir.",
        })

        self.assertTrue(previa["requires_confirmation"])

        ConversationFlow.iniciar(chat, "confirmar:cancelar_cita")
        ConversationFlow.guardar(chat, previa["data"])

        decision = FlowManager.continuar(chat, "Sí")

        # Primera ejecución autorizada.
        primera = herramienta.execute(
            chat, "Sí", decision.parametros,
        )

        self.assertTrue(primera["success"], primera)

        # La autorización debe haberse consumido.
        chat.refresh_from_db()

        self.assertNotIn(
            "_cancelacion_autorizada",
            chat.contexto_temporal,
        )

        # Intentar usar exactamente la misma confirmación.
        segunda = herramienta.execute(
            chat, "Sí", decision.parametros,
        )

        self.assertFalse(segunda["success"], segunda)

        cita.refresh_from_db()
        self.assertEqual(cita.id_estado.nombre.lower(), "cancelada")

    def test_medico_nueva_conversacion_solicita_codigo_antes_del_motivo(self):

        respuesta = ConversationManager.procesar(
            self.chat,
            "bymax, quiero cancelar una cita",
        )

        self.assertIsInstance(respuesta, dict)

        self.assertTrue(
            respuesta.get("requires_input"),
            respuesta,
        )

        self.assertIn(
            "código",
            respuesta["message"].lower(),
        )

        self.assertNotIn(
            "motivo",
            respuesta["message"].lower(),
        )

        self.chat.refresh_from_db()

        operacion = self.chat.contexto_temporal.get(
            "operacion_medica",
            {},
        )

        self.assertEqual(
            operacion.get("estado"),
            "datos",
        )

        self.assertEqual(
            operacion.get("accion"),
            "cancelar_cita_medico",
        )
    def test_medico_reprogramacion_exige_codigo(self):

        cita = Cita.objects.filter(
            id_medico=self.medico,
            id_usuario=self.paciente,
        ).first()

        fecha_original = cita.fecha_programada

        # 1. El médico inicia sin proporcionar código.
        respuesta = ConversationManager.procesar(
            self.chat,
            "Bymax, quiero reprogramar una cita",
        )

        self.assertTrue(
            respuesta.get("requires_input"),
            respuesta,
        )

        self.assertIn(
            "código",
            respuesta["message"].lower(),
        )

        # 2. Proporciona el código solicitado.
        respuesta = ConversationManager.procesar(
            self.chat,
            cita.codigo_cita,
        )

        self.assertTrue(
            respuesta.get("requires_input"),
            respuesta,
        )

        self.assertIn(
            "fecha",
            respuesta["message"].lower(),
        )

        # 3. Proporciona la nueva fecha.
        nueva_fecha = (
            timezone.localtime() + timedelta(days=5)
        ).replace(
            hour=10,
            minute=0,
            second=0,
            microsecond=0,
        )

        respuesta = ConversationManager.procesar(
            self.chat,
            nueva_fecha.strftime("%Y-%m-%d %H:%M"),
        )

        # Ahora debe solicitar confirmación.
        self.assertTrue(
            respuesta.get("requires_confirmation"),
            respuesta,
        )

        self.assertIn(
            cita.codigo_cita,
            respuesta["message"],
        )

        # Comprobar que el código quedó guardado.
        self.chat.refresh_from_db()

        operacion = self.chat.contexto_temporal[
            "operacion_medica"
        ]

        self.assertEqual(
            operacion["parametros"]["codigo_cita"],
            cita.codigo_cita,
        )

        # 4. Rechazamos la reprogramación.
        ConversationManager.procesar(self.chat, "No")

        cita.refresh_from_db()

        # La fecha original debe permanecer intacta.
        self.assertEqual(
            cita.fecha_programada,
            fecha_original,
        )

@override_settings(CACHES=TEST_CACHES, CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
class BymaxApprovalConsumerTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        rol_medico = Rol.objects.create(nombre="medico-ws")
        rol_paciente = Rol.objects.create(nombre="paciente-ws")
        especialidad = Especialidad.objects.create(nombre="Medicina WS")
        self.medico = Medico.objects.create(
            nombre="Médico",
            apellido="WebSocket",
            fecha_nacimiento="1980-01-01",
            correo="medico.websocket@example.test",
            contraseña="hash",
            cedula="medico-websocket",
            telefono="3000000000",
            id_rol=rol_medico,
            id_especialidad=especialidad,
            direccion="Dirección de prueba",
        )
        hoja_vida = Archivo.objects.create(
            medico=self.medico,
            nombre_original="hoja-vida-websocket.pdf",
            storage_key="pruebas/bymax/hoja-vida-websocket.pdf",
            content_type="application/pdf",
            tamano=128,
            tipo="documento",
            categoria="hoja_vida",
        )
        self.solicitud = SolicitudValidacionMedico.objects.create(
            medico=self.medico,
            hoja_vida=hoja_vida,
            estado=SolicitudValidacionMedico.EstadoSolicitud.APROBADO,
        )
        self.chat = Chat.objects.create(id_medico=self.medico)
        self.paciente = Usuario.objects.create(
            nombre="Paciente",
            apellido="WebSocket",
            fecha_nacimiento="1990-01-01",
            estatura=1.70,
            peso=70,
            correo="paciente.websocket@example.test",
            contraseña="hash",
            cedula="paciente-websocket",
            telefono="3000000001",
            id_rol=rol_paciente,
        )
        self.chat_paciente = Chat.objects.create(id_usuario=self.paciente)

    def conectar(self):
        async def ejecutar():
            async def application(scope, receive, send):
                scope = {
                    **scope,
                    "user": self.medico,
                    "url_route": {"kwargs": {"id_chat": self.chat.id}},
                }
                await BymaxConsumer.as_asgi()(scope, receive, send)

            socket = WebsocketCommunicator(
                application,
                f"/ws/chatbot/{self.chat.id}/",
            )
            conectado, codigo = await socket.connect()
            if conectado:
                await socket.receive_json_from()
                await socket.disconnect()
            return conectado, codigo

        return async_to_sync(ejecutar)()

    def test_medico_aprobado_puede_conectarse(self):
        conectado, _ = self.conectar()
        self.assertTrue(conectado)

    def test_paciente_conserva_acceso_al_websocket_de_bymax(self):
        medico_original = self.medico
        chat_original = self.chat
        self.medico = self.paciente
        self.chat = self.chat_paciente
        try:
            conectado, _ = self.conectar()
        finally:
            self.medico = medico_original
            self.chat = chat_original
        self.assertTrue(conectado)

    def test_medicos_no_aprobados_son_rechazados_antes_de_aceptar(self):
        for estado in (
            SolicitudValidacionMedico.EstadoSolicitud.PENDIENTE,
            SolicitudValidacionMedico.EstadoSolicitud.RECHAZADO,
        ):
            with self.subTest(estado=estado):
                self.solicitud.estado = estado
                self.solicitud.save(update_fields=["estado"])
                conectado, codigo = self.conectar()
                self.assertFalse(conectado)
                self.assertEqual(codigo, 4403)

        self.solicitud.delete()
        conectado, codigo = self.conectar()
        self.assertFalse(conectado)
        self.assertEqual(codigo, 4403)

    def test_notificaciones_siguen_disponibles_para_medico_pendiente(self):
        self.solicitud.estado = SolicitudValidacionMedico.EstadoSolicitud.PENDIENTE
        self.solicitud.save(update_fields=["estado"])

        async def ejecutar():
            async def application(scope, receive, send):
                scope = {**scope, "user": self.medico}
                await NotificacionConsumer.as_asgi()(scope, receive, send)

            socket = WebsocketCommunicator(application, "/ws/notificaciones/")
            conectado, _ = await socket.connect()
            if conectado:
                mensaje = await socket.receive_json_from()
                await socket.disconnect()
                return mensaje
            return None

        mensaje = async_to_sync(ejecutar)()
        self.assertIsNotNone(mensaje)
        self.assertEqual(mensaje["type"], "count_initial")

@override_settings(CACHES=TEST_CACHES, CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
class BymaxMedicoWebSocketTests(TransactionTestCase):
    """WebSocket usa otra conexión de BD; requiere datos confirmados."""

    cita = BymaxMedicoTests.cita

    def setUp(self):
        type(self).setUpTestData()
        BymaxMedicoTests.setUp(self)

    @classmethod
    def setUpTestData(cls):
        BymaxMedicoTests.setUpTestData.__func__(cls)

    def test_websocket_busca_por_tipo_de_actor(self):
        consumer = BymaxConsumer()
        consumer.id_chat = self.chat.id
        self.assertIsNone(async_to_sync(consumer._obtener_chat)(self.paciente))
        self.assertIsNone(async_to_sync(consumer._obtener_chat)(self.otro))
        self.assertEqual(async_to_sync(consumer._obtener_chat)(self.medico).id, self.chat.id)

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

