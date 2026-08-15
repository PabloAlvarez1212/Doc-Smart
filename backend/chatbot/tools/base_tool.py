from abc import ABC, abstractmethod


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