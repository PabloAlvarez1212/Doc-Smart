import factory
from faker import Faker
from catalogos.models import Rol, Estado, Lugar, Medio

fake = Faker('es_CO')


class RolFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Rol
        django_get_or_create = ('nombre',)

    nombre = factory.Iterator([
        'Administrador',
        'Médico',
        'Paciente',
        'Recepcionista'
    ])


class EstadoFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Estado
        django_get_or_create = ('nombre',)

    nombre = factory.Iterator([
        'Activo',
        'Inactivo',
        'Pendiente',
        'Cancelado'
    ])


class LugarFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Lugar
        django_get_or_create = ('nombre',)

    nombre = factory.Iterator([
        'Consultorio 1',
        'Consultorio 2',
        'Sala de espera',
        'Urgencias'
    ])


class MedioFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Medio
        django_get_or_create = ('nombre',)

    nombre = factory.Iterator([
        'WhatsApp',
        'Correo',
        'Llamada',
        'SMS'
    ])