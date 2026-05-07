# medicos/seeds.py

from medicos.factories import EspecialidadFactory, MedicoFactory


def run():
    print('🌱 Iniciando seeder de médicos...')

    EspecialidadFactory.create_batch(50)
    print('✅ Especialidades creadas')

    MedicoFactory.create_batch(50)
    print('✅ Médicos creados')

    print('🎉 Seeder de médicos completado')