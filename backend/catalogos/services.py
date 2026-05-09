# catalogos/services.py

from catalogos.models import Rol, Estado, Lugar, Medio
from catalogos.serializers import RolSerializer, EstadoSerializer, LugarSerializer, MedioSerializer


# =========================
#  ROL
# =========================

def listarRolesService():
    """Retorna todos los roles ordenados por nombre."""
    roles = Rol.objects.all().order_by('nombre')
    serializer = RolSerializer(roles, many=True)
    return serializer.data, 200


def obtenerRolService(id):
    """
    Busca un rol por su ID.
    Retorna (data, 200) si existe, o ('Rol no encontrado', 404) si no.
    """
    rol = Rol.objects.filter(id=id).first()
    if not rol:
        return 'Rol no encontrado', 404

    serializer = RolSerializer(rol)
    return serializer.data, 200


def crearRolService(datos):
    """
    Crea un nuevo rol con los datos recibidos.
    Valida que el nombre no esté vacío ni duplicado.
    Retorna (data, 201) si es exitoso, o (mensaje_error, código) si falla.
    """
    nombre = datos.get('nombre')

    # Validación: campo obligatorio
    if not nombre:
        return 'El campo nombre es obligatorio', 400

    # Validación: evitar roles duplicados
    existe = Rol.objects.filter(nombre__iexact=nombre).exists()
    if existe:
        return 'Ya existe un rol con ese nombre', 400

    rol = Rol.objects.create(nombre=nombre)
    serializer = RolSerializer(rol)
    return serializer.data, 201


def editarRolService(id, datos):
    """
    Actualiza el nombre de un rol existente.
    Valida que no se duplique el nombre con otro rol.
    Retorna (data, 200) si es exitoso, o (mensaje_error, código) si falla.
    """
    rol = Rol.objects.filter(id=id).first()
    if not rol:
        return 'Rol no encontrado', 404

    nombre = datos.get('nombre', rol.nombre)

    # Validación: evitar nombre duplicado excluyendo el rol actual
    existe = Rol.objects.filter(nombre__iexact=nombre).exclude(id=rol.id).exists()
    if existe:
        return 'Ya existe un rol con ese nombre', 400

    rol.nombre = nombre
    rol.save()

    serializer = RolSerializer(rol)
    return serializer.data, 200


def eliminarRolService(id):
    """
    Elimina un rol por su ID.
    Retorna ('Rol eliminado correctamente', 200) si existe,
    o ('Rol no encontrado', 404) si no se encuentra.
    """
    rol = Rol.objects.filter(id=id).first()
    if not rol:
        return 'Rol no encontrado', 404

    rol.delete()
    return 'Rol eliminado correctamente', 200


# =========================
#  ESTADO
# =========================

def listarEstadosService():
    """Retorna todos los estados ordenados por nombre."""
    estados = Estado.objects.all().order_by('nombre')
    serializer = EstadoSerializer(estados, many=True)
    return serializer.data, 200


def obtenerEstadoService(id):
    """
    Busca un estado por su ID.
    Retorna (data, 200) si existe, o ('Estado no encontrado', 404) si no.
    """
    estado = Estado.objects.filter(id=id).first()
    if not estado:
        return 'Estado no encontrado', 404

    serializer = EstadoSerializer(estado)
    return serializer.data, 200


def crearEstadoService(datos):
    """
    Crea un nuevo estado con los datos recibidos.
    Valida que el nombre no esté vacío ni duplicado.
    Retorna (data, 201) si es exitoso, o (mensaje_error, código) si falla.
    """
    nombre = datos.get('nombre')

    # Validación: campo obligatorio
    if not nombre:
        return 'El campo nombre es obligatorio', 400

    # Validación: evitar estados duplicados
    existe = Estado.objects.filter(nombre__iexact=nombre).exists()
    if existe:
        return 'Ya existe un estado con ese nombre', 400

    estado = Estado.objects.create(nombre=nombre)
    serializer = EstadoSerializer(estado)
    return serializer.data, 201


def editarEstadoService(id, datos):
    """
    Actualiza el nombre de un estado existente.
    Valida que no se duplique el nombre con otro estado.
    Retorna (data, 200) si es exitoso, o (mensaje_error, código) si falla.
    """
    estado = Estado.objects.filter(id=id).first()
    if not estado:
        return 'Estado no encontrado', 404

    nombre = datos.get('nombre', estado.nombre)

    # Validación: evitar nombre duplicado excluyendo el estado actual
    existe = Estado.objects.filter(nombre__iexact=nombre).exclude(id=estado.id).exists()
    if existe:
        return 'Ya existe un estado con ese nombre', 400

    estado.nombre = nombre
    estado.save()

    serializer = EstadoSerializer(estado)
    return serializer.data, 200


def eliminarEstadoService(id):
    """
    Elimina un estado por su ID.
    Retorna ('Estado eliminado correctamente', 200) si existe,
    o ('Estado no encontrado', 404) si no se encuentra.
    """
    estado = Estado.objects.filter(id=id).first()
    if not estado:
        return 'Estado no encontrado', 404

    estado.delete()
    return 'Estado eliminado correctamente', 200


# =========================
#  LUGAR
# =========================

def listarLugaresService():
    """Retorna todos los lugares ordenados por nombre."""
    lugares = Lugar.objects.all().order_by('nombre')
    serializer = LugarSerializer(lugares, many=True)
    return serializer.data, 200


def obtenerLugarService(id):
    """
    Busca un lugar por su ID.
    Retorna (data, 200) si existe, o ('Lugar no encontrado', 404) si no.
    """
    lugar = Lugar.objects.filter(id=id).first()
    if not lugar:
        return 'Lugar no encontrado', 404

    serializer = LugarSerializer(lugar)
    return serializer.data, 200


def crearLugarService(datos):
    """
    Crea un nuevo lugar con los datos recibidos.
    Valida que el nombre no esté vacío ni duplicado.
    Retorna (data, 201) si es exitoso, o (mensaje_error, código) si falla.
    """
    nombre = datos.get('nombre')

    # Validación: campo obligatorio
    if not nombre:
        return 'El campo nombre es obligatorio', 400

    # Validación: evitar lugares duplicados
    existe = Lugar.objects.filter(nombre__iexact=nombre).exists()
    if existe:
        return 'Ya existe un lugar con ese nombre', 400

    lugar = Lugar.objects.create(nombre=nombre)
    serializer = LugarSerializer(lugar)
    return serializer.data, 201


def editarLugarService(id, datos):
    """
    Actualiza el nombre de un lugar existente.
    Valida que no se duplique el nombre con otro lugar.
    Retorna (data, 200) si es exitoso, o (mensaje_error, código) si falla.
    """
    lugar = Lugar.objects.filter(id=id).first()
    if not lugar:
        return 'Lugar no encontrado', 404

    nombre = datos.get('nombre', lugar.nombre)

    # Validación: evitar nombre duplicado excluyendo el lugar actual
    existe = Lugar.objects.filter(nombre__iexact=nombre).exclude(id=lugar.id).exists()
    if existe:
        return 'Ya existe un lugar con ese nombre', 400

    lugar.nombre = nombre
    lugar.save()

    serializer = LugarSerializer(lugar)
    return serializer.data, 200


def eliminarLugarService(id):
    """
    Elimina un lugar por su ID.
    Retorna ('Lugar eliminado correctamente', 200) si existe,
    o ('Lugar no encontrado', 404) si no se encuentra.
    """
    lugar = Lugar.objects.filter(id=id).first()
    if not lugar:
        return 'Lugar no encontrado', 404

    lugar.delete()
    return 'Lugar eliminado correctamente', 200


# =========================
#  MEDIO
# =========================

def listarMediosService():
    """Retorna todos los medios ordenados por nombre."""
    medios = Medio.objects.all().order_by('nombre')
    serializer = MedioSerializer(medios, many=True)
    return serializer.data, 200


def obtenerMedioService(id):
    """
    Busca un medio por su ID.
    Retorna (data, 200) si existe, o ('Medio no encontrado', 404) si no.
    """
    medio = Medio.objects.filter(id=id).first()
    if not medio:
        return 'Medio no encontrado', 404

    serializer = MedioSerializer(medio)
    return serializer.data, 200


def crearMedioService(datos):
    """
    Crea un nuevo medio con los datos recibidos.
    Valida que el nombre no esté vacío ni duplicado.
    Retorna (data, 201) si es exitoso, o (mensaje_error, código) si falla.
    """
    nombre = datos.get('nombre')

    # Validación: campo obligatorio
    if not nombre:
        return 'El campo nombre es obligatorio', 400

    # Validación: evitar medios duplicados
    existe = Medio.objects.filter(nombre__iexact=nombre).exists()
    if existe:
        return 'Ya existe un medio con ese nombre', 400

    medio = Medio.objects.create(nombre=nombre)
    serializer = MedioSerializer(medio)
    return serializer.data, 201


def editarMedioService(id, datos):
    """
    Actualiza el nombre de un medio existente.
    Valida que no se duplique el nombre con otro medio.
    Retorna (data, 200) si es exitoso, o (mensaje_error, código) si falla.
    """
    medio = Medio.objects.filter(id=id).first()
    if not medio:
        return 'Medio no encontrado', 404

    nombre = datos.get('nombre', medio.nombre)

    # Validación: evitar nombre duplicado excluyendo el medio actual
    existe = Medio.objects.filter(nombre__iexact=nombre).exclude(id=medio.id).exists()
    if existe:
        return 'Ya existe un medio con ese nombre', 400

    medio.nombre = nombre
    medio.save()

    serializer = MedioSerializer(medio)
    return serializer.data, 200


def eliminarMedioService(id):
    """
    Elimina un medio por su ID.
    Retorna ('Medio eliminado correctamente', 200) si existe,
    o ('Medio no encontrado', 404) si no se encuentra.
    """
    medio = Medio.objects.filter(id=id).first()
    if not medio:
        return 'Medio no encontrado', 404

    medio.delete()
    return 'Medio eliminado correctamente', 200