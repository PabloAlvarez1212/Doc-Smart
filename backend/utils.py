import re

def validarContraseña(contraseña):
    if len(contraseña) < 8:
        return 'La contraseña debe tener mínimo 8 caracteres'
    if re.search(r'[<>\\"\'&]', contraseña):
        return 'No se permiten los caracteres (<, >, ", \', &) en la contraseña'
    if not re.search(r'[^a-zA-Z0-9]', contraseña):
        return 'La contraseña debe contener al menos un carácter especial'
    if not re.search(r'[A-Z]', contraseña):
        return 'La contraseña debe tener mínimo una mayúscula'
    if not re.search(r'[a-z]', contraseña):
        return 'La contraseña debe tener mínimo una minúscula'
    if not re.search(r'\d', contraseña):
        return 'La contraseña debe tener mínimo un número'
    return None

def valdarCedulaNumber(cedula):
    if not re.match(r"^\d+$",cedula):
        return 'Ingresa un numero valido en la cedula'