from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.core.cache import cache
from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIRequestFactory, force_authenticate

from chatbot.serializers import CrearMensajeSerializer
from chatbot.ai.flow_manager import FlowManager
from chatbot.ai.router_decision import RouterDecision
from chatbot.ai.tool_manager import ToolManager
from chatbot.models import Chat, ToolLog
from catalogos.models import Rol
from users.models import Usuario
from chatbot.tools.citas import (
    AgendarCitaTool,
    ConsultarDisponibilidadTool,
)
from chatbot.tools.medicos import BuscarMedicoTool


class CrearMensajeSerializerTests(SimpleTestCase):

    def test_es_bot_no_es_un_campo_aceptado(self):
        serializer = CrearMensajeSerializer(
            data={"contenido": "Hola", "es_bot": True}
        )

        self.assertTrue(serializer.is_valid())
        self.assertNotIn("es_bot", serializer.validated_data)


class ConsultarDisponibilidadToolTests(SimpleTestCase):

    @patch("chatbot.tools.citas.CitaService.obtener_proximas")
    def test_consulta_citas_desde_cita_service(self, obtener_proximas):
        citas = MagicMock()
        citas.exists.return_value = False
        obtener_proximas.return_value = citas
        chat = SimpleNamespace(id_usuario=object())

        resultado = ConsultarDisponibilidadTool().execute(
            chat=chat,
            mensaje="Muéstrame mis citas",
            parametros={},
        )

        obtener_proximas.assert_called_once_with(chat.id_usuario)
        self.assertTrue(resultado["success"])
        self.assertEqual(resultado["data"]["citas"], [])


class BuscarMedicoToolTests(SimpleTestCase):

    @patch("chatbot.tools.medicos.MedicoService.buscar_medicos")
    def test_envia_todos_los_filtros_al_servicio(self, buscar_medicos):
        medicos = MagicMock()
        medicos.exists.return_value = False
        buscar_medicos.return_value = medicos
        parametros = {
            "nombre": "Ana",
            "apellido": "Pérez",
            "especialidad": "Pediatría",
            "ciudad": "Bogotá",
        }

        BuscarMedicoTool().execute(
            chat=SimpleNamespace(id_usuario=object()),
            mensaje="Busca a Ana Pérez",
            parametros=parametros,
        )

        buscar_medicos.assert_called_once_with(**parametros)


class ToolManagerPrivacyTests(SimpleTestCase):

    @patch("chatbot.ai.tool_manager.ToolLog.objects.create")
    @patch("chatbot.ai.tool_manager.ToolManager._localizar")
    @patch("chatbot.ai.tool_manager.ejecutar_tool")
    def test_toollog_guarda_solo_metadatos_de_respuesta_clinica(
        self,
        ejecutar,
        localizar,
        crear_log,
    ):
        secreto = "Diagnóstico privado con observación sensible"
        respuesta = {
            "success": True,
            "message": "Historial clínico encontrado.",
            "data": {
                "historial": [
                    {
                        "diagnostico": secreto,
                        "observaciones": "Dato clínico completo",
                    }
                ]
            },
        }
        ejecutar.return_value = respuesta
        localizar.return_value = respuesta

        resultado = ToolManager.ejecutar(
            nombre_tool="consultar_historial",
            chat=SimpleNamespace(id_usuario=object()),
            mensaje="Muéstrame mi historial",
            parametros={
                "limite": 5,
                "diagnostico": secreto,
                "token": "credencial-privada",
            },
        )

        self.assertEqual(resultado, respuesta)
        datos_log = crear_log.call_args.kwargs
        self.assertEqual(
            datos_log["parametros"],
            {"claves_permitidas": ["limite"], "cantidad": 3},
        )
        self.assertEqual(
            datos_log["respuesta"],
            {
                "tipo": "dict",
                "correcto": True,
                "requiere_confirmacion": False,
                "requiere_seleccion": False,
            },
        )
        contenido_log = str(datos_log)
        self.assertNotIn(secreto, contenido_log)
        self.assertNotIn("Dato clínico completo", contenido_log)
        self.assertNotIn("credencial-privada", contenido_log)

    @patch("chatbot.ai.tool_manager.ToolLog.objects.create")
    @patch("chatbot.ai.tool_manager.ejecutar_tool")
    def test_toollog_no_guarda_mensaje_de_excepcion(self, ejecutar, crear_log):
        secreto = "token=secreto diagnóstico=privado"
        ejecutar.side_effect = RuntimeError(secreto)

        with self.assertRaises(RuntimeError):
            ToolManager.ejecutar(
                nombre_tool="consultar_historial",
                chat=SimpleNamespace(id_usuario=object()),
                mensaje="Consulta privada",
                parametros={"limite": 5},
            )

        datos_log = crear_log.call_args.kwargs
        self.assertEqual(
            datos_log["respuesta"],
            {"tipo": "error", "error_tipo": "RuntimeError"},
        )
        self.assertNotIn(secreto, str(datos_log))

    @patch("chatbot.ai.tool_manager.ToolLog.objects.create")
    @patch("chatbot.ai.tool_manager.ToolManager._localizar")
    @patch("chatbot.ai.tool_manager.ejecutar_tool")
    def test_fallo_del_log_no_expone_payload_ni_interrumpe_la_tool(
        self,
        ejecutar,
        localizar,
        crear_log,
    ):
        secreto = "credencial-y-diagnóstico-secreto"
        respuesta = {"success": True, "message": "Resultado", "data": {}}
        ejecutar.return_value = respuesta
        localizar.return_value = respuesta
        crear_log.side_effect = RuntimeError(secreto)

        with self.assertLogs("chatbot.ai.tool_manager", level="ERROR") as logs:
            resultado = ToolManager.ejecutar(
                nombre_tool="consultar_historial",
                chat=SimpleNamespace(id_usuario=object()),
                mensaje="Consulta privada",
                parametros={"limite": 5},
            )

        self.assertEqual(resultado, respuesta)
        self.assertNotIn(secreto, "\n".join(logs.output))
        self.assertIn("RuntimeError", "\n".join(logs.output))


class ToolManagerPrivacyPersistenceTests(TestCase):

    @classmethod
    def setUpTestData(cls):
        rol = Rol.objects.create(nombre="paciente")
        cls.usuario = Usuario.objects.create(
            nombre="Paciente",
            apellido="Auditoria",
            fecha_nacimiento="1990-01-01",
            estatura=1.70,
            peso=70,
            correo="patient.audit@example.com",
            contraseña="hash",
            cedula="audit-patient-1",
            telefono="3000000010",
            id_rol=rol,
        )

    @patch("chatbot.ai.tool_manager.ToolManager._localizar")
    @patch("chatbot.ai.tool_manager.ejecutar_tool")
    def test_toollog_persistido_no_contiene_payload_clinico_ni_credenciales(
        self,
        ejecutar,
        localizar,
    ):
        secreto = "diagnostico-privado-de-prueba"
        credencial = "token-ficticio-no-persistible"
        respuesta = {
            "success": True,
            "message": "Historial encontrado",
            "data": {
                "historial": [
                    {
                        "diagnostico_general": secreto,
                        "observaciones": "observacion clinica ficticia",
                    }
                ]
            },
        }
        ejecutar.return_value = respuesta
        localizar.return_value = respuesta

        resultado = ToolManager.ejecutar(
            nombre_tool="consultar_historial",
            chat=SimpleNamespace(id_usuario=self.usuario),
            mensaje="Consulta clinica ficticia",
            parametros={
                "limite": 5,
                "diagnostico": secreto,
                "token": credencial,
            },
        )

        self.assertEqual(resultado, respuesta)
        registro = ToolLog.objects.get(usuario=self.usuario)
        self.assertEqual(registro.nombre_tool, "consultar_historial")
        self.assertEqual(
            registro.parametros,
            {"claves_permitidas": ["limite"], "cantidad": 3},
        )
        self.assertEqual(
            registro.respuesta,
            {
                "tipo": "dict",
                "correcto": True,
                "requiere_confirmacion": False,
                "requiere_seleccion": False,
            },
        )
        contenido_persistido = f"{registro.parametros} {registro.respuesta}"
        self.assertNotIn(secreto, contenido_persistido)
        self.assertNotIn(credencial, contenido_persistido)
        self.assertNotIn("observacion clinica ficticia", contenido_persistido)


@override_settings(
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "bymax-throttle-tests",
        },
    },
)
class BymaxThrottleTests(SimpleTestCase):

    def setUp(self):
        cache.clear()
        self.factory = APIRequestFactory()
        self.usuario = SimpleNamespace(is_authenticated=True, pk=501, id=501)

    @patch("chatbot.views.Chat.objects.get", side_effect=Chat.DoesNotExist)
    def test_bymax_permite_uso_normal_y_limita_exceso(self, obtener_chat):
        from chatbot.views import ChatbotResponderView

        respuestas = []
        for _ in range(31):
            request = self.factory.post(
                "/api/chatbot/1/responder/",
                {"mensaje": "Consulta"},
                format="json",
            )
            force_authenticate(request, user=self.usuario)
            respuestas.append(ChatbotResponderView.as_view()(request, id_chat=1))

        self.assertTrue(all(
            respuesta.status_code == 404
            for respuesta in respuestas[:30]
        ))
        self.assertEqual(respuestas[-1].status_code, 429)
        self.assertIn("Retry-After", respuestas[-1].headers)
        self.assertIn("no-store", respuestas[-1].headers["Cache-Control"])
        self.assertEqual(obtener_chat.call_count, 30)


class IntencionesDeterministasTests(SimpleTestCase):

    def test_hola_se_reconoce_como_saludo(self):
        from chatbot.ai.filters import es_saludo

        self.assertTrue(es_saludo("¡Hola!"))
        self.assertTrue(es_saludo("Buenos días"))

    def test_listado_de_medicos_se_reconoce_sin_gemini(self):
        from chatbot.ai.filters import solicita_buscar_medicos

        self.assertTrue(
            solicita_buscar_medicos("Muéstrame todos los médicos disponibles")
        )

    @patch("chatbot.ai.router.client.models.generate_content")
    def test_router_no_consulta_gemini_para_listar_medicos(
        self,
        generate_content,
    ):
        from chatbot.ai.router import procesar_mensaje

        decision = procesar_mensaje(
            [],
            "Muéstrame todos los médicos disponibles",
        )

        self.assertEqual(decision.tool_name, "buscar_medico")
        generate_content.assert_not_called()

    def test_cancelar_detiene_un_flujo_activo(self):
        from chatbot.ai.flow_manager import FlowManager

        chat = MagicMock(estado_conversacion="agendar_cita")

        with patch(
            "chatbot.ai.flow_manager.ConversationFlow.finalizar"
        ) as finalizar:
            resultado = FlowManager.continuar(chat, "olvídalo")

        finalizar.assert_called_once_with(chat)
        self.assertIn("Cancelé", resultado)


class MedicoServiceTests(SimpleTestCase):

    def test_tolera_segundo_nombre_apellido_compuesto_y_error_menor(self):
        from chatbot.services.medico_service import MedicoService

        medico = SimpleNamespace(
            nombre="Edilma Ines",
            apellido="Echeverri Espinoza",
        )

        seleccionado = MedicoService._seleccionar_candidato(
            "Edilma",
            "Echeverry",
            [medico],
        )

        self.assertIs(seleccionado, medico)

    def test_rechaza_dos_resultados_ambiguos(self):
        from chatbot.services.medico_service import MedicoService

        candidatos = [
            SimpleNamespace(nombre="Ana María", apellido="Pérez López"),
            SimpleNamespace(nombre="Ana", apellido="Pérez Gómez"),
        ]

        seleccionado = MedicoService._seleccionar_candidato(
            "Ana",
            "Pérez",
            candidatos,
        )

        self.assertIsNone(seleccionado)

    def test_normalizacion_ayuda_con_errores_de_escritura(self):
        from chatbot.services.medico_service import MedicoService

        puntuacion = __import__("difflib").SequenceMatcher(
            None,
            MedicoService._normalizar("sirujano"),
            MedicoService._normalizar("Cirujano"),
        ).ratio()

        self.assertGreaterEqual(puntuacion, 0.72)


class ConfirmacionTests(SimpleTestCase):

    @patch("chatbot.ai.flow_manager.ConversationFlow")
    def test_confirmacion_reconstruye_la_operacion(self, conversation_flow):
        chat = SimpleNamespace(estado_conversacion="confirmar:cancelar_cita")
        conversation_flow.obtener.return_value = {"id_cita": 15}

        decision = FlowManager.continuar(chat, "sí")

        self.assertIsInstance(decision, RouterDecision)
        self.assertEqual(decision.tool_name, "cancelar_cita")
        self.assertEqual(
            decision.parametros,
            {"id_cita": 15, "confirmado": True},
        )
        conversation_flow.finalizar.assert_called_once_with(chat)

    @patch("chatbot.ai.flow_manager.ConversationFlow")
    def test_seleccion_de_medico_conserva_la_fecha(self, conversation_flow):
        chat = SimpleNamespace(
            estado_conversacion="seleccionar_medico:agendar_cita"
        )
        conversation_flow.obtener.return_value = {
            "fecha": "2030-08-24T11:00:00-05:00",
            "medicos": [
                {"id_medico": 2, "nombre": "Edilma Ines Echeverri Espinoza"},
                {"id_medico": 5, "nombre": "Ana Pérez"},
            ],
        }

        decision = FlowManager.continuar(chat, "1")

        self.assertEqual(decision.tool_name, "agendar_cita")
        self.assertEqual(decision.parametros["id_medico"], 2)
        self.assertEqual(
            decision.parametros["fecha"],
            "2030-08-24T11:00:00-05:00",
        )


class ExtraccionDatosCitaTests(SimpleTestCase):

    def test_fecha_natural_en_espanol(self):
        from chatbot.services.cita_service import CitaService

        fecha = CitaService.normalizar_fecha(
            "el día 24 de agosto de 2030 a las 11 am"
        )

        self.assertIsNotNone(fecha)
        self.assertEqual(
            (fecha.year, fecha.month, fecha.day, fecha.hour, fecha.minute),
            (2030, 8, 24, 11, 0),
        )

    def test_fecha_tolera_error_menor_en_mes(self):
        from chatbot.services.cita_service import CitaService

        fecha = CitaService.normalizar_fecha(
            "24 de agsto de 2030 a las 11 de la mañana"
        )

        self.assertIsNotNone(fecha)
        self.assertEqual((fecha.month, fecha.day, fecha.hour), (8, 24, 11))

    def test_flujo_no_pregunta_datos_que_ya_fueron_extraidos(self):
        from chatbot.ai.flow_definition import FLOWS

        paso = FlowManager._primer_paso_faltante(
            FLOWS["agendar_cita"],
            {
                "especialidad": "Cirujano",
                "fecha": "2030-08-24 11:00",
            },
        )

        self.assertIsNone(paso)

    @patch("chatbot.ai.flow_manager.ConversationFlow")
    def test_respuesta_negativa_no_ejecuta_la_operacion(self, conversation_flow):
        chat = SimpleNamespace(estado_conversacion="confirmar:agendar_cita")

        resultado = FlowManager.continuar(chat, "no")

        self.assertIsInstance(resultado, str)
        conversation_flow.finalizar.assert_called_once_with(chat)


class AgendarCitaToolTests(SimpleTestCase):

    @patch("chatbot.tools.citas.CitaService.agendar")
    @patch("chatbot.tools.citas.CitaService.medico_tiene_cita", return_value=False)
    @patch("chatbot.tools.citas.MedicoService.obtener_por_id")
    @patch("chatbot.tools.citas.CitaService.normalizar_fecha")
    def test_solicita_confirmacion_antes_de_crear(
        self,
        normalizar_fecha,
        obtener_medico,
        _medico_tiene_cita,
        agendar,
    ):
        from django.utils import timezone

        normalizar_fecha.return_value = timezone.now() + timedelta(days=1)
        obtener_medico.return_value = SimpleNamespace(
            id=8,
            nombre="Ana",
            apellido="Pérez",
        )

        resultado = AgendarCitaTool().execute(
            chat=SimpleNamespace(id_usuario=SimpleNamespace(id=3)),
            mensaje="Agenda la cita",
            parametros={"id_medico": 8, "fecha": "2026-09-01 10:00"},
        )

        self.assertTrue(resultado["requires_confirmation"])
        agendar.assert_not_called()


class RouterTests(SimpleTestCase):

    @patch("chatbot.ai.router.client.models.generate_content")
    def test_router_recibe_el_historial_para_preguntas_de_seguimiento(
        self,
        generate_content,
    ):
        from chatbot.ai.router import procesar_mensaje

        generate_content.return_value = SimpleNamespace(
            text=(
                '{"accion":"tool","tool":"agendar_cita",'
                '"parametros":{"nombre":"Edilma",'
                '"apellido":"Echeverry",'
                '"fecha":"2026-08-24 10:00"}}'
            )
        )
        historial = [
            {
                "role": "user",
                "parts": [{"text": "Quiero una cita con Edilma Echeverry"}],
            },
            {
                "role": "user",
                "parts": [{"text": "¿Está disponible?"}],
            },
        ]

        decision = procesar_mensaje(historial, "¿Está disponible?")

        self.assertTrue(decision.usa_tool)
        self.assertEqual(decision.tool_name, "agendar_cita")
        self.assertEqual(
            generate_content.call_args.kwargs["contents"],
            historial,
        )

    @patch("chatbot.ai.router.client.models.generate_content")
    def test_error_del_proveedor_no_produce_error_500(self, generate_content):
        from chatbot.ai.router import procesar_mensaje

        generate_content.side_effect = RuntimeError("Proveedor no disponible")

        decision = procesar_mensaje([], "Hola Bymax")

        self.assertFalse(decision.usa_tool)
        self.assertIn("intenta nuevamente", decision.respuesta)


class RespuestaApiTests(SimpleTestCase):

    def test_resultado_de_tool_separa_texto_y_datos(self):
        from chatbot.views import normalizar_respuesta_bymax

        texto, resultado = normalizar_respuesta_bymax(
            {
                "success": True,
                "message": "Encontré disponibilidad.",
                "data": {"id_medico": 8},
            }
        )

        self.assertEqual(texto, "Encontré disponibilidad.")
        self.assertEqual(
            resultado,
            {
                "success": True,
                "data": {"id_medico": 8},
                "requires_confirmation": False,
                "requires_selection": False,
            },
        )


class MemoriaBymaxTests(SimpleTestCase):

    def test_detecta_solicitud_para_ver_memoria(self):
        from chatbot.ai.filters import solicita_ver_memoria

        self.assertTrue(solicita_ver_memoria("¿Qué recuerdas de mí?"))

    def test_detecta_solicitud_para_borrar_memoria(self):
        from chatbot.ai.filters import solicita_borrar_memoria

        self.assertTrue(
            solicita_borrar_memoria("Olvida todo lo que sabes de mí")
        )

    def test_solo_procesa_mensajes_con_datos_duraderos(self):
        from chatbot.ai.memory_extractor import es_candidato_memoria

        self.assertTrue(es_candidato_memoria("Soy alérgico a la penicilina"))
        self.assertFalse(es_candidato_memoria("¿Qué hora es?"))

    @patch("chatbot.ai.context_manager.guardar_contexto")
    @patch("chatbot.ai.context_manager.obtener_contexto")
    def test_memoria_fusiona_listas_sin_perder_datos(
        self,
        obtener_contexto,
        guardar_contexto,
    ):
        from chatbot.ai.context_manager import actualizar_contexto

        obtener_contexto.return_value = {
            "salud_declarada": {"alergias": ["penicilina"]}
        }
        chat = object()

        actualizar_contexto(
            chat,
            {"salud_declarada": {"alergias": ["ibuprofeno"]}},
        )

        contexto_guardado = guardar_contexto.call_args.args[1]
        self.assertEqual(
            contexto_guardado["salud_declarada"]["alergias"],
            ["penicilina", "ibuprofeno"],
        )


class PerfilUsuarioBymaxTests(SimpleTestCase):

    def setUp(self):
        self.usuario = SimpleNamespace(
            nombre="Kleyder",
            apellido="Gómez",
            fecha_nacimiento=__import__("datetime").date(2000, 5, 12),
            ciudad=SimpleNamespace(nombre="Bello"),
            correo="kleyder@example.com",
            telefono="3000000000",
        )

    def test_responde_nombre_desde_usuario_autenticado(self):
        from chatbot.services.perfil_usuario_service import PerfilUsuarioService

        respuesta = PerfilUsuarioService.responder_nombre(self.usuario)

        self.assertEqual(respuesta, "Tu nombre registrado es Kleyder Gómez.")

    def test_responde_fecha_nacimiento_desde_perfil(self):
        from chatbot.services.perfil_usuario_service import PerfilUsuarioService

        respuesta = PerfilUsuarioService.responder_fecha_nacimiento(self.usuario)

        self.assertIn("12/05/2000", respuesta)

    def test_contexto_de_gemini_excluye_datos_sensibles(self):
        from chatbot.services.perfil_usuario_service import PerfilUsuarioService

        contexto = PerfilUsuarioService.contexto_minimo_para_ia(self.usuario)

        self.assertEqual(
            contexto,
            {"nombre": "Kleyder Gómez", "ciudad": "Bello"},
        )
        self.assertNotIn("correo", contexto)
        self.assertNotIn("telefono", contexto)

    def test_detecta_pregunta_sobre_nombre(self):
        from chatbot.ai.filters import solicita_nombre_usuario

        self.assertTrue(solicita_nombre_usuario("¿Sabes cuál es mi nombre?"))

    def test_nombre_se_responde_en_ingles(self):
        from chatbot.services.perfil_usuario_service import PerfilUsuarioService

        respuesta = PerfilUsuarioService.responder_nombre(self.usuario, "en")
        self.assertEqual(respuesta, "Your registered name is Kleyder Gómez.")

    def test_perfil_incluye_datos_registrados(self):
        from chatbot.services.perfil_usuario_service import PerfilUsuarioService

        respuesta = PerfilUsuarioService.describir_perfil(self.usuario, "es")
        self.assertIn("Fecha de nacimiento: 12/05/2000", respuesta)
        self.assertIn("Correo: kleyder@example.com", respuesta)
        self.assertIn("Teléfono: 3000000000", respuesta)

    @patch("chatbot.services.perfil_usuario_service.timezone.localdate")
    def test_calcula_edad_desde_fecha_nacimiento(self, localdate):
        from datetime import date
        from chatbot.services.perfil_usuario_service import PerfilUsuarioService

        localdate.return_value = date(2026, 8, 17)
        respuesta = PerfilUsuarioService.responder_edad(self.usuario, "es")
        self.assertIn("26 años", respuesta)

    def test_detecta_idioma_griego_y_listado_de_medicos(self):
        from chatbot.ai.filters import solicita_buscar_medicos
        from chatbot.ai.language import LanguageService

        mensaje = "Μπορείτε να μου δείξετε όλους τους διαθέσιμους γιατρούς;"
        self.assertEqual(LanguageService.detectar(mensaje), "el")
        self.assertTrue(solicita_buscar_medicos(mensaje))

    def test_detecta_pregunta_sobre_edad(self):
        from chatbot.ai.filters import solicita_edad_usuario

        self.assertTrue(solicita_edad_usuario("¿Cuál es mi edad?"))


class IdiomaUniversalBymaxTests(SimpleTestCase):

    @patch("chatbot.ai.language.client.models.generate_content")
    def test_gemini_traduce_respuesta_a_frances(self, generate_content):
        from chatbot.ai.language import LanguageService

        generate_content.return_value = SimpleNamespace(
            text="Votre nom enregistré est [[VALOR_0]]."
        )
        respuesta = LanguageService.adaptar(
            "Tu nombre registrado es Kleider.",
            "Quel est mon nom ?",
            ["Kleider"],
        )

        self.assertEqual(respuesta, "Votre nom enregistré est Kleider.")

    @patch("chatbot.ai.language.client.models.generate_content")
    def test_datos_privados_no_se_envian_a_gemini(self, generate_content):
        from chatbot.ai.language import LanguageService

        generate_content.return_value = SimpleNamespace(
            text="E-mail : [[VALOR_0]]"
        )
        LanguageService.adaptar(
            "- Correo: privado@example.com",
            "Montrez-moi mon profil",
            ["privado@example.com"],
        )

        prompt = generate_content.call_args.kwargs["contents"]
        self.assertNotIn("privado@example.com", prompt)
        self.assertIn("[[VALOR_0]]", prompt)

    def test_router_diferencia_perfil_de_historia_clinica(self):
        from chatbot.ai.router import PROMPT_ROUTER

        self.assertIn("Esto NO es el historial clínico", PROMPT_ROUTER)
        self.assertIn("nombre_edad", PROMPT_ROUTER)


class ImagenMedicaBymaxTests(SimpleTestCase):

    def test_rechaza_imagen_mayor_a_ocho_mb(self):
        from chatbot.services.imagen_medica_service import validar_imagen_medica

        archivo = SimpleNamespace(
            size=8 * 1024 * 1024 + 1,
            content_type="image/jpeg",
        )
        self.assertIn("8 MB", validar_imagen_medica(archivo))

    def test_rechaza_formato_no_permitido(self):
        from chatbot.services.imagen_medica_service import validar_imagen_medica

        archivo = SimpleNamespace(size=100, content_type="image/svg+xml")
        self.assertIn("JPG", validar_imagen_medica(archivo))

    def test_acepta_jpeg_valido(self):
        from chatbot.services.imagen_medica_service import validar_imagen_medica

        archivo = SimpleNamespace(size=100, content_type="image/jpeg")
        self.assertIsNone(validar_imagen_medica(archivo))
