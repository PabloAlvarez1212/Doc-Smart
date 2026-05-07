import factory
from faker import Faker
from historial_medico.models import HistorialClinico
from citas.factories import CitaFactory
from users.factories import UsuarioFactory

fake = Faker('es_CO')


class HistorialClinicoFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = HistorialClinico

    diagnostico_general = factory.LazyFunction(lambda: fake.paragraph(nb_sentences=3))
    observaciones       = factory.LazyFunction(lambda: fake.paragraph(nb_sentences=2))
    motivo_consulta     = factory.LazyFunction(lambda: fake.sentence(nb_words=8))
    cedula              = factory.Sequence(lambda n: f'3000{n:06d}')
    cita                = factory.SubFactory(CitaFactory)
    usuario             = factory.SubFactory(UsuarioFactory)