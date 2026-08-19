import json

from chatbot.models import SesionBymax


CATEGORIAS_MEMORIA = {
    "perfil",
    "preferencias",
    "salud_declarada",
}

CAMPOS_MEMORIA = {
    "perfil": {"nombre_preferido", "idioma", "ciudad"},
    "preferencias": {"estilo_respuesta"},
    "salud_declarada": {
        "alergias",
        "condiciones_cronicas",
        "medicamentos",
    },
}


def obtener_sesion(usuario):
    """
    Obtiene o crea la sesión permanente de Bymax.
    """

    sesion, _ = SesionBymax.objects.get_or_create(
        usuario=usuario
    )

    return sesion


def obtener_contexto(chat):
    """
    Devuelve el contexto almacenado del usuario.
    """

    sesion = obtener_sesion(chat.id_usuario)

    if not sesion.contexto_acumulado:
        return {}

    try:
        return json.loads(
            sesion.contexto_acumulado
        )

    except json.JSONDecodeError:
        return {}


def guardar_contexto(chat, contexto):
    """
    Guarda completamente el contexto.
    """

    sesion = obtener_sesion(chat.id_usuario)

    sesion.contexto_acumulado = json.dumps(
        contexto,
        ensure_ascii=False
    )

    sesion.save(
        update_fields=[
            "contexto_acumulado",
            "ultima_conversacion"
        ]
    )


def actualizar_contexto(chat, nuevos_datos):
    """
    Fusiona el contexto existente con nuevos datos.
    """

    contexto = obtener_contexto(chat)

    for categoria, datos in nuevos_datos.items():
        if categoria not in CATEGORIAS_MEMORIA or not isinstance(datos, dict):
            continue

        destino = contexto.setdefault(categoria, {})

        for campo, valor in datos.items():
            if campo not in CAMPOS_MEMORIA[categoria]:
                continue

            if isinstance(valor, str):
                valor = valor.strip()[:300]
                if valor:
                    destino[campo] = valor
            elif isinstance(valor, list):
                valores = [
                    str(elemento).strip()[:150]
                    for elemento in valor[:20]
                    if str(elemento).strip()
                ]
                if valores:
                    existentes = destino.get(campo, [])
                    if not isinstance(existentes, list):
                        existentes = []
                    destino[campo] = list(
                        dict.fromkeys([*existentes, *valores])
                    )[:20]

    guardar_contexto(
        chat,
        contexto
    )


def limpiar_contexto(chat):
    """
    Elimina toda la memoria del usuario.
    """

    sesion = obtener_sesion(chat.id_usuario)

    sesion.contexto_acumulado = ""

    sesion.save(
        update_fields=[
            "contexto_acumulado"
        ]
    )


def describir_contexto(chat, idioma="es"):
    contexto = obtener_contexto(chat)

    if not contexto:
        return {"en": "I don't have additional conversational information saved about you.", "el": "Δεν έχω αποθηκευμένες πρόσθετες πληροφορίες συνομιλίας για εσάς."}.get(idioma, "No tengo información conversacional adicional guardada sobre ti.")

    etiquetas = {
        "nombre_preferido": "Nombre preferido",
        "idioma": "Idioma",
        "ciudad": "Ciudad",
        "estilo_respuesta": "Estilo de respuesta",
        "alergias": "Alergias declaradas",
        "condiciones_cronicas": "Condiciones declaradas",
        "medicamentos": "Medicamentos declarados",
    }
    lineas = [{"en": "This is what I remember because you mentioned it previously:", "el": "Αυτά θυμάμαι επειδή τα αναφέρατε προηγουμένως:"}.get(idioma, "Esto es lo que recuerdo porque lo mencionaste anteriormente:")]

    for datos in contexto.values():
        if not isinstance(datos, dict):
            continue
        for campo, valor in datos.items():
            etiqueta = etiquetas.get(campo, campo.replace("_", " ").title())
            if isinstance(valor, list):
                valor = ", ".join(valor)
            lineas.append(f"- {etiqueta}: {valor}")

    return "\n".join(lineas)
