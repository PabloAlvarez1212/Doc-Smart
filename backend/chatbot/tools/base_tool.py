from abc import ABC, abstractmethod
from django.db import transaction
from django.utils import timezone
from chatbot.models import Chat


class BaseTool(ABC):
    """
    Clase base para todas las herramientas de Bymax.
    """

    name = ""

    description = ""

    category = ""

    requires_authentication = True

    requires_confirmation = False

    enabled = True

    @staticmethod
    @transaction.atomic
    def consumir_confirmacion(chat, esperados, clave='_operacion_autorizada'):
        """Consume la autorización temporal guardada por el flujo tras un Sí explícito."""
        if not isinstance(chat, Chat) or not chat.pk:
            return False
        actual = Chat.objects.select_for_update().filter(
            pk=chat.pk, id_usuario_id=chat.id_usuario_id,
            id_medico_id=chat.id_medico_id, estado='activo',
        ).first()
        if actual is None:
            return False
        contexto = dict(actual.contexto_temporal or {})
        autorizacion = contexto.pop(clave, None)
        actual.contexto_temporal = contexto
        actual.save(update_fields=['contexto_temporal'])
        chat.contexto_temporal = contexto
        return (isinstance(autorizacion, dict)
                and all(autorizacion.get(campo) == valor for campo, valor in esperados.items())
                and isinstance(autorizacion.get('expira_en'), (int, float))
                and timezone.now().timestamp() <= autorizacion['expira_en'])

    @abstractmethod
    def execute(
        self,
        chat,
        mensaje,
        parametros,
    ):
        """
        Ejecuta la herramienta.
        """
        pass
