import factory
from faker import Faker
from users.models import Usuario
from catalogos.factories import RolFactory

fake = Faker('es_CO')

class UsuarioFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Usuario
        django_get_or_create = ('cedula',)

    nombre = factory.LazyFunction(fake.first_name)
    apellido = factory.LazyFunction(fake.last_name)

    cedula = factory.Sequence(lambda n: f"100000{n}")

    correo = factory.Sequence(
        lambda n: f"usuario{n}@example.com"
    )

    telefono = factory.Sequence(
        lambda n: f"300000{n:04}"
    )

    rol = factory.SubFactory(RolFactory)