import os
import django
import bcrypt

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from catalogos.models import Rol
from users.models import Usuario

rol, created = Rol.objects.get_or_create(nombre='paciente')

contraseña = bcrypt.hashpw('1234'.encode(), bcrypt.gensalt()).decode()

usuario = Usuario.objects.create(
    nombre='Juan',
    apellido='Pérez',
    fecha_nacimiento='1990-01-01',
    estatura=1.75,
    peso=70,
    correo='juanpalvarezm5@gmail.com',  # ← pon tu correo real
    contraseña=contraseña,
    cedula='111111111',
    telefono='3001234567',
    id_rol=rol
)
print(f'Paciente creado: {usuario}')