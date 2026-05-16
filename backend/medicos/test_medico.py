import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

import bcrypt
from catalogos.models import Rol
from medicos.models import Medico, Especialidad

rol, created = Rol.objects.get_or_create(nombre='doctor')
especialidad, created = Especialidad.objects.get_or_create(nombre='Cardiología')

contraseña = bcrypt.hashpw('1234'.encode(), bcrypt.gensalt()).decode()

if Medico.objects.filter(correo='miguelangelracero05@gmail.com').exists():
    print('El médico ya existe')
else:
    medico = Medico.objects.create(
        nombre='Carlos',
        apellido='García',
        cedula='222222222',
        fecha_nacimiento='1985-05-15',
        telefono='3009876543',
        correo='miguelangelracero05@gmail.com',
        contraseña=contraseña,
        id_especialidad=especialidad,
        id_rol=rol,
        direccion='Calle 123',
    )
    print(f'✅ Médico creado: {medico}')