from users.models import Usuario
from medicos.models import Medico
from citas.models import Cita
from calificaciones.models import Calificacion
from django.db import IntegrityError
from datetime import timedelta
from django.utils import timezone
from django.db.models import Avg, Count, Q
from notificaciones.services import enviarNotificacion


def crearCalificacionesServices(data,usuario):
    
    if not isinstance(usuario,Usuario):
            return "Debes de ser un paciente para registrar una calificacion.",403
    
    if usuario.id_rol.nombre.lower() != "paciente":
            return "Debes de ser un paciente para registrar una calificacion.",403
        
    cita = Cita.objects.filter(id=data["id_cita"],id_usuario=usuario).first()

    if not cita:
        return "La cita no existe o no te pertenece.", 404
        
    if cita.id_estado.nombre.lower() != "completada":
        return "Solo puedes calificar citas completadas.",400
    
    if Calificacion.objects.filter(id_cita=cita).exists():
        return "Esta cita ya tiene una calificación registrada.", 409
    
    try:

        Calificacion.objects.create(
            id_cita=cita,
            puntuacion=data["puntuacion"],
            comentario=data.get("comentario", ""),
            es_publica=data.get("es_publica", False)
        )

    except IntegrityError:
        return "Esta cita ya tiene una calificación registrada.", 409

    
    return "Calificación creada correctamente.",201

def actualizarCalificacionServices(data,id_calificacion,usuario):
    
    if not isinstance(usuario,Usuario):
        return "Debes de ser un paciente para editar una calificacion.",403
    
    if usuario.id_rol.nombre.lower() != "paciente":
        return "Debes de ser un paciente para editar una calificacion.",403
    
    calificacion = Calificacion.objects.filter(id = id_calificacion, id_cita__id_usuario = usuario.id).first()
    
    if not calificacion:
        return "No se encontro la calificacion o no te pertenece.",404
    
    fecha_limite = calificacion.fecha_creacion + timedelta(hours=24)
    
    if timezone.now() >  fecha_limite:
        return "No puedes editar la calificación después de 24 horas de su registro.", 403
    
    calificacion.puntuacion = data.get("puntuacion",calificacion.puntuacion)
    calificacion.comentario = data.get("comentario",calificacion.comentario)
    
    calificacion.save()
    
    return "Campos actualizados correctamente.",200

#Listar las calificaciones que son públicas de cada médico
def listarCalificacionesMedicoService(id_medico):

    if not Medico.objects.filter(id=id_medico).exists():
        return "El médico no existe.", 404

    calificaciones = Calificacion.objects.filter(id_cita__id_medico_id=id_medico,es_publica=True).order_by("-fecha_creacion")

    return calificaciones, 200

# Listar las calificaciones privadas de cada médico
def listarMisCalificacionesMedicoService(medico):

    # Validar que el usuario sea un médico
    if not isinstance(medico, Medico):
        return "Debes ser un médico para consultar estas calificaciones.", 403

    # Obtener todas las calificaciones recibidas
    calificaciones = Calificacion.objects.filter(
        id_cita__id_medico=medico
    ).order_by("-fecha_creacion")

    return calificaciones, 200

def obtenerPromedioCalificacionesMedicoService(id_medico):

    # Verificar que el médico exista
    if not Medico.objects.filter(id=id_medico).exists():
        return "El médico no existe.", 404

    # Consultar todas las calificaciones del médico
    calificaciones = Calificacion.objects.filter(id_cita__id_medico_id=id_medico)

    # Obtener promedio, total y distribución
    estadisticas = calificaciones.aggregate(
        promedio=Avg("puntuacion"),
        total_calificaciones=Count("id"),

        estrellas_5=Count("id", filter=Q(puntuacion=5)),
        estrellas_4=Count("id", filter=Q(puntuacion=4)),
        estrellas_3=Count("id", filter=Q(puntuacion=3)),
        estrellas_2=Count("id", filter=Q(puntuacion=2)),
        estrellas_1=Count("id", filter=Q(puntuacion=1))
    )

    resultado = {
        "promedio": round(estadisticas["promedio"] or 0, 2),

        "total_calificaciones": estadisticas["total_calificaciones"],

        "distribucion": {
            "5": estadisticas["estrellas_5"],
            "4": estadisticas["estrellas_4"],
            "3": estadisticas["estrellas_3"],
            "2": estadisticas["estrellas_2"],
            "1": estadisticas["estrellas_1"]
        }
    }

    return resultado, 200

def actualizarVisibilidadCalificacionService(data, id_calificacion, usuario):

    if not isinstance(usuario, Usuario):
        return "Debes ser un paciente para modificar la visibilidad.", 403

    if usuario.id_rol.nombre.lower() != "paciente":
        return "Debes ser un paciente para modificar la visibilidad.", 403

    calificacion = Calificacion.objects.filter(
        id=id_calificacion,
        id_cita__id_usuario=usuario
    ).first()

    if not calificacion:
        return "La calificación no existe o no te pertenece.", 404

    calificacion.es_publica = data["es_publica"]

    calificacion.save(
        update_fields=["es_publica", "fecha_actualizacion"]
    )

    return "Visibilidad de la calificación actualizada correctamente.", 200