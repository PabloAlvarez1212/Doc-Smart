import re
import unicodedata


PALABRAS_APP = [

    "cita",
    "doctor",
    "médico",
    "especialidad",
    "historia clínica",
    "paciente",
    "eps",
    "ips",
    "receta",
    "fórmula",
    "consulta",
    "agenda",
    "recordatorio",

]


def limpiar_mensaje(texto):
    """
    Normaliza el mensaje antes de enviarlo a la IA.
    """

    if not texto:
        return ""

    texto = texto.strip()

    texto = re.sub(r"\s+", " ", texto)

    return texto


def normalizar_intencion(texto):
    texto = limpiar_mensaje(texto).lower()
    texto = unicodedata.normalize("NFKD", texto)
    texto = "".join(
        caracter
        for caracter in texto
        if not unicodedata.combining(caracter)
    )
    return re.sub(r"[^a-z0-9\s]", "", texto).strip()


def es_saludo(texto):
    return normalizar_intencion(texto) in {
        "hola",
        "buenas",
        "buenos dias",
        "buenas tardes",
        "buenas noches",
        "hola bymax",
        "bymax",
    }


def solicita_buscar_medicos(texto):
    original = limpiar_mensaje(texto).lower()
    if "γιατρ" in original and any(x in original for x in ("όλους", "διαθέσιμ", "δείξε")):
        return True
    texto = normalizar_intencion(texto)

    menciona_medicos = any(
        palabra in texto.split()
        for palabra in {"medico", "medicos", "doctor", "doctores", "doctors", "physicians"}
    )
    solicita_listado = any(
        expresion in texto
        for expresion in {
            "muestra",
            "muestrame",
            "listar",
            "lista",
            "buscar",
            "busca",
            "disponibles",
            "todos",
            "show",
            "all",
            "available",
        }
    )

    return menciona_medicos and solicita_listado


def solicita_cancelar_flujo(texto):
    return normalizar_intencion(texto) in {
        "cancelar",
        "cancela",
        "salir",
        "detener",
        "olvidalo",
    }


def solicita_ver_memoria(texto):
    if "ξέρεις για μένα" in limpiar_mensaje(texto).lower():
        return True
    texto = normalizar_intencion(texto)
    return any(
        expresion in texto
        for expresion in {
            "que recuerdas de mi",
            "que sabes de mi",
            "muestrame mi memoria",
            "show me what you remember",
            "what do you remember about me",
        }
    )


def solicita_borrar_memoria(texto):
    texto = normalizar_intencion(texto)
    return any(
        expresion in texto
        for expresion in {
            "olvida todo lo que sabes de mi",
            "borra todo lo que recuerdas de mi",
            "elimina mi memoria",
            "forget everything about me",
            "delete my memory",
        }
    )


def solicita_nombre_usuario(texto):
    texto = normalizar_intencion(texto)
    return any(
        expresion in texto
        for expresion in {
            "cual es mi nombre",
            "sabes cual es mi nombre",
            "como me llamo",
            "dime mi nombre",
            "what is my name",
        }
    )


def solicita_fecha_nacimiento(texto):
    texto = normalizar_intencion(texto)
    return any(
        expresion in texto
        for expresion in {
            "cual es mi fecha de nacimiento",
            "cuando cumplo anos",
            "cuando es mi cumpleanos",
            "cuando naci",
            "what is my birthday",
            "when was i born",
        }
    )


def solicita_edad_usuario(texto):
    original = limpiar_mensaje(texto).lower()
    if "ηλικία" in original:
        return True
    texto = normalizar_intencion(texto)
    return any(expresion in texto for expresion in {
        "mi edad", "cuantos anos tengo", "que edad tengo",
        "my age", "how old am i",
    })


def solicita_datos_perfil(texto):
    texto = normalizar_intencion(texto)
    return any(
        expresion in texto
        for expresion in {
            "muestrame mis datos",
            "cuales son mis datos",
            "mis datos personales",
            "muestrame mi perfil",
            "show me my profile",
        }
    )


def es_pregunta_medica(texto):
    """
    Determina si el mensaje pertenece al dominio médico.
    """

    texto = limpiar_mensaje(texto).lower()

    return any(
        palabra in texto
        for palabra in PALABRAS_APP
    )


def contiene_prompt_injection(texto):
    """
    Detecta intentos simples de Prompt Injection.
    """

    texto = texto.lower()

    patrones = [

        "ignore previous instructions",
        "ignore all instructions",
        "system prompt",
        "developer message",
        "eres chatgpt",
        "actúa como",
        "actua como",

    ]

    return any(
        patron in texto
        for patron in patrones
    )
