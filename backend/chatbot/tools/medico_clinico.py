"""Herramientas médicas; el actor procede siempre del chat autenticado."""
from uuid import uuid4
from datetime import datetime, time, timedelta
import unicodedata
from difflib import SequenceMatcher
from django.db import transaction
from django.db.models import Q
from django.db.models.functions import Lower, Trim
from django.utils import timezone

from chatbot.models import Chat
from chatbot.services.cita_service import CitaService
from chatbot.tools.base_tool import BaseTool
from citas.models import Cita
from historial_medico.models import HistorialClinico
from medicos.models import Medico
from users.models import Usuario


ESTADOS_PROXIMOS = ("pendiente", "confirmada", "reprogramada")
ALCANCES_AGENDA = ("proximas", "pendientes", "hoy", "siguiente", "atrasadas")


def filtros_agenda(parametros):
    """Solo enums operativos: también es la lista permitida para auditoría."""
    parametros = parametros if isinstance(parametros, dict) else {}
    alcance = parametros.get("alcance", "proximas")
    estado = parametros.get("estado")
    if alcance not in ALCANCES_AGENDA or (estado is not None and estado not in ESTADOS_PROXIMOS):
        raise ValueError("Filtros de agenda no válidos")
    return {"alcance": alcance, **({"estado": estado} if estado else {})}


def resultado(message, data=None, success=True):
    return {"success": success, "message": message, "data": data or {}}


def _normalizar_nombre(valor):
    texto = unicodedata.normalize("NFD", str(valor or "").casefold())
    return " ".join(
        "".join(c for c in texto if unicodedata.category(c) != "Mn").split()
    )


def coincide_nombre(busqueda, nombre):
    partes = _normalizar_nombre(busqueda).split()
    palabras = _normalizar_nombre(nombre).split()
    return bool(partes) and all(any(parte == palabra or SequenceMatcher(None, parte, palabra).ratio() >= .8
                                   for palabra in palabras) for parte in partes)


def paciente_autorizado(chat, paciente_id):
    if not chat.id_medico_id or not paciente_id:
        return None
    # La relación asistencial procede de las citas del propio médico.
    vinculados = Cita.objects.filter(id_medico_id=chat.id_medico_id).values("id_usuario_id")
    return Usuario.objects.filter(pk=paciente_id, pk__in=vinculados).first()


def contexto_activo(chat):
    contexto = chat.contexto_temporal.get("clinico", {})
    paciente = paciente_autorizado(chat, contexto.get("paciente_id"))
    return {"id": paciente.id, "nombre": str(paciente)} if paciente else None


class BuscarProximosPacientesTool(BaseTool):
    name = "buscar_proximos_pacientes"
    category = "medico_clinico"

    def execute(self, chat, mensaje, parametros):
        if not isinstance(chat, Chat) or not chat.pk or not chat.id_medico_id or chat.id_usuario_id:
            return resultado("Esta herramienta requiere una cuenta médica.", success=False)
        # Verifica el modelo y la relación persistida, no un ID enviado por el cliente.
        # Medico no tiene campo activo: la autenticación existente valida existencia.
        medico = Medico.objects.only("id").filter(
            pk=chat.id_medico_id, chats_bymax__pk=chat.pk,
            chats_bymax__id_usuario__isnull=True,
            chats_bymax__estado="activo",
        ).first()
        if not isinstance(medico, Medico) or not medico.is_authenticated:
            return resultado("Médico no disponible para esta conversación.", success=False)
        try:
            filtros = filtros_agenda(parametros)
        except ValueError:
            return resultado("Filtros de agenda no válidos.", success=False)
        alcance = filtros["alcance"]
        ahora = timezone.now()
        zona = timezone.get_default_timezone()
        citas = (
            Cita.objects.filter(id_medico=medico)
            .annotate(estado_normalizado=Lower(Trim("id_estado__nombre")))
            .filter(estado_normalizado__in=ESTADOS_PROXIMOS)
            .select_related("id_usuario", "id_estado")
            .only("id", "fecha_programada", "id_medico_id", "id_usuario__id",
                  "id_usuario__nombre", "id_usuario__apellido", "id_estado__nombre")
            .order_by("fecha_programada", "id")
        )
        if alcance in ("proximas", "siguiente"):
            citas = citas.filter(fecha_programada__gte=ahora)
        elif alcance == "atrasadas":
            citas = citas.filter(fecha_programada__lt=ahora)
        elif alcance == "hoy":
            hoy = timezone.localtime(ahora, zona).date()
            inicio = timezone.make_aware(datetime.combine(hoy, time.min), zona)
            fin = timezone.make_aware(datetime.combine(hoy + timedelta(days=1), time.min), zona)
            citas = citas.filter(fecha_programada__gte=inicio, fecha_programada__lt=fin)
        if filtros.get("estado"):
            citas = citas.filter(estado_normalizado=filtros["estado"])
        if alcance == "siguiente":
            citas = citas[:1]
        datos = [{
            "id_cita": cita.id,
            "fecha_programada": timezone.localtime(cita.fecha_programada, zona).isoformat(),
            "estado": cita.estado_normalizado,
            "atrasada": cita.fecha_programada < ahora,
            "paciente": {"id": cita.id_usuario_id, "nombre": str(cita.id_usuario)},
        } for cita in citas]
        descripcion = {"proximas": "próximas", "pendientes": "pendientes por completar",
                       "hoy": "para hoy", "siguiente": "próximas", "atrasadas": "atrasadas"}[alcance]
        if filtros.get("estado"):
            descripcion += f" (estado: {filtros['estado']})"
        if not datos:
            return resultado(f"No tienes citas {descripcion}.", {"citas": []})
        lineas = [f"Encontré {len(datos)} cita(s) {descripcion}:"]
        for indice, cita in enumerate(datos, 1):
            fecha = datetime.fromisoformat(cita["fecha_programada"]).strftime("%d/%m/%Y, %H:%M")
            lineas.append(
                f"\n{indice}. {cita['paciente']['nombre']} (paciente #{cita['paciente']['id']})\n"
                f"Cita: #{cita['id_cita']}\n"
                f"Fecha: {fecha}\nEstado: {cita['estado']}\n"
                f"Situación: {'atrasada' if cita['atrasada'] else 'programada'}"
            )
        lineas.append("\nPuedes seleccionar un paciente para revisar su caso.")
        return resultado("\n".join(lineas), {"citas": datos})


class ReprogramarCitaMedicoTool(BaseTool):
    name = "reprogramar_cita_medico"
    accion = "reprogramar"
    category = "medico_operativo"
    requires_confirmation = True

    def _opciones(self, citas):
        zona = timezone.get_default_timezone()
        return [{
            "id_cita": cita.id,
            "fecha_programada": timezone.localtime(
                cita.fecha_programada, zona
            ).isoformat(),
            "estado": cita.id_estado.nombre,
            "paciente": {
                "id": cita.id_usuario_id,
                "nombre": str(cita.id_usuario),
            },
        } for cita in citas]

    def execute(self, chat, mensaje, parametros):
        if not isinstance(chat, Chat) or not chat.pk or not chat.id_medico_id or chat.id_usuario_id:
            return resultado("Esta herramienta requiere una cuenta médica.", success=False)

        medico = Medico.objects.only("id").filter(
            pk=chat.id_medico_id,
            chats_bymax__pk=chat.pk,
            chats_bymax__id_usuario__isnull=True,
            chats_bymax__estado="activo",
        ).first()
        if not isinstance(medico, Medico) or not medico.is_authenticated:
            return resultado("Médico no disponible para esta conversación.", success=False)

        parametros = parametros if isinstance(parametros, dict) else {}
        fecha = CitaService.normalizar_fecha(
            parametros.get("fecha") or parametros.get("fecha_programada")
        )
        id_cita = parametros.get("id_cita")
        paciente_id = parametros.get("paciente_id")
        paciente_nombre = _normalizar_nombre(parametros.get("paciente_nombre"))

        citas = CitaService.obtener_citas_medico_modificables(medico.id)
        if id_cita:
            try:
                citas = citas.filter(id=int(id_cita))
            except (TypeError, ValueError):
                return resultado("El número de la cita no es válido.", success=False)
        elif paciente_id:
            try:
                citas = citas.filter(id_usuario_id=int(paciente_id))
            except (TypeError, ValueError):
                return resultado("El paciente seleccionado no es válido.", success=False)
        elif paciente_nombre:
            citas = [cita for cita in citas if coincide_nombre(paciente_nombre, str(cita.id_usuario))]
        else:
            paciente = contexto_activo(chat)
            if paciente:
                citas = citas.filter(id_usuario_id=paciente["id"])
                paciente_id = paciente["id"]
            else:
                citas = list(citas[:3])
                if not citas:
                    return resultado(
                        f"No tienes citas pendientes que puedas {self.accion}.",
                        success=False,
                    )
                if len(citas) != 1:
                    return {
                        "success": True,
                        "requires_input": True,
                        "message": f"Indícame el nombre del paciente o el número de la cita que deseas {self.accion}.",
                        "data": {
                            "accion": self.name,
                            **({"fecha": fecha.isoformat()} if fecha else {}),
                        },
                    }

        citas = list(citas[:11]) if hasattr(citas, "filter") else citas[:11]
        if not citas:
            return resultado("No encontré una cita modificable con esos datos.", success=False)

        if len(citas) > 1:
            opciones = self._opciones(citas[:10])
            lineas = [f"Encontré varias citas. Indica el número de la cita que deseas {self.accion}:"]
            for opcion in opciones:
                fecha_actual = datetime.fromisoformat(
                    opcion["fecha_programada"]
                ).strftime("%d/%m/%Y a las %H:%M")
                lineas.append(
                    f"{opcion['id_cita']}. {opcion['paciente']['nombre']} — {fecha_actual}"
                )
            return {
                "success": True,
                "requires_input": True,
                "requires_selection": True,
                "message": "\n".join(lineas),
                "data": {
                    "accion": self.name,
                    "citas": opciones,
                    **({"fecha": fecha.isoformat()} if fecha else {}),
                },
            }

        cita = citas[0]
        if fecha is None and self.accion == "reprogramar":
            return {
                "success": True,
                "requires_input": True,
                "message": (
                    f"¿Para qué nueva fecha y hora deseas reprogramar la cita "
                    f"#{cita.id} con {cita.id_usuario}?"
                ),
                "data": {
                    "accion": self.name,
                    "id_cita": cita.id,
                },
            }

        if self.accion == "reprogramar" and fecha <= timezone.now():
            return resultado("La nueva fecha debe estar en el futuro.", success=False)

        if self.accion == "reprogramar" and CitaService.medico_tiene_cita(
            medico.id, fecha, excluir_cita_id=cita.id,
        ):
            return resultado("Ya tienes otra cita programada en esa fecha y hora.", success=False)

        if not parametros.get("confirmado", False):
            fecha_actual = timezone.localtime(cita.fecha_programada).strftime(
                "%d/%m/%Y a las %H:%M"
            )
            fecha_nueva = timezone.localtime(fecha).strftime(
                "%d/%m/%Y a las %H:%M"
            ) if fecha else None
            return {
                "success": True,
                "requires_confirmation": True,
                "message": (
                    f"Encontré la cita #{cita.id} con {cita.id_usuario}.\n"
                    f"Fecha actual: {fecha_actual}.\n"
                    + (f"Nueva fecha: {fecha_nueva}.\n" if fecha_nueva else "")
                    + f"¿Confirmas que deseas {self.accion} esta cita?"
                ),
                "data": {
                    "accion": self.name,
                    "id_cita": cita.id,
                    **({"fecha": fecha.isoformat()} if fecha else {}),
                    "estado_original": cita.id_estado.nombre.strip().casefold(),
                    "fecha_original": cita.fecha_programada.isoformat(),
                },
            }

        operacion = chat.contexto_temporal.get("operacion_medica", {})
        autorizados = operacion.get("parametros", {})
        if (operacion.get("estado") != "confirmacion" or operacion.get("accion") != self.name
                or autorizados.get("id_cita") != cita.id
                or autorizados.get("fecha") != parametros.get("fecha")):
            return resultado("Debes iniciar la operación y confirmar explícitamente.", success=False)
        respuesta, status = CitaService.operar_medico(
            medico, cita.id, self.accion, fecha, esperado=autorizados,
        )
        if status != 200:
            from chatbot.services.diagnostics import error_operativo
            return error_operativo(chat, self.accion, status)
        return resultado(
            f"Operación completada: {self.accion} la cita #{cita.id}. Se generaron las notificaciones.",
            {"id_cita": cita.id, **({"fecha": fecha.isoformat()} if fecha else {})},
        )


class ConfirmarCitaMedicoTool(ReprogramarCitaMedicoTool):
    name = "confirmar_cita_medico"
    accion = "confirmar"


class CancelarCitaMedicoTool(ReprogramarCitaMedicoTool):
    name = "cancelar_cita_medico"
    accion = "cancelar"


class CompletarCitaMedicoTool(ReprogramarCitaMedicoTool):
    name = "completar_cita_medico"
    accion = "completar"


class BuscarPacientesMedicoTool(BaseTool):
    name = "buscar_pacientes_medico"

    def execute(self, chat, mensaje, parametros):
        if not getattr(chat, "id_medico_id", None):
            return resultado("Esta herramienta requiere una cuenta médica.", success=False)
        vinculados = Cita.objects.filter(id_medico_id=chat.id_medico_id).values("id_usuario_id")
        pacientes = Usuario.objects.filter(pk__in=vinculados).only("id", "nombre", "apellido").order_by("nombre", "id")
        nombre = parametros.get("nombre", "")
        datos = [{"id": p.id, "nombre": str(p)} for p in pacientes if not nombre or coincide_nombre(nombre, str(p))]
        lineas = ["Pacientes vinculados. Selecciona el ID exacto:"]
        lineas += [f"Paciente #{p['id']}: {p['nombre']}" for p in datos]
        return resultado("\n".join(lineas) if datos else "No encontré pacientes vinculados con esos datos.", {"pacientes": datos})


class SeleccionarPacienteTool(BaseTool):
    name = "seleccionar_paciente"
    category = "medico_clinico"

    def execute(self, chat, mensaje, parametros):
        if not getattr(chat, "id_medico_id", None):
            return resultado("Esta herramienta requiere una cuenta médica.", success=False)
        try:
            paciente_id = int(parametros.get("paciente_id"))
        except (TypeError, ValueError):
            return resultado("Selecciona un paciente válido de tus citas.", success=False)
        paciente = paciente_autorizado(chat, paciente_id)
        if not paciente:
            return resultado("Paciente no disponible para tu cuenta.", success=False)
        with transaction.atomic():
            actual = Chat.objects.select_for_update().get(pk=chat.pk, id_medico_id=chat.id_medico_id, id_usuario__isnull=True, estado="activo")
            paciente = paciente_autorizado(actual, paciente_id)
            if not paciente:
                return resultado("Paciente no disponible para tu cuenta.", success=False)
            contexto = dict(actual.contexto_temporal)
            anterior = contexto.get("clinico", {})
            if anterior.get("paciente_id") != paciente.id:
                # No enviar al modelo mensajes de un caso anterior, ni al volver a él.
                limite = actual.mensajes.order_by("-id").values_list("id", flat=True).first() or 0
                contexto["clinico"] = {"paciente_id": paciente.id, "desde_mensaje_id": limite, "sesion_id": uuid4().hex}
                actual.contexto_temporal = contexto
                actual.save(update_fields=["contexto_temporal", "ultima_interaccion"])
            chat.contexto_temporal = contexto
        return resultado(f"Contexto activo: {paciente}. Solo consultaré tus propios historiales de este paciente.",
                         {"paciente_activo": {"id": paciente.id, "nombre": str(paciente)}})


class CerrarContextoPacienteTool(BaseTool):
    name = "cerrar_contexto_paciente"
    category = "medico_clinico"

    def execute(self, chat, mensaje, parametros):
        if not getattr(chat, "id_medico_id", None):
            return resultado("Esta herramienta requiere una cuenta médica.", success=False)
        with transaction.atomic():
            actual = Chat.objects.select_for_update().get(pk=chat.pk, id_medico_id=chat.id_medico_id, id_usuario__isnull=True, estado="activo")
            contexto = dict(actual.contexto_temporal)
            limite = actual.mensajes.order_by("-id").values_list("id", flat=True).first() or 0
            contexto["clinico"] = {"paciente_id": None, "desde_mensaje_id": limite, "sesion_id": uuid4().hex}
            actual.contexto_temporal = contexto
            actual.save(update_fields=["contexto_temporal", "ultima_interaccion"])
            chat.contexto_temporal = contexto
        return resultado("Contexto clínico cerrado. Selecciona otro paciente para continuar con un caso.",
                         {"paciente_activo": None})


class ConsultarHistorialPacienteTool(BaseTool):
    name = "consultar_historial_paciente"
    category = "medico_clinico"

    def execute(self, chat, mensaje, parametros):
        paciente = contexto_activo(chat)
        if not paciente:
            return resultado("Selecciona primero un paciente autorizado.", success=False)
        # Ni parámetros ni instrucciones de Gemini pueden ampliar este alcance.
        historiales = list(HistorialClinico.objects.filter(
            medico_id=chat.id_medico_id, usuario_id=paciente["id"],
        ).order_by("-fecha_creacion", "-id").values(
            "id", "fecha_creacion", "motivo_consulta", "diagnostico_general", "observaciones",
        )[:31])
        truncado = len(historiales) > 30
        for item in historiales:
            item["fecha_creacion"] = item["fecha_creacion"].isoformat()
        return resultado("Registros propios disponibles." if historiales else "No tienes historiales registrados para este paciente.",
                         {"paciente": paciente, "historiales": historiales[:30], "hay_mas": truncado})
