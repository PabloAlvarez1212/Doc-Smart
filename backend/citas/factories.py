import factory
from faker import Faker
from django.utils import timezone
from datetime import timedelta
from citas.models import Cita, RecordatorioCita
from catalogos.factories import EstadoFactory, LugarFactory, MedioFactory
from users.factories import UsuarioFactory
from medicos.factories import MedicoFactory

fake = Faker('es_CO')


class CitaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Cita

    fecha_programada = factory.LazyFunction(
        lambda: timezone.now() + timedelta(days=fake.random_int(min=1, max=60))
    )
    fecha_final  = factory.LazyFunction(
        lambda: timezone.now() + timedelta(days=fake.random_int(min=61, max=90))
    )
    id_usuario   = factory.SubFactory(UsuarioFactory)
    id_medico    = factory.SubFactory(MedicoFactory)
    id_estado    = factory.SubFactory(EstadoFactory)
    id_lugar     = factory.SubFactory(LugarFactory)


class RecordatorioCitaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = RecordatorioCita

    id_cita                  = factory.SubFactory(CitaFactory)
    fecha_programada         = factory.LazyAttribute(lambda o: o.id_cita.fecha_programada)
    fecha_envio_recordatorio = factory.LazyAttribute(
        lambda o: o.id_cita.fecha_programada - timedelta(hours=fake.random_int(min=1, max=48))
    )
    id_estado = factory.SubFactory(EstadoFactory)
    id_medios = factory.SubFactory(MedioFactory)