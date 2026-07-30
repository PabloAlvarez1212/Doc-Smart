from citas.models import Cita, RecordatorioCita
from citas.serializers import CitaSerializer, RecordatorioSerializer
from catalogos.models import Estado, Medio
from django.db.models import Q
from medicos.models import Medico
from users.models import Usuario
from django.utils import timezone
from datetime import timedelta
from notificaciones.services import enviarNotificacion

# ─── CITAS ────────────────────────────────────────────────────────────────────

def listarCitasService():
    citas = Cita.objects.all().order_by('-fecha_programada')
    serializer = CitaSerializer(citas, many=True)
    return serializer.data, 200

def listarCitasPacienteService(usuario_id):
    citas = Cita.objects.filter(id_usuario=usuario_id).order_by('-fecha_programada')
    if not citas.exists():
        return 'No se encontraron citas', 404
    serializer = CitaSerializer(citas, many=True)
    return serializer.data, 200

def listarCitasMedicoService(medico_id):
    citas = Cita.objects.filter(id_medico=medico_id).order_by('-fecha_programada')
    if not citas.exists():
        return 'No se encontraron citas', 404
    serializer = CitaSerializer(citas, many=True)
    return serializer.data, 200

def obtenerCitaService(id,solicitante_id):
    cita = Cita.objects.filter(id=id).first()
    if not cita:
        return 'Cita no encontrada', 404
    if cita.id_usuario_id != solicitante_id and cita.id_medico_id != solicitante_id:
        return 'No tienes permiso para ver esta cita', 403
    serializer = CitaSerializer(cita)
    return serializer.data, 200

def crearCitaService(datos, usuario_id):  
    usuario = Usuario.objects.filter(id=usuario_id).first()
    
    if not usuario:
        # Si no está en Usuario, busca en Medico
        medico_logueado = Medico.objects.filter(id=usuario_id).first()
        if medico_logueado:
            return 'Solo pacientes pueden crear citas', 400
        return 'El usuario no existe', 404
    
    # Verifica que el médico existe
    medico = Medico.objects.filter(id=datos['id_medico']).first()
    if not medico:
        return 'Médico no encontrado', 404

    # Verifica que la cita sea al menos 1 hora después
    if datos['fecha_programada'] < timezone.now() + timedelta(hours=1):
        return 'La cita debe programarse con al menos 1 hora de anticipación', 400

    # Verifica choque de citas del médico
    if Cita.objects.filter(
        id_medico=medico,
        fecha_programada=datos['fecha_programada']
    ).exists():
        return 'El médico ya tiene una cita en esa fecha y hora', 400

    # Estado siempre pendiente al crear
    estado = Estado.objects.filter(nombre='pendiente').first()
    if not estado :
        return 'Estado pendiente no configurado', 500
    cita = Cita.objects.create(
        fecha_programada = datos['fecha_programada'],
        id_usuario_id    = usuario_id,
        id_medico        = medico,
        id_estado        = estado,
    )
    fecha_fmt = cita.fecha_programada.strftime("%d/%m/%Y a las %H:%M")
    
    enviarNotificacion(
        titulo='Cita solicitada',
        mensaje=f'Tu cita con el Dr. {cita.id_medico.nombre} {fecha_fmt} hs fue agendada con éxito. Queda en espera de la confirmación del médico.',
        tipo='cita_pendiente',
        id_usuario=cita.id_usuario_id
    )
    enviarNotificacion(
        titulo='Nueva solicitud de cita',
        mensaje=f'El paciente {cita.id_usuario.nombre} {cita.id_usuario.apellido} ha solicitado una cita para el {fecha_fmt} hs. Revisa tu agenda para confirmarla.',
        tipo='nueva_solicitud',
        id_medico=cita.id_medico_id
    )   
    serializer = CitaSerializer(cita)
    return serializer.data, 201

def editarCitaService(id, datos, usuario_id):
    # El paciente o el medico solo puede editar sus propias citas
    cita = Cita.objects.filter(Q(id_usuario=usuario_id) | Q(id_medico=usuario_id),id=id).first()
    if not cita:
        return 'Cita no encontrada o no te pertenece', 404

    # No se puede editar una cita cancelada o completada
    if cita.id_estado.nombre in ['cancelada', 'completada']:
        return 'No se puede editar una cita cancelada o completada', 400

    fecha_antigua = cita.fecha_programada
    nueva_fecha = datos.get('fecha_programada')
    if nueva_fecha:
        # Verifica que la fecha sea futura
        if nueva_fecha < timezone.now():
            return 'La fecha programada debe ser futura', 400

        # Verifica choque de citas
        if Cita.objects.filter(
            id_medico=cita.id_medico,
            fecha_programada=nueva_fecha
        ).exclude(id=cita.id).exists():
            return 'El médico ya tiene una cita en esa fecha', 400

        cita.fecha_programada = nueva_fecha
        estado_reprogramado = Estado.objects.filter(nombre='reprogramada').first()
        if estado_reprogramado:
            cita.id_estado = estado_reprogramado

    cita.save()
    
    if nueva_fecha and nueva_fecha != fecha_antigua:
        fecha_fmt = cita.fecha_programada.strftime("%d/%m/%Y a las %H:%M")
        enviarNotificacion(
            titulo='Cita reprogramada',
            mensaje=f'Tu cita con el Dr. {cita.id_medico.nombre} {cita.id_medico.apellido} fue reprogramada para el {fecha_fmt} hs.',
            tipo='cita_reprogramada',
            id_usuario=cita.id_usuario_id
        )
        
        enviarNotificacion(
                        titulo='Cita reprogramada',
                        mensaje=f'La cita con el paciente {cita.id_usuario.nombre} {cita.id_usuario.apellido} fue reprogramada para el {fecha_fmt} hs. Revisa tu agenda para confirmarla.',
                        tipo='cita_reprogramada',
                        id_medico=cita.id_medico_id
                    ) 
            
    serializer = CitaSerializer(cita)
    return serializer.data, 200

def cancelarCitaService(id, solicitante_id):
    cita = Cita.objects.filter(id=id).first()
    if not cita:
        return 'Cita no encontrada', 404

    # Verifica que sea el paciente o el médico de esa cita
    if cita.id_usuario_id != solicitante_id and cita.id_medico_id != solicitante_id:
        return 'No tienes permiso para cancelar esta cita', 403

    if cita.id_estado.nombre == 'cancelada':
        return 'La cita ya está cancelada', 400

    if cita.id_estado.nombre == 'completada':
        return 'No se puede cancelar una cita completada', 400

    estado_cancelada = Estado.objects.filter(nombre='cancelada').first()
    cita.id_estado = estado_cancelada
    fecha_fmt = cita.fecha_programada.strftime("%d/%m/%Y a las %H:%M")
    enviarNotificacion(
        titulo='Cita cancelada',
        mensaje=f'Tu cita con el Dr. {cita.id_medico.nombre} {cita.id_medico.apellido} del {fecha_fmt} ha sido cancelada.',
        tipo='cita_cancelada',
        id_usuario=cita.id_usuario_id,
    )
    enviarNotificacion(
        titulo='Cita cancelada',
        mensaje=f'Tu cita con el paciente {cita.id_usuario.nombre} {cita.id_medico.apellido} del {fecha_fmt} ha sido cancelada.',
        tipo='cita_cancelada',
        id_medico=cita.id_medico.id
    )
    cita.save()

    return 'Cita cancelada correctamente', 200

def completarCitaService(id, medico_id):
    cita = Cita.objects.filter(id=id, id_medico=medico_id).first()
    if not cita:
        return 'Cita no encontrada o no te pertenece', 404

    if cita.id_estado.nombre == 'completada':
        return 'La cita ya está completada', 400
    
    if cita.id_estado.nombre == 'cancelada':
        return 'No se puede completar una cita cancelada', 400

    estado_completada = Estado.objects.filter(nombre='completada').first()
    cita.id_estado    = estado_completada
    cita.fecha_final  = timezone.now()
    cita.save()
    fecha_fmt = cita.fecha_programada.strftime("%d/%m/%Y a las %H:%M")
    enviarNotificacion(
            titulo='Consulta finalizada',
            mensaje=f'Tu consulta con el Dr. {cita.id_medico.nombre} {cita.id_medico.apellido} del {fecha_fmt} ha finalizado. Ya puedes revisar el resumen e indicaciones en tu historial.',
            tipo='cita_completada', 
            id_usuario=cita.id_usuario_id
        )
    enviarNotificacion(
            titulo='Consulta finalizada',
            mensaje=f'Tu consulta con el paciente {cita.id_usuario.nombre} {cita.id_usuario.apellido} del {fecha_fmt} ha finalizado.',
            tipo='cita_completada', 
            id_medico=cita.id_medico_id
        )
    serializer = CitaSerializer(cita)
    return serializer.data, 200

def confirmarCitaService(id, medico_id):
    cita = Cita.objects.filter(id=id, id_medico=medico_id).first()
    if not cita:
        return 'Cita no encontrada o no te pertenece', 404

    if cita.id_estado.nombre == 'confirmada':
        return 'La cita ya está confirmada', 400

    if cita.id_estado.nombre == 'cancelada':
        return 'No se puede confirmar una cita cancelada', 400

    if cita.id_estado.nombre == 'completada':
        return 'No se puede confirmar una cita completada', 400

    estado_confirmada = Estado.objects.filter(nombre='confirmada').first()
    cita.id_estado = estado_confirmada
    cita.save()
    fecha_fmt = cita.fecha_programada.strftime("%d/%m/%Y a las %H:%M")
    enviarNotificacion(
        titulo='Cita confirmada',
        mensaje=f'Tu cita del {fecha_fmt} ha sido confirmada por el Dr. {cita.id_medico.nombre} {cita.id_medico.apellido}',
        tipo='cita_confirmada',
        id_usuario=cita.id_usuario_id
    )
    enviarNotificacion(
        titulo='Cita confirmada',
        mensaje=f'Confirmaste la cita con el paciente {cita.id_usuario.nombre} {cita.id_medico.apellido} para el {fecha_fmt} hs',
        tipo='cita_confirmada',
        id_medico=cita.id_medico_id
    )
    serializer = CitaSerializer(cita)
    return serializer.data, 200

# ─── RECORDATORIOS ────────────────────────────────────────────────────────────

def listarRecordatoriosService():
    recordatorios = RecordatorioCita.objects.all()
    serializer = RecordatorioSerializer(recordatorios, many=True)
    return serializer.data, 200

def crearRecordatorioService(datos):
    cita = Cita.objects.filter(id=datos.get('id_cita')).first()
    if not cita:
        return 'Cita no encontrada', 404

    estado = Estado.objects.filter(id=datos.get('id_estado')).first()
    medio  = Medio.objects.filter(id=datos.get('id_medios')).first()

    recordatorio = RecordatorioCita.objects.create(
        id_cita                  = cita,
        fecha_programada         = datos['fecha_programada'],
        fecha_envio_recordatorio = datos['fecha_envio_recordatorio'],
        id_estado                = estado,
        id_medios                = medio
    )

    serializer = RecordatorioSerializer(recordatorio)
    return serializer.data, 201

def eliminarRecordatorioService(id):
    recordatorio = RecordatorioCita.objects.filter(id=id).first()
    if not recordatorio:
        return 'Recordatorio no encontrado', 404
    recordatorio.delete()
    return 'Recordatorio eliminado correctamente', 200