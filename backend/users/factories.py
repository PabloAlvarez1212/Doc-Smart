import factory
from faker import Faker

from users.models import Usuario
from catalogos.factories import RolFactory

fake = Faker('es_CO')


class UsuarioFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Usuario

    nombre = factory.LazyFunction(fake.first_name)

    apellido = factory.LazyFunction(fake.last_name)

    fecha_nacimiento = factory.LazyFunction(
        lambda: fake.date_of_birth(minimum_age=18, maximum_age=80)
    )

    estatura = factory.LazyFunction(
        lambda: round(fake.pyfloat(min_value=1.50, max_value=1.95), 2)
    )

    peso = factory.LazyFunction(
        lambda: round(fake.pyfloat(min_value=45.0, max_value=120.0), 1)
    )

    correo = factory.Sequence(
        lambda n: f"usuario{n}@example.com"
    )

    contraseña = factory.LazyFunction(fake.password)

    cedula = factory.Sequence(
        lambda n: f"10000000{n}"
    )

    telefono = factory.Sequence(
        lambda n: f"30000000{n}"
    )

    id_rol = factory.SubFactory(RolFactory)