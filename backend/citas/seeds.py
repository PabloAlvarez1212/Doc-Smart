# citas/seeds.py

from citas.factories import CitaFactory, RecordatorioCitaFactory


def run():
    print('🌱 Iniciando seeder de citas...')

    citas = CitaFactory.create_batch(50)
    print(f'✅ {len(citas)} citas creadas')

    recordatorios = RecordatorioCitaFactory.create_batch(50)
    print(f'✅ {len(recordatorios)} recordatorios creados')

    print('🎉 Seeder de citas completado')