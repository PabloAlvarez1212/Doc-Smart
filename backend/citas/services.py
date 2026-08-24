from citas.models import Cita, RecordatorioCita
from citas.serializers import CitaSerializer, RecordatorioSerializer
from catalogos.models import Estado, Medio
from django.db.models import Q
from medicos.models import Medico
from users.models import Usuario
from django.utils import timezone
from datetime import timedelta
from notificaciones.services import enviarNotificacion
from django.db.models import Value
from django.db.models.functions import Concat
from datetime import datetime, timedelta
from django.utils import timezone
from django.core.paginator import Paginator


# ─── CITAS ────────────────────────────────────────────────────────────────────

def listarCitasService():
    citas = Cita.objects.all().order_by('-fecha_programada')
    serializer = CitaSerializer(citas, many=True)
    return serializer.data, 200

def listarCitasPacienteService(usuario_id,estado=None,doctor=None,ciudad=None,departamento=None,especialidad=None,fecha=None,page=None, page_size=10):
    citas = Cita.objects.filter(id_usuario=usuario_id)
    
    #estado
    if estado:
        citas = citas.filter(id_estado__nombre = estado)
    #doctor
    if doctor:
        citas = citas.annotate(
        nombre_completo=Concat(
            "id_medico__nombre",
            Value(" "),
            "id_medico__apellido"
        )
    ).filter(
        nombre_completo__icontains=doctor
    )
    #ciudad
    if ciudad:
        citas = citas.filter(id_medico__ciudad= ciudad)
    #departamento
    if departamento:
        citas = citas.filter(id_medico__ciudad__departamento = departamento)
    #especialidad
    if especialidad:
        citas = citas.filter(id_medico__id_especialidad__nombre__icontains = especialidad)
    #fecha
    if fecha:
        fecha_obj = datetime.strptime(
            fecha,
            "%Y-%m-%d"
        ).date()

        inicio = timezone.make_aware(
            datetime.combine(
                fecha_obj,
                datetime.min.time()
            )
        )

        fin = inicio + timedelta(days=1)

        citas = citas.filter(
            fecha_programada__gte=inicio,
            fecha_programada__lt=fin
        )
    citas = citas.order_by("-fecha_programada")
    if page is None:
        serializer = CitaSerializer(citas, many=True)
    try:
        page_size = int(page_size)
    except (TypeError, ValueError):
        page_size = 10
    
    paginator = Paginator(citas, page_size)
    page_obj = paginator.get_page(page)
    serializer = CitaSerializer(page_obj.object_list, many=True)
    
    return {
            "data": serializer.data,
            "paginacion": {
                "count": paginator.count,
                "total_pages": paginator.num_pages,
                "current_page": page_obj.number,
                "page_size": page_size,
            },
        }, 200

def listarCitasMedicoService(medico_id):
    citas = Cita.objects.filter(id_medico=medico_id).order_by('-fecha_programada')
    if not citas.exists():
        return 'No se encontraron citas', 404
    serializer = CitaSerializer(citas, many=True)
    return serializer.data, 200

def obtenerCitaService(id, solicitante_id):
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
        medico_logueado = Medico.objects.filter(id=usuario_id).first()
        if medico_logueado:
            return 'Solo pacientes pueden crear citas', 400
        return 'El usuario no existe', 404
    
    medico = Medico.objects.filter(id=datos['id_medico']).first()
    if not medico:
        return 'Médico no encontrado', 404

    if datos['fecha_programada'] < timezone.now() + timedelta(hours=1):
        return 'La cita debe programarse con al menos 1 hora de anticipación', 400

    if Cita.objects.filter(
        id_medico=medico,
        fecha_programada=datos['fecha_programada']
    ).exists():
        return 'El médico ya tiene una cita en esa fecha y hora', 400

    estado = Estado.objects.filter(nombre='pendiente').first()
    if not estado:
        return 'Estado pendiente no configurado', 500
        
    cita = Cita.objects.create(
        fecha_programada = datos['fecha_programada'],
        id_usuario_id    = usuario_id,
        id_medico        = medico,
        id_estado        = estado,
    )
    
    fecha_fmt = cita.fecha_programada.strftime("%d/%m/%Y a las %H:%M")
    cita_data = CitaSerializer(cita).data  # 👈 Serializamos los datos completos de la cita

    # 1. Notificación + Datos Cita para Paciente
    enviarNotificacion(
        titulo='Cita solicitada',
        mensaje=f'Tu cita con el Dr. {cita.id_medico.nombre} {fecha_fmt} hs fue agendada con éxito. Queda en espera de la confirmación del médico.',
        tipo='cita_pendiente',
        id_usuario=cita.id_usuario_id,
        extra_data={
            "tipo_evento": "NUEVA_SOLICITUD",
            "cita": cita_data
        }
    )
    
    # 2. Notificación + Datos Cita para Médico
    enviarNotificacion(
        titulo='Nueva solicitud de cita',
        mensaje=f'El paciente {cita.id_usuario.nombre} {cita.id_usuario.apellido} ha solicitado una cita para el {fecha_fmt} hs. Revisa tu agenda para confirmarla.',
        tipo='nueva_solicitud',
        id_medico=cita.id_medico_id,
        extra_data={
            "tipo_evento": "NUEVA_SOLICITUD",
            "cita": cita_data
        }
    )   

    return cita_data, 201

def editarCitaService(id, datos, usuario_id):
    cita = Cita.objects.filter(Q(id_usuario=usuario_id) | Q(id_medico=usuario_id), id=id).first()
    if not cita:
        return 'Cita no encontrada o no te pertenece', 404

    if cita.id_estado.nombre in ['cancelada', 'completada']:
        return 'No se puede editar una cita cancelada o completada', 400

    fecha_antigua = cita.fecha_programada
    nueva_fecha = datos.get('fecha_programada')
    
    if nueva_fecha:
        if nueva_fecha < timezone.now():
            return 'La fecha programada debe ser futura', 400

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
        cita_data = CitaSerializer(cita).data

        enviarNotificacion(
            titulo='Cita reprogramada',
            mensaje=f'Tu cita con el Dr. {cita.id_medico.nombre} {cita.id_medico.apellido} fue reprogramada para el {fecha_fmt} hs.',
            tipo='cita_reprogramada',
            id_usuario=cita.id_usuario_id,
            extra_data={
                "tipo_evento": "ACTUALIZACION_CITA",
                "cita": cita_data
            }
        )
        
        enviarNotificacion(
            titulo='Cita reprogramada',
            mensaje=f'La cita con el paciente {cita.id_usuario.nombre} {cita.id_usuario.apellido} fue reprogramada para el {fecha_fmt} hs. Revisa tu agenda para confirmarla.',
            tipo='cita_reprogramada',
            id_medico=cita.id_medico_id,
            extra_data={
                "tipo_evento": "ACTUALIZACION_CITA",
                "cita": cita_data
            }
        ) 
            
    return CitaSerializer(cita).data, 200

def cancelarCitaService(id, solicitante_id):
    cita = Cita.objects.filter(id=id).first()
    if not cita:
        return 'Cita no encontrada', 404

    if cita.id_usuario_id != solicitante_id and cita.id_medico_id != solicitante_id:
        return 'No tienes permiso para cancelar esta cita', 403

    if cita.id_estado.nombre == 'cancelada':
        return 'La cita ya está cancelada', 400

    if cita.id_estado.nombre == 'completada':
        return 'No se puede cancelar una cita completada', 400

    estado_cancelada = Estado.objects.filter(nombre='cancelada').first()
    cita.id_estado = estado_cancelada
    cita.fecha_cancelacion = timezone.now()
    cita.save()

    fecha_fmt = cita.fecha_programada.strftime("%d/%m/%Y a las %H:%M")
    cita_data = CitaSerializer(cita).data

    enviarNotificacion(
        titulo='Cita cancelada',
        mensaje=f'Tu cita con el Dr. {cita.id_medico.nombre} {cita.id_medico.apellido} del {fecha_fmt} ha sido cancelada.',
        tipo='cita_cancelada',
        id_usuario=cita.id_usuario_id,
        extra_data={
            "tipo_evento": "ACTUALIZACION_CITA",
            "cita": cita_data
        }
    )
    enviarNotificacion(
        titulo='Cita cancelada',
        mensaje=f'Tu cita con el paciente {cita.id_usuario.nombre} {cita.id_medico.apellido} del {fecha_fmt} ha sido cancelada.',
        tipo='cita_cancelada',
        id_medico=cita.id_medico.id,
        extra_data={
            "tipo_evento": "ACTUALIZACION_CITA",
            "cita": cita_data
        }
    )

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
    cita_data = CitaSerializer(cita).data
    enviarNotificacion(
        titulo='Consulta finalizada',
        mensaje=f'Tu consulta con el Dr. {cita.id_medico.nombre} {cita.id_medico.apellido} del {fecha_fmt} ha finalizado. Ya puedes revisar el resumen e indicaciones en tu historial.',
        tipo='cita_completada', 
        id_usuario=cita.id_usuario_id,
        extra_data={
            "tipo_evento": "ACTUALIZACION_CITA",
            "cita": cita_data
        }
    )
    enviarNotificacion(
        titulo='Consulta finalizada',
        mensaje=f'Tu consulta con el paciente {cita.id_usuario.nombre} {cita.id_usuario.apellido} del {fecha_fmt} ha finalizado.',
        tipo='cita_completada', 
        id_medico=cita.id_medico_id,
        extra_data={
            "tipo_evento": "ACTUALIZACION_CITA",
            "cita": cita_data
        }
    )

    return cita_data, 200

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
    cita_data = CitaSerializer(cita).data

    enviarNotificacion(
        titulo='Cita confirmada',
        mensaje=f'Tu cita del {fecha_fmt} ha sido confirmada por el Dr. {cita.id_medico.nombre} {cita.id_medico.apellido}',
        tipo='cita_confirmada',
        id_usuario=cita.id_usuario_id,
        extra_data={
            "tipo_evento": "ACTUALIZACION_CITA",
            "cita": cita_data
        }
    )
    enviarNotificacion(
        titulo='Cita confirmada',
        mensaje=f'Confirmaste la cita con el paciente {cita.id_usuario.nombre} {cita.id_medico.apellido} para el {fecha_fmt} hs',
        tipo='cita_confirmada',
        id_medico=cita.id_medico_id,
        extra_data={
            "tipo_evento": "ACTUALIZACION_CITA",
            "cita": cita_data
        }
    )

    return cita_data, 200

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