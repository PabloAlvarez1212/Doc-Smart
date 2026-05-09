import factory
from faker import Faker
from medicos.models import Especialidad, Medico
from catalogos.factories import RolFactory

fake = Faker('es_CO')


class EspecialidadFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Especialidad
        django_get_or_create = ('nombre',)

    nombre = factory.Iterator([
        'Medicina General', 'Pediatría', 'Cardiología',
        'Dermatología', 'Neurología', 'Ginecología', 'Ortopedia'
    ])


class MedicoFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Medico
        django_get_or_create = ('cedula',)

    nombre           = factory.LazyFunction(lambda: fake.first_name())
    apellido         = factory.LazyFunction(lambda: fake.last_name())
    cedula           = factory.Sequence(lambda n: f'1000{n:06d}')
    fecha_nacimiento = factory.LazyFunction(lambda: fake.date_of_birth(minimum_age=30, maximum_age=60))
    telefono         = factory.LazyFunction(lambda: fake.numerify('3#########'))
    correo           = factory.Sequence(lambda n: f'medico{n}@docsmart.com')
    contraseña       = '1234'
    id_especialidad  = factory.SubFactory(EspecialidadFactory)
    id_rol           = factory.SubFactory(RolFactory)