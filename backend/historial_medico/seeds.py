# historial_medico/seeds.py

from historial_medico.factories import HistorialClinicoFactory


def run():
    print('🌱 Iniciando seeder de historial clínico...')

    HistorialClinicoFactory.create_batch(50)
    print('✅ Historiales clínicos creados')

    print('🎉 Seeder de historial clínico completado')