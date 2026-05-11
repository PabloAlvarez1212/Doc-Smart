import requests

from catalogos.models import (
    Departamento,
    Ciudad
)

# ─── DEPARTAMENTOS ─────────────────────

url_departamentos = "https://api-colombia.com/api/v1/Department"

response = requests.get(url_departamentos)

departamentos = response.json()

for dep in departamentos:

    Departamento.objects.get_or_create(
        api_id=dep['id'],
        defaults={
            'nombre': dep['name']
        }
    )

print("Departamentos cargados")


# ─── CIUDADES ─────────────────────

url_ciudades = "https://api-colombia.com/api/v1/City"

response = requests.get(url_ciudades)

ciudades = response.json()

for city in ciudades:

    departamento = Departamento.objects.filter(
        api_id=city['departmentId']
    ).first()

    if departamento:

        Ciudad.objects.get_or_create(
            api_id=city['id'],
            defaults={
                'nombre': city['name'],
                'departamento': departamento
            }
        )

print("Ciudades cargadas")