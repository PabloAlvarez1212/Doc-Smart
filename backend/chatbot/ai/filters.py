import re


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