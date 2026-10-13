"""Identidad del actor autenticado, independiente de la conversación."""
from medicos.models import Medico


def identidad(actor):
    medico = isinstance(actor, Medico)
    nombre = " ".join(filter(None, (actor.nombre, actor.apellido))).strip()
    especialidad = actor.id_especialidad.nombre if medico and actor.id_especialidad_id else None
    rol = "medico" if medico else actor.id_rol.nombre
    saludo = (f"Hola{', Dr./Dra. ' + nombre if nombre else ''}. Soy Bymax Médico, tu copiloto clínico y operativo"
              + (f" para el área de {especialidad}" if especialidad else "") + ".") if medico else (
                  f"Hola{', ' + nombre if nombre else ''}. Soy Bymax, tu asistente de salud.")
    return {"id": actor.pk, "nombre": nombre, "rol": rol, "especialidad": especialidad,
            "saludo": saludo, "permisos": (["agenda", "pacientes_vinculados", "historial_propio", "citas_con_confirmacion"]
                if medico else ["perfil_propio", "citas_propias", "orientacion"])}
