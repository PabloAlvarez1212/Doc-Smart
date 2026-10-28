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
    texto = normalizar_intencion(texto)
    return texto in {
        "cancelar",
        "cancela",
        "salir",
        "detener",
        "olvidalo",
        "dejalo",
        "dejalo asi",
        "dejemoslo",
        "mejor no",
        "mejor no olvidalo",
        "ya no quiero",
    } or bool(re.fullmatch(
        r"(mejor no|ya no quiero|ya no necesito)( agendar| la cita| una cita)?( olvidalo)?",
        texto,
    ))


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


_NOMBRES_PROFESIONAL = (
    r"medic[oa]s?|doctor[ae]?s?|especialistas?|medicina general|"
    r"pediatra|cardiologo|dermatologo|ginecologo"
)


def solicita_buscar_profesional(texto):
    """Pide localizar médicos registrados; no implica crear una cita."""
    texto = normalizar_intencion(texto)
    return bool(re.search(
        r"\b(busca\w*|encuentra\w*|consigue\w*|muestra\w*|recomienda\w*|"
        r"necesito|quiero|quisiera|hay|mira si hay|dame|listame|lista)\b"
        r".{0,60}\b(" + _NOMBRES_PROFESIONAL + r")\b",
        texto,
    ))


def pregunta_disponibilidad(texto):
    texto = normalizar_intencion(texto)
    return bool(re.search(
        r"\b(disponible|disponibles|disponibilidad|libre|libres|atiende|atienden)\b|"
        r"\bhay (algun|alguna|un|una)\b",
        texto,
    ))


def es_consulta_estado(texto):
    """Seguimiento sobre una operación en curso: «¿ya conseguiste el médico?»."""
    texto = normalizar_intencion(texto)
    return bool(re.search(
        r"\b(ya|todavia|aun)\b.{0,25}\b(conseguiste|encontraste|buscaste|hallaste|"
        r"revisaste|viste|tienes|hay)\b|"
        r"\b(que paso|como vas|como va|alguna novedad|algun resultado)\b",
        texto,
    ))


def _sin_tildes(texto):
    texto = unicodedata.normalize("NFKD", limpiar_mensaje(texto).lower())
    return "".join(c for c in texto if not unicodedata.combining(c))


def _numeros_a_digitos(texto):
    """«a las tres» → «a las 3» (el texto ya viene sin tildes y en minúsculas)."""
    numeros = {"una": 1, "uno": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6, "siete": 7,
               "ocho": 8, "nueve": 9, "diez": 10, "once": 11, "doce": 12}
    for palabra, valor in numeros.items():
        texto = re.sub(rf"\ba las {palabra}\b", f"a las {valor}", texto)
    return texto


def parece_cambio_fecha(texto):
    """Mensaje que modifica la fecha u hora, no un motivo de consulta."""
    # Conserva «:» y «.» para reconocer horas como 15:00 o 10 a.m.
    texto = _numeros_a_digitos(
        re.sub(r"a\.\s?m\.?", "am", re.sub(r"p\.\s?m\.?", "pm", _sin_tildes(texto)))
    )
    if re.search(
        r"\b(mejor|prefiero|cambia\w*|pasa\w*|reprograma\w*)\b.{0,40}"
        r"\b(hora|fecha|dia|manana|hoy|lunes|martes|miercoles|jueves|viernes|"
        r"sabado|domingo|a las \d{1,2}|\d{1,2} ?(am|pm))\b",
        texto,
    ):
        return True
    horas = r"\ba las \d{1,2}\b|\b\d{1,2}(:\d{2}| ?(am|pm))\b"
    return len(texto.split()) <= 8 and bool(re.search(horas, texto))


def parece_cambio_busqueda(texto):
    texto = normalizar_intencion(texto)
    return bool(re.search(
        r"\b(otro|otra|cambia\w*|prefiero)\b.{0,30}"
        r"\b(medico|doctor|doctora|especialidad|ciudad|especialista)\b",
        texto,
    ))


def senales_alarma(texto):
    """Síntomas que exigen atención urgente en lugar de una cita futura."""
    texto = normalizar_intencion(texto)
    return bool(re.search(
        r"dolor (fuerte |intenso )?(de|en el) pecho|dificultad (para|al) respirar|"
        r"no puedo respirar|falta de aire|me desmay|perdi el conocimiento|"
        r"perdida de (la )?conciencia|convulsi|sangrado abundante|"
        r"no puedo (mover|hablar)|paralisis|quiero morir|quitarme la vida|"
        r"suicid|hacerme dano|autolesion",
        texto,
    ))


def preferencia_memoria(texto):
    """False si pide no recordar, True si pide volver a hacerlo, None si no aplica."""
    texto = normalizar_intencion(texto)
    if re.search(
        r"\b(no|deja de|desactiva\w*)\b.{0,20}\b(guardes|recuerdes|guardar|recordar|memoria)\b.{0,25}"
        r"\b(mi|mis|informacion|datos|memoria)\b|\bdesactiva\w* (mi )?memoria\b",
        texto,
    ):
        return False
    if re.search(r"\b(activa\w*|reactiva\w*)\b.{0,15}\bmemoria\b|"
                 r"\bpuedes (recordar|guardar) (mi|mis)\b", texto):
        return True
    return None


_RELLENO_OLVIDAR = {
    "que", "tomo", "tengo", "soy", "alergico", "alergica", "a", "la", "el", "los",
    "las", "mi", "mis", "de", "memoria", "lo", "sobre", "del", "una", "un",
}


def dato_a_olvidar(texto):
    """Término que el usuario pide borrar de su memoria («olvida que tomo X»)."""
    texto = normalizar_intencion(texto)
    if not re.match(r"(olvida|elimina|borra|quita)\w*\b", texto):
        return None
    if "memoria" not in texto and not re.match(r"olvida\w*\s+que\b", texto):
        return None
    restantes = [
        palabra for palabra in texto.split()[1:] if palabra not in _RELLENO_OLVIDAR
    ]
    return " ".join(restantes) or None


# --- Promesas sin ejecución -------------------------------------------------
_PROMESA = re.compile(
    r"\b(voy a|vamos a|estoy|dejame|permiteme|ya te|enseguida|en seguida|ahora mismo)\b"
    r".{0,25}\b(busc\w*|consult\w*|revis\w*|verific\w*|agend\w*)\b|"
    r"\b(un momento|un momentito|dame un momento|espera un momento)\b|"
    r"\b(ya|tu cita)\b.{0,15}\b(quedo|queda|fue|esta|agende)\b.{0,12}\b(agendad\w*|reservad\w*|creada)\b",
)


def es_promesa_sin_ejecucion(frase):
    """«Voy a buscar», «un momento» o «ya quedó agendada» sin herramienta detrás."""
    return bool(_PROMESA.search(_sin_tildes(frase)))


class FiltroPromesas:
    """Filtra, frase a frase, las promesas de trabajo que el modelo no ejecutó.

    Retiene la frase en curso hasta ver su final, de modo que el texto fluye
    por frases completas y las promesas nunca llegan al usuario.
    """

    FIN_DE_FRASE = re.compile(r"(?<=[.!?\n])\s+")

    def __init__(self):
        self.pendiente = ""
        self.prometio = False

    def _emitir(self, frase):
        if frase.strip() and es_promesa_sin_ejecucion(frase):
            self.prometio = True
            return None
        return frase

    def alimentar(self, fragmento):
        self.pendiente += fragmento
        partes = self.FIN_DE_FRASE.split(self.pendiente)
        self.pendiente = partes.pop()
        espacio = " " if len(partes) else ""
        salida = [self._emitir(parte) for parte in partes]
        return [parte + espacio for parte in salida if parte]

    def cerrar(self):
        restante, self.pendiente = self.pendiente, ""
        frase = self._emitir(restante)
        return [frase] if frase else []

    @classmethod
    def limpiar(cls, texto):
        filtro = cls()
        partes = filtro.alimentar(texto) + filtro.cerrar()
        return "".join(partes).strip(), filtro.prometio


# --- Referencias a resultados y horas ----------------------------------------
_ORDINALES = {
    "primero": 0, "primera": 0, "1ro": 0, "1ra": 0,
    "segundo": 1, "segunda": 1, "2do": 1, "2da": 1,
    "tercero": 2, "tercera": 2, "3ro": 2, "3ra": 2,
    "cuarto": 3, "cuarta": 3, "quinto": 4, "quinta": 4,
    "ultimo": -1, "ultima": -1,
}


def referencia_resultado(texto):
    """Índice (0, 1, …, -1), «unico» para «ese médico», o None si no hay referencia."""
    texto = _sin_tildes(texto)
    for palabra, indice in _ORDINALES.items():
        if re.search(rf"\b(el|la|con el|con la|opcion|numero)\s+{palabra}\b", texto):
            return indice
    if re.search(r"\b(ese|esa|aquel|aquella)\s+(medico|medica|doctor|doctora|especialista)\b|"
                 r"\bcon (el|ella)\b|\bcon (ese|esa)\b", texto):
        return "unico"
    return None


def solicita_agendar_referencia(texto):
    texto = _sin_tildes(texto)
    return bool(re.search(r"\b(agend\w*|reserv\w*|program\w*|solicit\w*|quiero|prefiero|elijo|escojo|dame)\b", texto))


def referencia_cita_misma(texto):
    return bool(re.search(r"\b(la misma cita|esa cita|esa misma|la cita anterior|la ultima cita)\b", _sin_tildes(texto)))


def referencia_horario_anterior(texto):
    return bool(re.search(
        r"\b(horario|hora|fecha)\s+(anterior|de antes)\b|\bel anterior\b|\bla de antes\b|\bvolvamos al\b.{0,15}\banterior\b",
        _sin_tildes(texto)))


_NUMEROS = {"una": 1, "uno": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6, "siete": 7,
            "ocho": 8, "nueve": 9, "diez": 10, "once": 11, "doce": 12}


def extraer_hora(texto):
    """(hora24, minuto) de «a las tres de la tarde», «a las 15:00», «10 a.m.».

    Devuelve ("ambigua", hora12) si falta am/pm, o None si no hay hora.
    """
    t = re.sub(r"a\.\s?m\.?", "am", re.sub(r"p\.\s?m\.?", "pm", _sin_tildes(texto)))
    for palabra, valor in _NUMEROS.items():
        t = re.sub(rf"\ba las {palabra}\b", f"a las {valor}", t)
    m = re.search(r"\b(?:a las\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|de la manana|de la tarde|de la noche)?\b", t)
    if not m or not (re.search(r"\ba las\b", t) or m.group(2) or m.group(3)):
        return None
    hora, minuto, periodo = int(m.group(1)), int(m.group(2) or 0), m.group(3)
    if minuto > 59 or hora > 23:
        return None
    if periodo is None:
        # Supuesto: de 7 a 12 sin am/pm se entiende como mañana (jornada
        # médica); de 1 a 6 es ambiguo y se pregunta.
        return ("ambigua", hora, minuto) if 1 <= hora <= 6 else (hora, minuto)
    pm = periodo in ("pm", "de la tarde", "de la noche")
    if not 1 <= hora <= 12:
        return None
    if pm and hora != 12:
        hora += 12
    elif not pm and hora == 12:
        hora = 0
    return hora, minuto


def marca_antecedente_resuelto(texto):
    """Término del antecedente que el usuario dice haber superado («ya sané de mi fractura»)."""
    t = normalizar_intencion(texto)
    m = re.search(r"\bya (?:me )?(?:sane|recupere|cure|mejore|supere) de (?:mi |la |el |una |un )?(?P<x>.+)", t) or \
        re.search(r"\b(?:mi|la|el) (?P<x>.+?) ya (?:sano|esta curad[oa]|se curo|esta resuelt[oa]|paso|se recupero)\b", t)
    return m.group("x").strip() if m else None
