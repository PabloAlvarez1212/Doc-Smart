# catalogos/services.py
from catalogos.models import Rol, Estado, Lugar, Medio
from catalogos.serializers import RolSerializer, EstadoSerializer, LugarSerializer, MedioSerializer


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


# ─── LUGAR ────────────────────────────────────────────────────────────────────

def listarLugaresService():
    lugares = Lugar.objects.all().order_by('nombre')
    serializer = LugarSerializer(lugares, many=True)
    return serializer.data, 200

def obtenerLugarService(id):
    lugar = Lugar.objects.filter(id=id).first()
    if not lugar:
        return 'Lugar no encontrado', 404
    serializer = LugarSerializer(lugar)
    return serializer.data, 200

def crearLugarService(datos):
    nombre = datos.get('nombre')
    if Lugar.objects.filter(nombre__iexact=nombre).exists():
        return 'Ya existe un lugar con ese nombre', 400
    lugar = Lugar.objects.create(nombre=nombre)
    serializer = LugarSerializer(lugar)
    return serializer.data, 201

def editarLugarService(id, datos):
    lugar = Lugar.objects.filter(id=id).first()
    if not lugar:
        return 'Lugar no encontrado', 404
    
def eliminarLugarService(id):
    lugar = Lugar.objects.filter(id=id).first()
    if not lugar:
        return 'Lugar no encontrado', 404
    lugar.delete()
    return 'Lugar eliminado correctamente', 200
    
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