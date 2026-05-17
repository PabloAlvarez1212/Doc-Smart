import bcrypt
from medicos.models import Medico, Especialidad
from catalogos.models import Ciudad
from users.models import Usuario
from catalogos.models import Rol
from medicos.serializers import (
    MedicoPerfilSerializer,
    EspecialidadSerializer,
    RegistrarEspecialidadSerializer,
)

# ─── MÉDICOS ──────────────────────────────────────────────────────────────────

def listarMedicosService():

    medicos = Medico.objects.all()

    serializer = MedicoPerfilSerializer(
        medicos,
        many=True
    )

    return serializer.data, 200


def obtenerMedicoService(id_medico):

    medico = Medico.objects.filter(
        id=id_medico
    ).first()

    if not medico:
        return 'Médico no encontrado', 404

    serializer = MedicoPerfilSerializer(medico)

    return serializer.data, 200


def crearMedicoService(data):
    # Verificación cruzada de correo (usuarios y médicos)
    if Usuario.objects.filter(
        correo=data['correo']
    ).exists() or Medico.objects.filter(
        correo=data['correo']
    ).exists():

        return {'correo': ['El correo ya está registrado']}, 400

    # Verificación cruzada de cédula (usuarios y médicos)
    if Usuario.objects.filter(
        cedula=data['cedula']
    ).exists() or Medico.objects.filter(
        cedula=data['cedula']
    ).exists():

        return {'cedula': ['La cédula ya está registrada']}, 400

    especialidad = Especialidad.objects.filter(
        id=data['id_especialidad']
    ).first()

    if not especialidad:
        return {'especialidad':['Especialidad no encontrada']}, 404

    # Obtener rol médico desde la DB
    rol = Rol.objects.filter(
        nombre='doctor'
    ).first()

    if not rol:
        return {'rol': ['Rol médico no encontrado']}, 404
    
    ciudad = Ciudad.objects.filter(id=data['id_ciudad']).first()
    
    if not ciudad:
        return {'ciudad':['ciudad no encontrada']},404

    password_encriptada = bcrypt.hashpw(
        data['contraseña'].encode('utf-8'),
        bcrypt.gensalt()
    ).decode('utf-8')

    medico = Medico.objects.create(
        nombre=data['nombre'],
        apellido=data['apellido'],
        cedula=data['cedula'],
        fecha_nacimiento=data['fecha_nacimiento'],
        telefono=data.get('telefono', ''),
        correo=data['correo'],
        contraseña=password_encriptada,
        id_especialidad=especialidad,
        id_rol=rol,
        direccion=data.get('direccion', ''),
        id_ciudad=ciudad
    )

    return MedicoPerfilSerializer(medico).data, 201


def actualizarMedicoService(id_medico, data):
    medico = Medico.objects.filter(id=id_medico).first()
    if not medico:
        return 'Medico no encontrado', 404

    nuevo_correo = data.get('correo')
    if nuevo_correo and nuevo_correo != medico.correo:
        if Usuario.objects.filter(correo=nuevo_correo).exists() or Medico.objects.filter(correo=nuevo_correo).exists():
            return {"correo": ["El correo ya está registrado"]}, 400
        medico.correo = nuevo_correo
    especialidad_id = data.get('id_especialidad')
    if especialidad_id:
        especialidad = Especialidad.objects.filter(id=especialidad_id).first()
        if not especialidad:
            return {"especialidad":["La especialidad no existe"]},404
        medico.id_especialidad = especialidad
    ciudad_id = data.get('id_ciudad')
    if ciudad_id:
        ciudad = Ciudad.objects.filter(id=ciudad_id).first()
        if not ciudad:
            return {'ciudad':['ciudad no encontrada']},404
        medico.id_ciudad = ciudad
    medico.nombre = data.get('nombre', medico.nombre)
    medico.apellido = data.get('apellido', medico.apellido)
    medico.fecha_nacimiento = data.get('fecha_nacimiento', medico.fecha_nacimiento)
    medico.direccion = data.get('direccion',medico.direccion)
    medico.telefono = data.get('telefono', medico.telefono)
    medico.save()
    medico.refresh_from_db()
    serializer = MedicoPerfilSerializer(medico)
    return serializer.data, 200

def eliminarMedicoService(id_medico):

    medico = Medico.objects.filter(
        id=id_medico
    ).first()

    if not medico:
        return 'Médico no encontrado', 404

    medico.delete()

    return 'Médico eliminado correctamente', 200


# ─── ESPECIALIDADES ──────────────────────────────────────────────────────────

def listarEspecialidadesService():

    especialidades = Especialidad.objects.all()

    serializer = EspecialidadSerializer(
        especialidades,
        many=True
    )

    return serializer.data, 200


def obtenerEspecialidadService(id_especialidad):

    especialidad = Especialidad.objects.filter(
        id=id_especialidad
    ).first()

    if not especialidad:
        return 'Especialidad no encontrada', 404

    serializer = EspecialidadSerializer(especialidad)

    return serializer.data, 200


def crearEspecialidadService(data):

    if Especialidad.objects.filter(
        nombre__iexact=data['nombre']
    ).exists():

        return 'La especialidad ya existe', 400

    especialidad = Especialidad.objects.create(
        nombre=data['nombre']
    )

    return EspecialidadSerializer(especialidad).data, 201


def editarEspecialidadService(id_especialidad, data):

    especialidad = Especialidad.objects.filter(
        id=id_especialidad
    ).first()

    if not especialidad:
        return 'Especialidad no encontrada', 404

    if Especialidad.objects.filter(
        nombre__iexact=data['nombre']
    ).exclude(id=id_especialidad).exists():

        return 'Ya existe una especialidad con ese nombre', 400

    especialidad.nombre = data['nombre']

    especialidad.save()

    return EspecialidadSerializer(especialidad).data, 200


def eliminarEspecialidadService(id_especialidad):

    especialidad = Especialidad.objects.filter(
        id=id_especialidad
    ).first()

    if not especialidad:
        return 'Especialidad no encontrada', 404

    especialidad.delete()

    return 'Especialidad eliminada correctamente', 200