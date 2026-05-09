from medicos.models import Medico, Especialidad
from medicos.serializers import (
    MedicoSerializer,
    EspecialidadSerializer,
    RegistrarMedicoSerializer,
    EditarMedicoSerializer
)

def listarMedicosService():
    medicos = Medico.objects.all()
    serializer = MedicoSerializer(medicos, many=True)
    return serializer.data, 200

def obtenerMedicoService(id_medico):
    medico = Medico.objects.filter(id=id_medico).first()
    if not medico:
        return 'Médico no encontrado', 404
    serializer = MedicoSerializer(medico)
    return serializer.data, 200

def crearMedicoService(data):
    # Valida la entrada con mensajes en español
    serializer = RegistrarMedicoSerializer(data=data)
    if not serializer.is_valid():
        return serializer.errors, 400

    data_validada = serializer.validated_data

    especialidad = Especialidad.objects.filter(id=data_validada['id_especialidad']).first()
    if not especialidad:
        return 'Especialidad no encontrada', 404

    medico = Medico.objects.create(
        nombre=data_validada['nombre'],
        apellido=data_validada['apellido'],
        cedula=data_validada['cedula'],
        fecha_nacimiento=data_validada['fecha_nacimiento'],
        telefono=data_validada.get('telefono', ''),
        correo=data_validada['correo'],
        contraseña=data_validada['contraseña'],
        id_especialidad=especialidad,
        id_rol_id=data_validada['id_rol']
    )
    return MedicoSerializer(medico).data, 201

def actualizarMedicoService(id_medico, data):
    medico = Medico.objects.filter(id=id_medico).first()
    if not medico:
        return 'Médico no encontrado', 404

    # Valida la entrada con mensajes en español
    serializer = EditarMedicoSerializer(data=data)
    if not serializer.is_valid():
        return serializer.errors, 400

    data_validada = serializer.validated_data

    for campo, valor in data_validada.items():
        if campo == 'id_especialidad':
            especialidad = Especialidad.objects.filter(id=valor).first()
            if not especialidad:
                return 'Especialidad no encontrada', 404
            medico.id_especialidad = especialidad
        else:
            setattr(medico, campo, valor)

    medico.save()
    return MedicoSerializer(medico).data, 200

def eliminarMedicoService(id_medico):
    medico = Medico.objects.filter(id=id_medico).first()
    if not medico:
        return 'Médico no encontrado', 404
    medico.delete()
    return 'Médico eliminado correctamente', 200

def listarEspecialidadesService():
    especialidades = Especialidad.objects.all()
    serializer = EspecialidadSerializer(especialidades, many=True)
    return serializer.data, 200