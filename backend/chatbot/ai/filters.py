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
    texto = normalizar_intencion(texto)

    menciona_medicos = any(
        palabra in texto.split()
        for palabra in {"medico", "medicos", "doctor", "doctores"}
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
