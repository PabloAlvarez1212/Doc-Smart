import factory
from faker import Faker
from catalogos.models import Rol, Estado, Lugar, Medio

fake = Faker('es_CO')


class RolFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Rol
        django_get_or_create = ('nombre',)

    nombre = factory.Iterator([
        'administrador',
        'doctor',
        'paciente',
        'recepcionista'
    ])


class EstadoFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Estado
        django_get_or_create = ('nombre',)

    nombre = factory.Iterator([
        'activo',
        'inactivo',
        'pendiente',
        'cancelado'
    ])


class LugarFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Lugar
        django_get_or_create = ('nombre',)

    nombre = factory.Iterator([
        'consultorio 1',
        'consultorio 2',
        'sala de espera',
        'urgencias'
    ])


class MedioFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Medio
        django_get_or_create = ('nombre',)

    nombre = factory.Iterator([
        'whatsApp',
        'correo',
        'llamada',
        'SMS'
    ])