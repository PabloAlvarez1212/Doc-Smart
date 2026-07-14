import bcrypt
from medicos.models import Medico, Especialidad
from users.models import Usuario
from catalogos.models import Rol, Ciudad
from medicos.serializers import (
    MedicoPerfilSerializer,
    EspecialidadSerializer,
    RegistrarMedicoSerializer,
    EditarMedicoSerializer,
    RegistrarEspecialidadSerializer,
    EditarEspecialidadSerializer,
)
from users.serializers import MedicoSerializer

# ── SERVICIOS DE MÉDICOS ──────────────────────────────────────────────────────

# Retorna la lista completa de médicos registrados
def listarMedicosService():
    medicos = Medico.objects.all()
    serializer = MedicoSerializer(medicos, many=True)
    return serializer.data, 200


# Retorna los datos de un médico específico por su ID
def obtenerMedicoService(id_medico):
    medico = Medico.objects.filter(id=id_medico).first()
    if not medico:
        return 'Médico no encontrado', 404
    serializer = MedicoPerfilSerializer(medico)
    return serializer.data, 200


# Crea un nuevo médico tras validar datos, unicidad de correo/cédula y existencia de relaciones
def crearMedicoService(data):
    serializer = RegistrarMedicoSerializer(data=data)
    if not serializer.is_valid():
        return serializer.errors, 400

    data_validada = serializer.validated_data

    # Verifica que el correo no esté en uso por otro médico o usuario
    if Usuario.objects.filter(correo=data_validada['correo']).exists() or \
       Medico.objects.filter(correo=data_validada['correo']).exists():
        return {'correo': ['El correo ya está registrado']}, 400

    # Verifica que la cédula no esté en uso por otro médico o usuario
    if Usuario.objects.filter(cedula=data_validada['cedula']).exists() or \
       Medico.objects.filter(cedula=data_validada['cedula']).exists():
        return {'cedula': ['La cédula ya está registrada']}, 400

    # Verifica que la especialidad enviada exista en la base de datos
    especialidad = Especialidad.objects.filter(id=data_validada['id_especialidad']).first()
    if not especialidad:
        return {'id_especialidad': ['Especialidad no encontrada']}, 404

    # Verifica que la ciudad enviada exista en la base de datos
    ciudad = Ciudad.objects.filter(id=data_validada['ciudad']).first()
    if not ciudad:
        return {'ciudad': ['Ciudad no encontrada']}, 404

    # Busca el rol 'doctor' para asignárselo automáticamente al nuevo médico
    rol = Rol.objects.filter(nombre='doctor').first()
    if not rol:
        return {'general': ['Rol médico no encontrado']}, 404

    # Encripta la contraseña con bcrypt antes de guardarla
    password_encriptada = bcrypt.hashpw(
        data_validada['contraseña'].encode('utf-8'),
        bcrypt.gensalt()
    ).decode('utf-8')

    # Crea el registro del médico en la base de datos
    medico = Medico.objects.create(
        nombre=data_validada['nombre'],
        apellido=data_validada['apellido'],
        cedula=data_validada['cedula'],
        fecha_nacimiento=data_validada['fecha_nacimiento'],
        telefono=data_validada.get('telefono', ''),
        correo=data_validada['correo'],
        contraseña=password_encriptada,
        id_especialidad=especialidad,
        ciudad=ciudad,
        id_rol=rol,
        direccion=data_validada.get('direccion', ''),
    )

    return MedicoPerfilSerializer(medico).data, 201


# Actualiza los campos enviados de un médico existente de forma dinámica
def actualizarMedicoService(id_medico, data):
    medico = Medico.objects.filter(id=id_medico).first()
    if not medico:
        return 'Médico no encontrado', 404

    serializer = EditarMedicoSerializer(data=data)
    if not serializer.is_valid():
        return serializer.errors, 400

    data_validada = serializer.validated_data

    # Verifica que el nuevo correo no pertenezca a otro médico
    if 'correo' in data_validada:
        if Medico.objects.filter(correo=data_validada['correo']).exclude(id=id_medico).exists():
            return {'correo': ['Ya existe un médico con ese correo']}, 400

    # Itera sobre los campos recibidos y los actualiza según su tipo
    for campo, valor in data_validada.items():
        if campo == 'id_especialidad':
            # Reemplaza la especialidad verificando que exista
            especialidad = Especialidad.objects.filter(id=valor).first()
            if not especialidad:
                return {'id_especialidad': ['Especialidad no encontrada']}, 404
            medico.id_especialidad = especialidad

        elif campo == 'ciudad':
            # Reemplaza la ciudad verificando que exista
            ciudad_obj = Ciudad.objects.filter(id=valor).first()
            if not ciudad_obj:
                return {'ciudad': ['Ciudad no encontrada']}, 404
            medico.ciudad = ciudad_obj

        elif campo == 'contraseña':
            # Encripta la nueva contraseña antes de asignarla
            password_encriptada = bcrypt.hashpw(
                valor.encode('utf-8'), bcrypt.gensalt()
            ).decode('utf-8')
            medico.contraseña = password_encriptada

        else:
            # Para campos simples, asigna el valor directamente
            setattr(medico, campo, valor)

    medico.save()
    return MedicoPerfilSerializer(medico).data, 200


# Elimina un médico por su ID
def eliminarMedicoService(id_medico):
    medico = Medico.objects.filter(id=id_medico).first()
    if not medico:
        return 'Médico no encontrado', 404
    medico.delete()
    return 'Médico eliminado correctamente', 200


# ── SERVICIOS DE ESPECIALIDADES ───────────────────────────────────────────────

# Retorna todas las especialidades registradas
def listarEspecialidadesService():
    especialidades = Especialidad.objects.all()
    serializer = EspecialidadSerializer(especialidades, many=True)
    return serializer.data, 200


# Retorna una especialidad específica por su ID
def obtenerEspecialidadService(id_especialidad):
    especialidad = Especialidad.objects.filter(id=id_especialidad).first()
    if not especialidad:
        return 'Especialidad no encontrada', 404
    serializer = EspecialidadSerializer(especialidad)
    return serializer.data, 200


# Crea una nueva especialidad verificando que no exista una con el mismo nombre
def crearEspecialidadService(data):
    serializer = RegistrarEspecialidadSerializer(data=data)
    if not serializer.is_valid():
        return serializer.errors, 400

    data_validada = serializer.validated_data

    # Búsqueda case-insensitive para evitar duplicados como "Cardiología" y "cardiología"
    if Especialidad.objects.filter(nombre__iexact=data_validada['nombre']).exists():
        return {'nombre': ['La especialidad ya existe']}, 400

    especialidad = Especialidad.objects.create(nombre=data_validada['nombre'])
    return EspecialidadSerializer(especialidad).data, 201


# Actualiza el nombre de una especialidad existente
def editarEspecialidadService(id_especialidad, data):
    especialidad = Especialidad.objects.filter(id=id_especialidad).first()
    if not especialidad:
        return 'Especialidad no encontrada', 404

    serializer = EditarEspecialidadSerializer(data=data)
    if not serializer.is_valid():
        return serializer.errors, 400

    data_validada = serializer.validated_data

    # Verifica que el nuevo nombre no lo tenga otra especialidad distinta
    if Especialidad.objects.filter(
        nombre__iexact=data_validada['nombre']
    ).exclude(id=id_especialidad).exists():
        return {'nombre': ['Ya existe una especialidad con ese nombre']}, 400

    especialidad.nombre = data_validada['nombre']
    especialidad.save()
    return EspecialidadSerializer(especialidad).data, 200


# Elimina una especialidad por su ID
def eliminarEspecialidadService(id_especialidad):
    especialidad = Especialidad.objects.filter(id=id_especialidad).first()
    if not especialidad:
        return 'Especialidad no encontrada', 404
    especialidad.delete()
    return 'Especialidad eliminada correctamente', 200