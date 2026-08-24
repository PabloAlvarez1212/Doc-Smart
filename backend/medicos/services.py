import bcrypt
import calendar
from django.utils import timezone
from citas.models import Cita
from notificaciones.models import Notificacion
from medicos.models import Medico, Especialidad
from users.models import Usuario
from historial_medico.models import HistorialClinico
from catalogos.models import Rol, Ciudad
from medicos.serializers import (
    EspecialidadSerializer,
    MedicoPerfilSerializer,
    RegistrarMedicoSerializer,
    EditarMedicoSerializer,
    RegistrarEspecialidadSerializer,
    EditarEspecialidadSerializer,
)
from users.serializers import MedicoSerializer
from django.core.paginator import Paginator


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

    if medico.foto_perfil:
        medico.foto_perfil.delete(
            save=False
        )

    medico.foto_perfil = foto

    medico.save(
        update_fields=['foto_perfil']
    )

    return medico

def eliminarFotoPerfilMedicoService(medico):

    if medico.foto_perfil:

        medico.foto_perfil.delete(
            save=False
        )

    medico.foto_perfil = None

    medico.save(
        update_fields=['foto_perfil']
    )

    return medico