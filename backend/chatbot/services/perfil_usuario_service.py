from datetime import date, datetime
from django.utils import timezone
from chatbot.ai.language import LanguageService


class PerfilUsuarioService:
    """Expone a Bymax únicamente datos seguros del usuario autenticado."""

    @staticmethod
    def _valor(usuario, campo):
        valor = getattr(usuario, campo, None)
        return valor if valor not in (None, "") else None

    @staticmethod
    def _nombre_relacion(valor):
        if valor is None:
            return None
        return getattr(valor, "nombre", None) or str(valor)

    @staticmethod
    def _primero(usuario, *campos):
        for campo in campos:
            valor = PerfilUsuarioService._valor(usuario, campo)
            if valor is not None:
                return valor
        return None

    @staticmethod
    def obtener_perfil(usuario):
        nombre = PerfilUsuarioService._valor(usuario, "nombre")
        apellido = PerfilUsuarioService._valor(usuario, "apellido")
        fecha_nacimiento = PerfilUsuarioService._valor(
            usuario,
            "fecha_nacimiento",
        )
        ciudad_obj = PerfilUsuarioService._primero(
            usuario, "ciudad", "id_ciudad"
        )
        ciudad = PerfilUsuarioService._nombre_relacion(ciudad_obj)
        departamento = PerfilUsuarioService._nombre_relacion(
            getattr(ciudad_obj, "departamento", None)
        )

        return {
            "nombre": nombre,
            "apellido": apellido,
            "nombre_completo": " ".join(
                parte for parte in (nombre, apellido) if parte
            ) or None,
            "fecha_nacimiento": fecha_nacimiento,
            "ciudad": ciudad,
            "departamento": departamento,
            "correo": PerfilUsuarioService._valor(usuario, "correo"),
            "telefono": PerfilUsuarioService._valor(usuario, "telefono"),
            "direccion": PerfilUsuarioService._valor(usuario, "direccion"),
            "eps": PerfilUsuarioService._nombre_relacion(
                PerfilUsuarioService._primero(usuario, "eps", "id_eps")
            ),
        }

    @staticmethod
    def formatear_fecha(valor):
        if isinstance(valor, (date, datetime)):
            return valor.strftime("%d/%m/%Y")
        return str(valor) if valor else None

    @staticmethod
    def responder_nombre(usuario, idioma="es"):
        perfil = PerfilUsuarioService.obtener_perfil(usuario)
        nombre = perfil["nombre_completo"]

        if not nombre:
            return LanguageService.elegir(idioma,
                "No encontré un nombre registrado en tu perfil.",
                "I couldn't find a registered name in your profile.",
                "Δεν βρήκα καταχωρημένο όνομα στο προφίλ σας.")

        plantilla = LanguageService.elegir(idioma,
            "Tu nombre registrado es {valor}.",
            "Your registered name is {valor}.",
            "Το καταχωρημένο όνομά σας είναι {valor}.")
        return plantilla.format(valor=nombre)

    @staticmethod
    def responder_fecha_nacimiento(usuario, idioma="es"):
        perfil = PerfilUsuarioService.obtener_perfil(usuario)
        fecha = PerfilUsuarioService.formatear_fecha(
            perfil["fecha_nacimiento"]
        )

        if not fecha:
            return LanguageService.elegir(idioma,
                "No encontré una fecha de nacimiento registrada en tu perfil.",
                "I couldn't find a date of birth in your profile.",
                "Δεν βρήκα ημερομηνία γέννησης στο προφίλ σας.")

        plantilla = LanguageService.elegir(idioma,
            "Tu fecha de nacimiento registrada es {valor}.",
            "Your registered date of birth is {valor}.",
            "Η καταχωρημένη ημερομηνία γέννησής σας είναι {valor}.")
        return plantilla.format(valor=fecha)

    @staticmethod
    def responder_edad(usuario, idioma="es"):
        nacimiento = PerfilUsuarioService.obtener_perfil(usuario)["fecha_nacimiento"]
        if not isinstance(nacimiento, (date, datetime)):
            return LanguageService.elegir(idioma,
                "No encontré tu fecha de nacimiento para calcular tu edad.",
                "I couldn't find your date of birth to calculate your age.",
                "Δεν βρήκα την ημερομηνία γέννησής σας για να υπολογίσω την ηλικία σας.")
        hoy = timezone.localdate()
        edad = hoy.year - nacimiento.year - (
            (hoy.month, hoy.day) < (nacimiento.month, nacimiento.day)
        )
        plantilla = LanguageService.elegir(idioma,
            "Según tu fecha de nacimiento registrada, tienes {edad} años.",
            "Based on your registered date of birth, you are {edad} years old.",
            "Με βάση την καταχωρημένη ημερομηνία γέννησής σας, είστε {edad} ετών.")
        return plantilla.format(edad=edad)

    @staticmethod
    def describir_perfil(usuario, idioma="es"):
        perfil = PerfilUsuarioService.obtener_perfil(usuario)
        etiquetas = {
            "nombre_completo": "Nombre",
            "fecha_nacimiento": "Fecha de nacimiento",
            "ciudad": "Ciudad",
            "departamento": "Departamento",
            "correo": "Correo",
            "telefono": "Teléfono",
            "direccion": "Dirección",
            "eps": "EPS",
        }
        if idioma == "en":
            etiquetas.update({"nombre_completo": "Name", "fecha_nacimiento": "Date of birth", "ciudad": "City", "departamento": "Department", "correo": "Email", "telefono": "Phone", "direccion": "Address"})
        elif idioma == "el":
            etiquetas.update({"nombre_completo": "Όνομα", "fecha_nacimiento": "Ημερομηνία γέννησης", "ciudad": "Πόλη", "departamento": "Περιφέρεια", "correo": "Email", "telefono": "Τηλέφωνο", "direccion": "Διεύθυνση"})
        lineas = [LanguageService.elegir(idioma,
            "Estos son los datos disponibles en tu perfil de DocSmart:",
            "These are the details available in your DocSmart profile:",
            "Αυτά είναι τα διαθέσιμα στοιχεία στο προφίλ σας στο DocSmart:")]

        for campo in (
            "nombre_completo",
            "fecha_nacimiento",
            "ciudad",
            "departamento",
            "correo",
            "telefono",
            "direccion",
            "eps",
        ):
            valor = perfil[campo]
            if campo == "fecha_nacimiento":
                valor = PerfilUsuarioService.formatear_fecha(valor)
            if valor:
                lineas.append(f"- {etiquetas[campo]}: {valor}")

        if len(lineas) == 1:
            return LanguageService.elegir(idioma,
                "No encontré datos personales disponibles en tu perfil.",
                "I couldn't find personal details in your profile.",
                "Δεν βρήκα προσωπικά στοιχεία στο προφίλ σας.")

        return "\n".join(lineas)

    @staticmethod
    def contexto_minimo_para_ia(usuario):
        """No envía correo, teléfono ni fecha de nacimiento a Gemini."""
        perfil = PerfilUsuarioService.obtener_perfil(usuario)
        datos = {
            "nombre": perfil["nombre_completo"],
            "ciudad": perfil["ciudad"],
        }
        return {
            clave: valor
            for clave, valor in datos.items()
            if valor
        }
