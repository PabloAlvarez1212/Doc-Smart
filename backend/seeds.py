from catalogos.seeds import run as catalogos_run
from medicos.seeds import run as medicos_run
from users.seeds import run as users_run
from citas.seeds import run as citas_run
from historial_medico.seeds import run as historial_run


print("Iniciando seeder general...\n")

catalogos_run()
print("Catálogos completados")

medicos_run()
print(" Médicos completados")

users_run()
print("Usuarios completados")

citas_run()
print(" Citas completadas")

historial_run()
print(" Historial médico completado")

print("\n Todos los seeders completados exitosamente")