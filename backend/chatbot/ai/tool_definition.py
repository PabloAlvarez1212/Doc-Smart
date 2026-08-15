from dataclasses import dataclass
from typing import Callable


@dataclass
class ToolDefinition:

    nombre: str

    descripcion: str

    funcion: Callable

    categoria: str

    requiere_autenticacion: bool = True

    requiere_confirmacion: bool = False

    habilitada: bool = True