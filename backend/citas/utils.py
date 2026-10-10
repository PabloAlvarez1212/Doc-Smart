import secrets
import string

def generarCodigoCita():
    caracteres = string.ascii_uppercase + string.digits

    codigo = "".join(
        secrets.choice(caracteres)
        for _ in range(8)
    )

    return f"DOC-{codigo}"