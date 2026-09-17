import bcrypt
import calendar
from django.utils import timezone
from datetime import timedelta
from citas.models import Cita
from notificaciones.models import Notificacion
from medicos.models import Medico, Especialidad,SolicitudValidacionMedico
from users.models import Usuario
from historial_medico.models import HistorialClinico
from catalogos.models import Rol, Ciudad
from medicos.serializers import (
    EspecialidadSerializer,
    MedicoPerfilSerializer,
    EditarMedicoSerializer,
    RegistrarEspecialidadSerializer,
    EditarEspecialidadSerializer,
    MedicosPublicosSerializer,
    SolicitudValidacionMedicoSerializer,
)
from users.serializers import MedicoSerializer
from django.core.paginator import Paginator
from django.db.models import Q,Value,OuterRef, Subquery,Count
from django.db.models.functions import Concat
from storage_app.services import guardar_archivo_medico
from django.db import transaction
from storage_app.services import generar_url_firmada
from medicos.paginacion import PaginacionSolicitudesValidacion
from utils import enviarCorreoMedicoAprobado,enviarCorreoMedicoRechazado

# ── SERVICIOS DE MÉDICOS ──────────────────────────────────────────────────────

# Retorna la lista completa de médicos registrados
def listarMedicosService():
    medicos = Medico.objects.all()
    serializer = MedicoSerializer(medicos, many=True)
    return serializer.data, 200

def listarMedicosPublicosService(
    search=None,
    especialidad=None,
    departamento=None,
    ciudad=None
):
    medicos = Medico.objects.select_related(
        'id_especialidad',
        'ciudad',
        'ciudad__departamento'
    ).all()

    if search:
        terminos = search.strip().split()

        for termino in terminos:
            medicos = medicos.filter(
                Q(nombre__icontains=termino) |
                Q(apellido__icontains=termino)
            )

    if especialidad:
        medicos = medicos.filter(id_especialidad_id=especialidad)

    if departamento:
        medicos = medicos.filter(ciudad__departamento_id=departamento)

    if ciudad:
        medicos = medicos.filter(ciudad_id=ciudad)
        
    serializer = MedicosPublicosSerializer(medicos,many=True)
    return serializer.data, 200

def listarSolicitudesValidacionService(
    request,
    busqueda=None,
    estado=None,
    especialidad=None,
    departamento=None,
    ciudad=None,
):
    solicitudes = (
        SolicitudValidacionMedico.objects
        .filter(
            estado__in=[
                SolicitudValidacionMedico.EstadoSolicitud.PENDIENTE,
                SolicitudValidacionMedico.EstadoSolicitud.RECHAZADO,
            ]
        )
        .select_related(
            "medico",
            "medico__id_especialidad",
            "medico__ciudad",
            "medico__ciudad__departamento",
            "hoja_vida",
        )
        .annotate(
            nombre_completo=Concat(
                "medico__nombre",
                Value(" "),
                "medico__apellido"
            )
        )
        .order_by("-fecha_solicitud", "-id")
    )

    if busqueda:
        busqueda = busqueda.strip()

        solicitudes = solicitudes.filter(
            Q(medico__nombre__icontains=busqueda) |
            Q(medico__apellido__icontains=busqueda) |
            Q(medico__cedula__icontains=busqueda) |
            Q(nombre_completo__icontains=busqueda)
        )

    if estado:
        solicitudes = solicitudes.filter(
            estado=estado
        )

    if especialidad:
        solicitudes = solicitudes.filter(
            medico__id_especialidad_id=especialidad
        )

    if departamento:
        solicitudes = solicitudes.filter(
            medico__ciudad__departamento_id=departamento
        )

    if ciudad:
        solicitudes = solicitudes.filter(
            medico__ciudad_id=ciudad
        )

    paginador = PaginacionSolicitudesValidacion()
    pagina = paginador.paginate_queryset(solicitudes, request)
    data = SolicitudValidacionMedicoSerializer(pagina, many=True).data

    return paginador.get_paginated_response(data).data, 200

def obtenerMetricasValidacionMedicosService():

    ultima_solicitud = (
        SolicitudValidacionMedico.objects
        .filter(medico=OuterRef("pk"))
        .order_by("-fecha_solicitud")
        .values("estado")[:1]
    )

    medicos = Medico.objects.annotate(
        estado_validacion=Subquery(ultima_solicitud)
    )

    metricas = medicos.aggregate(
        pendientes=Count(
            "id",
            filter=Q(
                estado_validacion=SolicitudValidacionMedico.EstadoSolicitud.PENDIENTE
            )
        ),
        rechazados=Count(
            "id",
            filter=Q(
                estado_validacion=SolicitudValidacionMedico.EstadoSolicitud.RECHAZADO
            )
        ),
        aprobados=Count(
            "id",
            filter=Q(
                estado_validacion=SolicitudValidacionMedico.EstadoSolicitud.APROBADO
            )
        ),
    )

    return metricas, 200

def obtenerHojaVidaSolicitudService(solicitud_id):
    try:
        solicitud = (
            SolicitudValidacionMedico.objects
            .select_related("hoja_vida")
            .get(id=solicitud_id)
        )

        archivo = solicitud.hoja_vida

        url = generar_url_firmada(
            archivo.storage_key,
            expiracion=600
        )

        data = {
            "nombre": archivo.nombre_original,
            "url": url,
            "expiracion": 600,
        }

        return data, 200

    except SolicitudValidacionMedico.DoesNotExist:
        return None, 404
    
def aprobarSolicitudValidacionService(solicitud_id):
    try:
        solicitud = (
            SolicitudValidacionMedico.objects
            .select_related("medico")
            .get(id=solicitud_id)
        )

        if solicitud.estado != SolicitudValidacionMedico.EstadoSolicitud.PENDIENTE:
            return None, 400

        solicitud.estado = SolicitudValidacionMedico.EstadoSolicitud.APROBADO
        solicitud.fecha_revision = timezone.now()
        solicitud.motivo_rechazo = None
        solicitud.puede_reintentar_desde = None

        solicitud.save(
            update_fields=[
                "estado",
                "fecha_revision",
                "motivo_rechazo",
                "puede_reintentar_desde",
            ]
        )

        enviarCorreoMedicoAprobado(solicitud.medico)

        return {
            "id": solicitud.id,
            "medico_id": solicitud.medico_id,
            "estado": solicitud.estado,
            "fecha_revision": solicitud.fecha_revision,
        }, 200

    except Exception as e:
        print("ERROR APROBANDO SOLICITUD")

def rechazarSolicitudValidacionService(solicitud_id, motivo_rechazo):
    try:
        solicitud = (
            SolicitudValidacionMedico.objects
            .select_related("medico")
            .get(id=solicitud_id)
        )

        if solicitud.estado != SolicitudValidacionMedico.EstadoSolicitud.PENDIENTE:
            return None, 400

        ahora = timezone.now()

        solicitud.estado = SolicitudValidacionMedico.EstadoSolicitud.RECHAZADO
        solicitud.motivo_rechazo = motivo_rechazo
        solicitud.fecha_revision = ahora
        solicitud.puede_reintentar_desde = ahora + timedelta(days=30)

        solicitud.save(
            update_fields=[
                "estado",
                "motivo_rechazo",
                "fecha_revision",
                "puede_reintentar_desde",
            ]
        )

        enviarCorreoMedicoRechazado(
            solicitud.medico,
            solicitud.motivo_rechazo,
            solicitud.puede_reintentar_desde,
        )

        return {
            "id": solicitud.id,
            "medico_id": solicitud.medico_id,
            "estado": solicitud.estado,
            "motivo_rechazo": solicitud.motivo_rechazo,
            "fecha_revision": solicitud.fecha_revision,
            "puede_reintentar_desde": solicitud.puede_reintentar_desde,
        }, 200

    except SolicitudValidacionMedico.DoesNotExist:
        return None, 404

# Retorna los datos de un médico específico por su ID
def obtenerMedicoService(id_medico):
    medico = Medico.objects.filter(id=id_medico).first()

    if not medico:
        return 'Médico no encontrado', 404

    serializer = MedicoPerfilSerializer(medico)

    return serializer.data, 200


# Crea un nuevo médico tras validar datos, unicidad de correo/cédula y existencia de relaciones
@transaction.atomic
def crearMedicoService(data_validada):

    # Verifica que el correo no esté en uso por otro médico o usuario
    if Usuario.objects.filter(
        correo=data_validada['correo']
    ).exists() or Medico.objects.filter(
        correo=data_validada['correo']
    ).exists():

        return {
            'correo': ['El correo ya está registrado']
        }, 400

    # Verifica que la cédula no esté en uso por otro médico o usuario
    if Usuario.objects.filter(
        cedula=data_validada['cedula']
    ).exists() or Medico.objects.filter(
        cedula=data_validada['cedula']
    ).exists():

        return {
            'cedula': ['La cédula ya está registrada']
        }, 400

    # Verifica que la especialidad enviada exista
    especialidad = Especialidad.objects.filter(
        id=data_validada['id_especialidad']
    ).first()

    if not especialidad:
        return {
            'id_especialidad': ['Especialidad no encontrada']
        }, 404

    # Verifica que la ciudad enviada exista
    ciudad = Ciudad.objects.filter(
        id=data_validada['ciudad']
    ).first()

    if not ciudad:
        return {
            'ciudad': ['Ciudad no encontrada']
        }, 404

    # Busca el rol doctor
    rol = Rol.objects.filter(
        nombre='doctor'
    ).first()

    if not rol:
        return {
            'general': ['Rol médico no encontrado']
        }, 404

    hoja_vida = data_validada["hoja_vida"]
    
    # Encripta la contraseña
    password_encriptada = bcrypt.hashpw(
        data_validada['contraseña'].encode('utf-8'),
        bcrypt.gensalt()
    ).decode('utf-8')

    # Crea el médico
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

    try:
        # Guarda PDF y retorna el registro Archivo
        archivo_hoja_vida = guardar_archivo_medico(
            archivo=hoja_vida,
            medico_id=medico.id,
            categoria="hoja_vida"
        )
        
        # Crear primera solicitud
        SolicitudValidacionMedico.objects.create(
            medico=medico,
            hoja_vida=archivo_hoja_vida
        )

    except Exception as error:

        print(
            "Error creando solicitud de validación médica:",
            error
        )

        # Al lanzar excepción,
        # transaction.atomic revierte
        # la creación del médico.
        raise
    
    return MedicoPerfilSerializer(medico).data, 201


# Actualiza los campos enviados de un médico existente
def actualizarMedicoService(id_medico, data):

    medico = Medico.objects.filter(
        id=id_medico
    ).first()

    if not medico:
        return 'Médico no encontrado', 404

    serializer = EditarMedicoSerializer(data=data)

    if not serializer.is_valid():
        return serializer.errors, 400

    data_validada = serializer.validated_data

    # Verifica que el nuevo correo no pertenezca a otro médico
    if 'correo' in data_validada:

        if Medico.objects.filter(
            correo=data_validada['correo']
        ).exclude(id=id_medico).exists():

            return {
                'correo': [
                    'Ya existe un médico con ese correo'
                ]
            }, 400

    # Actualiza los campos
    for campo, valor in data_validada.items():

        if campo == 'id_especialidad':

            especialidad = Especialidad.objects.filter(
                id=valor
            ).first()

            if not especialidad:
                return {
                    'id_especialidad': [
                        'Especialidad no encontrada'
                    ]
                }, 404

            medico.id_especialidad = especialidad

        elif campo == 'ciudad':

            ciudad_obj = Ciudad.objects.filter(
                id=valor
            ).first()

            if not ciudad_obj:
                return {
                    'ciudad': [
                        'Ciudad no encontrada'
                    ]
                }, 404

            medico.ciudad = ciudad_obj

        elif campo == 'contraseña':

            password_encriptada = bcrypt.hashpw(
                valor.encode('utf-8'),
                bcrypt.gensalt()
            ).decode('utf-8')

            medico.contraseña = password_encriptada

        else:

            setattr(
                medico,
                campo,
                valor
            )

    medico.save()

    return MedicoPerfilSerializer(medico).data, 200


# Elimina un médico por su ID
def eliminarMedicoService(id_medico):

    medico = Medico.objects.filter(
        id=id_medico
    ).first()

    if not medico:
        return 'Médico no encontrado', 404

    medico.delete()

    return 'Médico eliminado correctamente', 200


# ── SERVICIOS DE ESPECIALIDADES ───────────────────────────────────────────────

# Retorna especialidades con paginación y búsqueda opcional
def listarEspecialidadesService(page=None, page_size=10, search=None):

    especialidades = Especialidad.objects.all()

    if search:
        especialidades = especialidades.filter(
            nombre__icontains=search
        )

    especialidades = especialidades.order_by('nombre')

    if page is None:

        serializer = EspecialidadSerializer(
            especialidades,
            many=True
        )

        return serializer.data, 200

    try:
        page_size = int(page_size)

    except (TypeError, ValueError):

        page_size = 10

    paginator = Paginator(
        especialidades,
        page_size
    )

    page_obj = paginator.get_page(page)

    serializer = EspecialidadSerializer(
        page_obj.object_list,
        many=True
    )

    return {
        "resultados": serializer.data,

        "paginacion": {
            "count": paginator.count,
            "total_pages": paginator.num_pages,
            "current_page": page_obj.number,
            "page_size": page_size,
        },

    }, 200


# Retorna una especialidad específica
def obtenerEspecialidadService(id_especialidad):

    especialidad = Especialidad.objects.filter(
        id=id_especialidad
    ).first()

    if not especialidad:
        return 'Especialidad no encontrada', 404

    serializer = EspecialidadSerializer(
        especialidad
    )

    return serializer.data, 200


# Crea una nueva especialidad
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

        return {
            'nombre': [
                'La especialidad ya existe'
            ]
        }, 400

    especialidad = Especialidad.objects.create(
        nombre=data_validada['nombre']
    )

    return EspecialidadSerializer(
        especialidad
    ).data, 201


# Actualiza el nombre de una especialidad
def editarEspecialidadService(id_especialidad, data):

    especialidad = Especialidad.objects.filter(
        id=id_especialidad
    ).first()

    if not especialidad:
        return 'Especialidad no encontrada', 404

    serializer = EditarEspecialidadSerializer(
        data=data
    )

    if not serializer.is_valid():
        return serializer.errors, 400

    data_validada = serializer.validated_data

    if Especialidad.objects.filter(
        nombre__iexact=data_validada['nombre']
    ).exclude(
        id=id_especialidad
    ).exists():

        return {
            'nombre': [
                'Ya existe una especialidad con ese nombre'
            ]
        }, 400

    especialidad.nombre = data_validada['nombre']

    especialidad.save()

    return EspecialidadSerializer(
        especialidad
    ).data, 200


# Elimina una especialidad
def eliminarEspecialidadService(id_especialidad):

    especialidad = Especialidad.objects.filter(
        id=id_especialidad
    ).first()

    if not especialidad:
        return 'Especialidad no encontrada', 404

    especialidad.delete()

    return 'Especialidad eliminada correctamente', 200


# ── DASHBOARD DEL MÉDICO ──────────────────────────────────────────────────────

def obtenerDashboardMedicoInicioService(id):

    fecha_actual = timezone.now()

    medico = Medico.objects.filter(
        id=id
    ).first()

    if not medico:
        return "Médico no encontrado", 404

    nombreCompletoMedico = (
        f"{medico.nombre} {medico.apellido}"
    )

    # ==========================
    # CITAS DE HOY
    # ==========================

    citasHoy = Cita.objects.filter(
        id_medico=medico,
        fecha_programada__date=fecha_actual.date()
    ).order_by(
        "fecha_programada"
    )

    citas_hoy = []

    for cita in citasHoy:

        citas_hoy.append({
            "id": cita.id,
            "fecha_programada": cita.fecha_programada,
            "paciente": (
                f"{cita.id_usuario.nombre} "
                f"{cita.id_usuario.apellido}"
            ),
            "correo": cita.id_usuario.correo,
            "telefono": cita.id_usuario.telefono,
            "estado": cita.id_estado.nombre,
        })

    # ==========================
    # PROXIMAS CITAS
    # ==========================

    ahora = timezone.now()

    proximasCitasQuery = Cita.objects.filter(
        id_medico=medico,
        fecha_programada__gte=ahora
    ).exclude(
        id_estado__nombre__iexact="cancelada"
    ).exclude(
        id_estado__nombre__iexact="completada"
    ).select_related(
        "id_usuario",
        "id_medico",
        "id_estado"
    ).order_by(
        "fecha_programada"
    )[:3]


    proximas_citas = []

    for cita in proximasCitasQuery:

        proximas_citas.append({
            "id": cita.id,
            "fecha_programada": cita.fecha_programada,

            "paciente": (
                f"{cita.id_usuario.nombre} "
                f"{cita.id_usuario.apellido}"
            ),

            "correo": cita.id_usuario.correo,
            "telefono": cita.id_usuario.telefono,

            "estado": cita.id_estado.nombre,

            "foto_paciente": (
                cita.id_usuario.foto_perfil.url
                if cita.id_usuario.foto_perfil
                else None
            ),
        })

    # ==========================
    # FECHAS DEL MES
    # ==========================

    primer_dia = fecha_actual.replace(
        day=1,
        hour=0,
        minute=0,
        second=0,
        microsecond=0
    )

    ultimo_dia = fecha_actual.replace(
        day=calendar.monthrange(
            fecha_actual.year,
            fecha_actual.month
        )[1],
        hour=23,
        minute=59,
        second=59
    )

    # ==========================
    # ESTADÍSTICAS
    # ==========================

    pacientesTotales = Cita.objects.filter(
        id_medico=medico
    ).values(
        "id_usuario"
    ).distinct().count()

    numeroCitasHoy = citasHoy.count()

    # Aún no existe módulo de recetas
    recetasEmitidas = 0

    diagnosticos = HistorialClinico.objects.filter(
        medico=medico
    ).count()

    numeroNoLeidas = Notificacion.objects.filter(
        id_medico=medico,
        leida=False
    ).count()

    # ==========================
    # NOTIFICACIONES
    # ==========================

    tresNotificaciones = Notificacion.objects.filter(
        id_medico=medico
    ).order_by(
        "-fecha"
    )[:3]

    notificaciones = []

    for notificacion in tresNotificaciones:

        notificaciones.append({
            "id": notificacion.id,
            "titulo": notificacion.titulo,
            "mensaje": notificacion.mensaje,
            "tipo": notificacion.tipo,
            "leida": notificacion.leida,
            "fecha": notificacion.fecha,
            "medico": nombreCompletoMedico
        })

    # ==========================
    # RESPUESTA
    # ==========================

    data = {

        "usuario": nombreCompletoMedico,

        "especialidad": medico.id_especialidad.nombre,

        "foto_perfil": medico.foto_perfil.url if medico.foto_perfil else None,

        "id": medico.id,

        "estadisticas": {

            "pacientes_totales": pacientesTotales,

            "citas_hoy": numeroCitasHoy,

            "recetas_emitidas": recetasEmitidas,

            "diagnosticos": diagnosticos,

            "notificaciones_no_leidas": numeroNoLeidas,

        },

        "citas_hoy": citas_hoy,

        "proximas_citas": proximas_citas,

        "notificaciones": notificaciones,

    }

    return data, 200


# ── PERFIL DEL MÉDICO ─────────────────────────────────────────────────────────

# Obtiene el perfil completo del médico
def obtenerPerfilMedicoService(id_medico):

    medico = Medico.objects.filter(
        id=id_medico
    ).first()

    if not medico:
        return 'Médico no encontrado', 404

    serializer = MedicoPerfilSerializer(
        medico
    )

    return serializer.data, 200


# Actualiza los datos del perfil del médico
def editarPerfilMedicoService(id_medico, data):

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

    # Validar correo
    if 'correo' in data_validada:

        correo = data_validada['correo']

        correo_medico_existe = Medico.objects.filter(
            correo=correo
        ).exclude(
            id=id_medico
        ).exists()

        correo_usuario_existe = Usuario.objects.filter(
            correo=correo
        ).exists()

        if correo_medico_existe or correo_usuario_existe:
            return {
                'correo': [
                    'El correo ya está registrado'
                ]
            }, 400

    # Validar especialidad
    if 'id_especialidad' in data_validada:

        especialidad = Especialidad.objects.filter(
            id=data_validada['id_especialidad']
        ).first()

        if not especialidad:
            return {
                'id_especialidad': [
                    'Especialidad no encontrada'
                ]
            }, 404

        medico.id_especialidad = especialidad

    # Validar ciudad
    if 'ciudad' in data_validada:

        ciudad = Ciudad.objects.filter(
            id=data_validada['ciudad']
        ).first()

        if not ciudad:
            return {
                'ciudad': [
                    'Ciudad no encontrada'
                ]
            }, 404

        medico.ciudad = ciudad

    # Campos normales
    campos_actualizables = [
        'nombre',
        'apellido',
        'telefono',
        'correo',
        'fecha_nacimiento',
        'direccion',
    ]

    for campo in campos_actualizables:

        if campo in data_validada:
            setattr(
                medico,
                campo,
                data_validada[campo]
            )

    medico.save()

    return MedicoPerfilSerializer(
        medico
    ).data, 200


# ── FOTO DE PERFIL ────────────────────────────────────────────────────────────

def actualizarFotoPerfilMedicoService(medico, foto):
    nombre_foto_anterior = (
        medico.foto_perfil.name
        if medico.foto_perfil
        else None
    )

    storage = medico.foto_perfil.storage

    # Guardar primero la nueva foto
    medico.foto_perfil = foto

    medico.save(
        update_fields=["foto_perfil"]
    )

    # Borrar la foto anterior directamente desde el storage
    if nombre_foto_anterior:
        storage.delete(nombre_foto_anterior)

    return medico

def eliminarFotoPerfilMedicoService(medico):
    if medico.foto_perfil:
        nombre_foto = medico.foto_perfil.name
        storage = medico.foto_perfil.storage

        storage.delete(nombre_foto)

    medico.foto_perfil = None

    medico.save(
        update_fields=["foto_perfil"]
    )

    return medico
