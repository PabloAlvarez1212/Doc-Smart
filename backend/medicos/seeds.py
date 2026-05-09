from .factories import EspecialidadFactory, MedicoFactory

def run():
    print("Iniciando seeder de médicos...")

    EspecialidadFactory.create_batch(7)
    print("Especialidades creadas")

    MedicoFactory.create_batch(20)
    print("Médicos creados")

    print("Seeder de médicos completado")