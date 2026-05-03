from medicos.models import Medico, Especialidad
from medicos.serializers import MedicoSerializer, EspecialidadSerializer

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
    especialidad = Especialidad.objects.filter(id=data.get('id_especialidad')).first()
    if not especialidad:
        return 'Especialidad no encontrada', 404

    serializer = MedicoSerializer(data=data)
    if not serializer.is_valid():
        return serializer.errors, 400

    medico = serializer.save()
    return MedicoSerializer(medico).data, 201

def actualizarMedicoService(id_medico, data):
    medico = Medico.objects.filter(id=id_medico).first()
    if not medico:
        return 'Médico no encontrado', 404

    serializer = MedicoSerializer(medico, data=data, partial=True)
    if not serializer.is_valid():
        return serializer.errors, 400

    medico = serializer.save()
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