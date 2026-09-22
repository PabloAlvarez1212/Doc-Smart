"""Identidad y ánimo por actor autenticado, independientes de la conversación."""
from django.db import transaction
from django.utils import timezone
from medicos.models import Medico
from users.models import Usuario
from chatbot.models import EstadoAnimoDiario


def actor_chat(chat):
    return chat.id_medico if chat.id_medico_id else chat.id_usuario


def filtro_actor(actor):
    if isinstance(actor, Medico):
        return {"medico": actor, "usuario": None, "rol": "medico"}
    if isinstance(actor, Usuario) and actor.id_rol.nombre == "paciente":
        return {"usuario": actor, "medico": None, "rol": "paciente"}
    raise ValueError("Actor no clínico")


def hoy():
    return timezone.localtime(timezone.now(), timezone.get_default_timezone()).date()


def consultar_animo(actor):
    try:
        return EstadoAnimoDiario.objects.filter(**filtro_actor(actor), fecha=hoy()).first()
    except ValueError:
        return None


def preguntar_animo(actor):
    registro, nuevo = EstadoAnimoDiario.objects.get_or_create(**filtro_actor(actor), fecha=hoy())
    return registro, nuevo


@transaction.atomic
def guardar_animo(actor, puntuacion):
    if type(puntuacion) is not int or not 1 <= puntuacion <= 10:
        raise ValueError("Selecciona una puntuación entre 1 y 10.")
    registro, _ = preguntar_animo(actor)
    registro = EstadoAnimoDiario.objects.select_for_update().get(pk=registro.pk)
    if registro.puntuacion is None:
        registro.puntuacion = puntuacion
        registro.respondido_en = timezone.now()
        registro.save(update_fields=["puntuacion", "respondido_en"])
    return registro


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


def tono_chat(chat):
    registro = consultar_animo(actor_chat(chat))
    if not registro or registro.puntuacion is None:
        return ""
    tono = ("empático y cuidadoso; comprueba cómo se encuentra sin deducir riesgo" if registro.puntuacion <= 2 else
            "comprensivo y práctico" if registro.puntuacion <= 4 else
            "neutral y colaborativo" if registro.puntuacion <= 6 else
            "positivo" if registro.puntuacion <= 8 else "enérgico sin exagerar")
    return (f"Adapta moderadamente el tono: {tono}. No menciones la puntuación ni infieras diagnósticos psiquiátricos. "
            "No cambies la precisión clínica ni ocultes alarmas. Ante señales explícitas de autolesión, suicidio "
            "o peligro inmediato, comprueba la seguridad y recomienda ayuda urgente y apoyo cercano. "
            "Nunca deduzcas riesgo únicamente del ánimo.")
