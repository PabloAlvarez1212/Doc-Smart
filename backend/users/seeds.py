# users/seeds.py

from users.factories import UsuarioFactory


def run():
    print('🌱 Iniciando seeder de usuarios...')

    UsuarioFactory.create_batch(50)
    print('✅ Usuarios creados')

    print('🎉 Seeder de usuarios completado')