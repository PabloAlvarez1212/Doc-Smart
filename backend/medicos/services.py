import bcrypt
from medicos.models import Medico, Especialidad
from users.models import Usuario
from catalogos.models import Rol
from medicos.serializers import (
    MedicoSerializer,
    EspecialidadSerializer,
    RegistrarMedicoSerializer,
    EditarMedicoSerializer,
    RegistrarEspecialidadSerializer,
)

# ─── MÉDICOS ──────────────────────────────────────────────────────────────────

def listarMedicosService():

    medicos = Medico.objects.all()

    serializer = MedicoSerializer(
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

    serializer = MedicoSerializer(medico)

    return serializer.data, 200


def crearMedicoService(data):

    serializer = RegistrarMedicoSerializer(
        data=data
    )

    if not serializer.is_valid():
        return serializer.errors, 400

    data_validada = serializer.validated_data

    # Verificación cruzada de correo (usuarios y médicos)
    if Usuario.objects.filter(
        correo=data_validada['correo']
    ).exists() or Medico.objects.filter(
        correo=data_validada['correo']
    ).exists():

        return {'correo': ['El correo ya está registrado']}, 400

    # Verificación cruzada de cédula (usuarios y médicos)
    if Usuario.objects.filter(
        cedula=data_validada['cedula']
    ).exists() or Medico.objects.filter(
        cedula=data_validada['cedula']
    ).exists():

        return {'cedula': ['La cédula ya está registrada']}, 400

    especialidad = Especialidad.objects.filter(
        id=data_validada['id_especialidad']
    ).first()

    if not especialidad:
        return 'Especialidad no encontrada', 404

    # Obtener rol médico desde la DB
    rol = Rol.objects.filter(
        nombre='doctor'
    ).first()

    if not rol:
        return {'general': ['Rol médico no encontrado']}, 404

    password_encriptada = bcrypt.hashpw(
        data_validada['contraseña'].encode('utf-8'),
        bcrypt.gensalt()
    ).decode('utf-8')

    medico = Medico.objects.create(
        nombre=data_validada['nombre'],
        apellido=data_validada['apellido'],
        cedula=data_validada['cedula'],
        fecha_nacimiento=data_validada['fecha_nacimiento'],
        telefono=data_validada.get('telefono', ''),
        correo=data_validada['correo'],
        contraseña=password_encriptada,
        id_especialidad=especialidad,
        id_rol=rol,
        direccion=data_validada.get('direccion', ''),
        ciudad=data_validada.get('ciudad', None)
    )

    return MedicoSerializer(medico).data, 201


def actualizarMedicoService(id_medico, data):

    medico = Medico.objects.filter(
        id=id_medico
    ).first()

    if not medico:
        return 'Médico no encontrado', 404

    serializer = EditarMedicoSerializer(
        data=data
    )

    if not serializer.is_valid():
        return serializer.errors, 400

    data_validada = serializer.validated_data

    if 'correo' in data_validada:

        if Medico.objects.filter(
            correo=data_validada['correo']
        ).exclude(id=id_medico).exists():

            return 'Ya existe un médico con ese correo', 400

    if 'cedula' in data_validada:

        if Medico.objects.filter(
            cedula=data_validada['cedula']
        ).exclude(id=id_medico).exists():

            return 'Ya existe un médico con esa cédula', 400

    for campo, valor in data_validada.items():

        if campo == 'id_especialidad':

            especialidad = Especialidad.objects.filter(
                id=valor
            ).first()

            if not especialidad:
                return 'Especialidad no encontrada', 404

            medico.id_especialidad = especialidad

        elif campo == 'contraseña':

            password_encriptada = bcrypt.hashpw(
                valor.encode('utf-8'),
                bcrypt.gensalt()
            ).decode('utf-8')

            medico.contraseña = password_encriptada

        else:

            setattr(medico, campo, valor)

    medico.save()

    return MedicoSerializer(medico).data, 200


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

    serializer = RegistrarEspecialidadSerializer(
        data=data
    )

    if not serializer.is_valid():
        return serializer.errors, 400

    data_validada = serializer.validated_data

    if Especialidad.objects.filter(
        nombre__iexact=data_validada['nombre']
    ).exists():

        return 'La especialidad ya existe', 400

    especialidad = Especialidad.objects.create(
        nombre=data_validada['nombre']
    )

    return EspecialidadSerializer(especialidad).data, 201


def editarEspecialidadService(id_especialidad, data):

    especialidad = Especialidad.objects.filter(
        id=id_especialidad
    ).first()

    if not especialidad:
        return 'Especialidad no encontrada', 404

    serializer = RegistrarEspecialidadSerializer(
        data=data
    )

    if not serializer.is_valid():
        return serializer.errors, 400

    data_validada = serializer.validated_data

    if Especialidad.objects.filter(
        nombre__iexact=data_validada['nombre']
    ).exclude(id=id_especialidad).exists():

        return 'Ya existe una especialidad con ese nombre', 400

    especialidad.nombre = data_validada['nombre']

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