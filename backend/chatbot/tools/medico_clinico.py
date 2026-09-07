"""Herramientas de lectura clínica; el actor procede siempre del chat autenticado."""
from uuid import uuid4
from django.db import transaction
from django.db.models.functions import Lower, Trim
from django.utils import timezone

from chatbot.models import Chat
from chatbot.tools.base_tool import BaseTool
from citas.models import Cita
from historial_medico.models import HistorialClinico
from users.models import Usuario


ESTADOS_PROXIMOS = ("pendiente", "confirmada", "reprogramada")


def resultado(message, data=None, success=True):
    return {"success": success, "message": message, "data": data or {}}


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
        if not getattr(chat, "id_medico_id", None):
            return resultado("Esta herramienta requiere una cuenta médica.", success=False)
        citas = (
            Cita.objects.filter(id_medico_id=chat.id_medico_id, fecha_programada__gte=timezone.now())
            .annotate(estado_normalizado=Lower(Trim("id_estado__nombre")))
            .filter(estado_normalizado__in=ESTADOS_PROXIMOS)
            .select_related("id_usuario", "id_estado")
            .only("id", "fecha_programada", "id_medico_id", "id_usuario__id",
                  "id_usuario__nombre", "id_usuario__apellido", "id_estado__nombre")
            .order_by("fecha_programada", "id")
        )
        datos = [{
            "id_cita": cita.id,
            "fecha_programada": timezone.localtime(cita.fecha_programada).isoformat(),
            "estado": cita.estado_normalizado,
            "paciente": {"id": cita.id_usuario_id, "nombre": str(cita.id_usuario)},
        } for cita in citas]
        return resultado(
            "Estas son tus próximas citas. Selecciona un paciente para estudiar su caso."
            if datos else "No tienes citas próximas pendientes, confirmadas o reprogramadas.",
            {"citas": datos},
        )


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
            actual = Chat.objects.select_for_update().get(pk=chat.pk)
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
            actual = Chat.objects.select_for_update().get(pk=chat.pk)
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
