# catalogos/services.py
from django.core.paginator import Paginator
from catalogos.models import Rol, Estado, Medio, Departamento,Ciudad
from catalogos.serializers import RolSerializer, EstadoSerializer, MedioSerializer, DepartamentoSerializer, CiudadSerializer


# ─── ROL ──────────────────────────────────────────────────────────────────────

def listarRolesService():
    roles = Rol.objects.all().order_by('nombre')
    serializer = RolSerializer(roles, many=True)
    return serializer.data, 200

def obtenerRolService(id):
    rol = Rol.objects.filter(id=id).first()
    if not rol:
        return 'Rol no encontrado', 404
    serializer = RolSerializer(rol)
    return serializer.data, 200

def crearRolService(datos):
    nombre = datos.get('nombre')
    if Rol.objects.filter(nombre__iexact=nombre).exists():
        return 'Ya existe un rol con ese nombre', 400
    rol = Rol.objects.create(nombre=nombre)
    serializer = RolSerializer(rol)
    return serializer.data, 201

def editarRolService(id, datos):
    rol = Rol.objects.filter(id=id).first()
    if not rol:
        return 'Rol no encontrado', 404
    nombre = datos.get('nombre', rol.nombre)
    if Rol.objects.filter(nombre__iexact=nombre).exclude(id=rol.id).exists():
        return 'Ya existe un rol con ese nombre', 400
    rol.nombre = nombre
    rol.save()
    serializer = RolSerializer(rol)
    return serializer.data, 200

def eliminarRolService(id):
    rol = Rol.objects.filter(id=id).first()
    if not rol:
        return 'Rol no encontrado', 404
    rol.delete()
    return 'Rol eliminado correctamente', 200


# ─── ESTADO ───────────────────────────────────────────────────────────────────

def listarEstadosService():
    estados = Estado.objects.all().order_by('nombre')
    serializer = EstadoSerializer(estados, many=True)
    return serializer.data, 200

def obtenerEstadoService(id):
    estado = Estado.objects.filter(id=id).first()
    if not estado:
        return 'Estado no encontrado', 404
    serializer = EstadoSerializer(estado)
    return serializer.data, 200

def crearEstadoService(datos):
    nombre = datos.get('nombre')
    if Estado.objects.filter(nombre__iexact=nombre).exists():
        return 'Ya existe un estado con ese nombre', 400
    estado = Estado.objects.create(nombre=nombre)
    serializer = EstadoSerializer(estado)
    return serializer.data, 201

def editarEstadoService(id, datos):
    estado = Estado.objects.filter(id=id).first()
    if not estado:
        return 'Estado no encontrado', 404
    nombre = datos.get('nombre', estado.nombre)
    if Estado.objects.filter(nombre__iexact=nombre).exclude(id=estado.id).exists():
        return 'Ya existe un estado con ese nombre', 400
    estado.nombre = nombre
    estado.save()
    serializer = EstadoSerializer(estado)
    return serializer.data, 200

def eliminarEstadoService(id):
    estado = Estado.objects.filter(id=id).first()
    if not estado:
        return 'Estado no encontrado', 404
    estado.delete()
    return 'Estado eliminado correctamente', 200


# ─── DEPARTAMENTO ────────────────────────────────────────────────────────────────────

def listarDepartamentosService(page=None, page_size=10, search=None):
    departamentos = Departamento.objects.all()

    if search:
        departamentos = departamentos.filter(nombre__icontains=search)

    departamentos = departamentos.order_by('nombre')

    # Sin 'page': comportamiento original (usado por el selector en Ciudades)
    if page is None:
        serializer = DepartamentoSerializer(departamentos, many=True)
        return serializer.data, 200

    # Con 'page': paginado
    try:
        page_size = int(page_size)
    except (TypeError, ValueError):
        page_size = 10

    paginator = Paginator(departamentos, page_size)
    page_obj = paginator.get_page(page)

    serializer = DepartamentoSerializer(page_obj.object_list, many=True)

    return {
        "resultados": serializer.data,
        "paginacion": {
            "count": paginator.count,
            "total_pages": paginator.num_pages,
            "current_page": page_obj.number,
            "page_size": page_size,
        },
    }, 200

def obtenerDepartamentoService(id):
    departamento = Departamento.objects.filter(id=id).first()
    if not departamento:
        return 'Departamento no encontrado', 404
    serializer = DepartamentoSerializer(departamento)
    return serializer.data, 200

# ─── CIUDAD ────────────────────────────────────────────────────────────────────

def listarCiudadesService(departamento_id=None, page=None, page_size=10, search=None):
    ciudades = Ciudad.objects.select_related('departamento').all()

    if departamento_id:
        ciudades = ciudades.filter(departamento_id=departamento_id)

    if search:
        ciudades = ciudades.filter(nombre__icontains=search)

    ciudades = ciudades.order_by('nombre')

    # Si no piden página (page=None), se comporta EXACTAMENTE igual que antes:
    # devuelve la lista completa sin paginar. Esto es lo que sigue usando
    # CiudadListView (el selector de ciudades por departamento) sin romperse.
    if page is None:
        data = []
        for ciudad in ciudades:
            data.append({
                "id_ciudad": ciudad.id,
                "nombre_ciudad": ciudad.nombre,
                "id_departamento": ciudad.departamento.id,
                "nombre_departamento": ciudad.departamento.nombre
            })
        return data, 200

    # Si SÍ piden página: se pagina y se devuelve junto con la metadata.
    try:
        page_size = int(page_size)
    except (TypeError, ValueError):
        page_size = 10

    paginator = Paginator(ciudades, page_size)
    page_obj = paginator.get_page(page)

    data = []
    for ciudad in page_obj:
        data.append({
            "id_ciudad": ciudad.id,
            "nombre_ciudad": ciudad.nombre,
            "id_departamento": ciudad.departamento.id,
            "nombre_departamento": ciudad.departamento.nombre
        })

    resultado = {
        "resultados": data,
        "paginacion": {
            "count": paginator.count,
            "total_pages": paginator.num_pages,
            "current_page": page_obj.number,
            "page_size": page_size,
        },
    }
    return resultado, 200



def obtenerCiudadService(id):
    ciudad = Ciudad.objects.filter(id=id).first()
    if not ciudad:
        return 'Ciudad no encontrada', 404
    serializer = CiudadSerializer(ciudad)
    return serializer.data, 200


def crearCiudadService(datos):
    nombre = datos.get('nombre')
    departamento_id = datos.get('departamento_id')
    if not nombre:
        return 'El nombre de la ciudad es obligatorio', 400

    if not departamento_id:
        return 'Debe enviar el id del departamento', 400
    
    departamento = Departamento.objects.filter(id=departamento_id).first()
    if not departamento:
        return 'El departamento no existe', 404

    if Ciudad.objects.filter(nombre__iexact=nombre, departamento_id=departamento_id).exists():
        return 'Ya existe una ciudad con ese nombre en ese departamento', 400

    ciudad = Ciudad.objects.create(nombre=nombre, departamento_id=departamento_id)
    serializer = CiudadSerializer(ciudad)
    return serializer.data, 201


def editarCiudadService(id, datos):
    ciudad = Ciudad.objects.filter(id=id).first()
    if not ciudad:
        return 'Ciudad no encontrada', 404
    nombre = datos.get('nombre', ciudad.nombre)
    departamento_id = datos.get('departamento_id',ciudad.departamento_id)

     # Validar departamento
    departamento = Departamento.objects.filter(id=departamento_id).first()
    if not departamento:
        return 'El departamento no existe', 404
    # Validar duplicados
    if Ciudad.objects.filter(nombre__iexact=nombre,departamento_id=departamento_id).exclude(id=ciudad.id).exists():
        return 'Ya existe una ciudad con ese nombre en ese departamento', 400

    ciudad.nombre = nombre
    ciudad.departamento_id = departamento_id
    ciudad.save()
    serializer = CiudadSerializer(ciudad)
    return serializer.data, 200

def eliminarCiudadService(id):
    ciudad = Ciudad.objects.filter(id=id).first()
    if not ciudad:
        return 'Ciudad no encontrada', 404
    ciudad.delete()
    return 'Ciudad eliminada correctamente', 200
# ─── MEDIO ────────────────────────────────────────────────────────────────────

def listarMediosService():
    medios = Medio.objects.all().order_by('nombre')
    serializer = MedioSerializer(medios, many=True)
    return serializer.data, 200

def obtenerMedioService(id):
    medio = Medio.objects.filter(id=id).first()
    if not medio:
        return 'Medio no encontrado', 404
    serializer = MedioSerializer(medio)
    return serializer.data, 200

def crearMedioService(datos):
    nombre = datos.get('nombre')
    if Medio.objects.filter(nombre__iexact=nombre).exists():
        return 'Ya existe un medio con ese nombre', 400
    medio = Medio.objects.create(nombre=nombre)
    serializer = MedioSerializer(medio)
    return serializer.data, 201

def editarMedioService(id, datos):
    medio = Medio.objects.filter(id=id).first()
    if not medio:
        return 'Medio no encontrado', 404
    nombre = datos.get('nombre', medio.nombre)
    if Medio.objects.filter(nombre__iexact=nombre).exclude(id=medio.id).exists():
        return 'Ya existe un medio con ese nombre', 400
    medio.nombre = nombre
    medio.save()
    serializer = MedioSerializer(medio)
    return serializer.data, 200

def eliminarMedioService(id):
    medio = Medio.objects.filter(id=id).first()
    if not medio:
        return 'Medio no encontrado', 404
    medio.delete()
    return 'Medio eliminado correctamente', 200