import os
import django
import bcrypt

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from catalogos.models import Rol
from medicos.models import Medico, Especialidad

rol, created = Rol.objects.get_or_create(nombre='doctor')
especialidad, created = Especialidad.objects.get_or_create(nombre='Cardiología')

contraseña = bcrypt.hashpw('1234'.encode(), bcrypt.gensalt()).decode()

medico = Medico.objects.create(
    nombre='Carlos',
    apellido='García',
    cedula='222222222',
    fecha_nacimiento='1985-05-15',
    telefono='3009876543',
    correo='miguelangelracero05@gmail.com',  # ← pon tu correo real
    contraseña=contraseña,
    id_especialidad=especialidad,
    id_rol=rol
)
print(f'Médico creado: {medico}')