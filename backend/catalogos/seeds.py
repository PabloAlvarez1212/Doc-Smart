
from catalogos.factories import RolFactory, EstadoFactory, LugarFactory, MedioFactory


def run():
    print('Iniciando seeder de catálogos...')

    RolFactory.create_batch(50)
    print(' Roles creados')

    EstadoFactory.create_batch(50)
    print(' Estados creados')

    LugarFactory.create_batch(50)
    print(' Lugares creados')

    MedioFactory.create_batch(50)
    print(' Medios creados')

    print('Seeder de catálogos completado')