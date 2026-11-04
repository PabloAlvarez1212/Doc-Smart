
from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from users.models import Usuario
from medicos.models import Medico
from citas.models import Cita
from notificaciones.services import enviarNotificacion

from .serializers import SancionSerializer
from .models import Reporte, Sancion
from .serializers import ReporteSerializer


def esAdministrador(usuario):
    return (
        isinstance(usuario, Usuario)
        and usuario.id_rol.nombre == "admin"
    )


def tieneSancionActivaService(usuario):
    ahora = timezone.now()

    filtros = {}

    if isinstance(usuario, Medico):
        filtros = {
            "reporte__medico_id": usuario.pk,
            "reporte__reportante": Reporte.Reportante.PACIENTE,
        }

    elif isinstance(usuario, Usuario):
        filtros = {
            "reporte__paciente_id": usuario.pk,
            "reporte__reportante": Reporte.Reportante.MEDICO,
        }

    else:
        return False

    return Sancion.objects.filter(
        **filtros,
        anulada_en__isnull=True,
        fecha_inicio__lte=ahora,
        fecha_fin__gt=ahora,
    ).exists()


def notificarUsuario(usuario, titulo, mensaje):
    destinatario = (
        {"id_medico": usuario.pk}
        if isinstance(usuario, Medico)
        else {"id_usuario": usuario.pk}
    )

    enviarNotificacion(
        titulo=titulo,
        mensaje=mensaje,
        tipo="reporte_actualizado",
        **destinatario,
    )


@transaction.atomic
def crearReporteService(usuario, datos):

    if isinstance(usuario, Usuario) and usuario.id_rol.nombre == "paciente":
        paciente = usuario

        medico = Medico.objects.filter(
            pk=datos["id_reportado"]
        ).exclude(
            id_rol__nombre="admin"
        ).first()

        reportante = Reporte.Reportante.PACIENTE

        if not medico:
            return "Médico no encontrado", 404

    elif isinstance(usuario, Medico) and usuario.id_rol.nombre != "admin":
        medico = usuario

        if not medico.esta_aprobado:
            return "El médico debe estar aprobado", 403

        paciente = Usuario.objects.filter(
            pk=datos["id_reportado"],
            id_rol__nombre="paciente"
        ).first()

        reportante = Reporte.Reportante.MEDICO

        if not paciente:
            return "Paciente no encontrado", 404

    else:
        return "No tienes permiso para crear reportes", 403

    if usuario.acceso_bloqueado or tieneSancionActivaService(usuario):
        return "Tu cuenta no puede crear reportes actualmente", 403

    # Debe existir una relación previa mediante una cita.
    citas = Cita.objects.filter(
        id_usuario=paciente,
        id_medico=medico
    )

    if not citas.exists():
        return "No existe una cita entre ambos usuarios", 400

    cita = None

    if datos.get("id_cita"):
        cita = citas.filter(pk=datos["id_cita"]).first()

        if not cita:
            return "La cita no pertenece a estos usuarios", 400

    # Evitar reportes abiertos duplicados entre las mismas personas.
    reporte_abierto = Reporte.objects.filter(
        paciente=paciente,
        medico=medico,
        reportante=reportante,
        estado__in=[
            Reporte.Estado.PENDIENTE,
            Reporte.Estado.EN_REVISION,
        ]
    ).exists()

    if reporte_abierto:
        return "Ya tienes un reporte pendiente contra este usuario", 400

    reporte = Reporte.objects.create(
        paciente=paciente,
        medico=medico,
        cita=cita,
        reportante=reportante,
        motivo=datos["motivo"],
        descripcion=datos["descripcion"],
    )

    return ReporteSerializer(reporte).data, 201


def listarReportesService(usuario, estado=None):

    if esAdministrador(usuario):
        reportes = Reporte.objects.all()

    elif isinstance(usuario, Medico) and usuario.id_rol.nombre != "admin":
        reportes = Reporte.objects.filter(
            medico=usuario,
            reportante=Reporte.Reportante.MEDICO
        )

    elif isinstance(usuario, Usuario) and usuario.id_rol.nombre == "paciente":
        reportes = Reporte.objects.filter(
            paciente=usuario,
            reportante=Reporte.Reportante.PACIENTE
        )

    else:
        return "No tienes permiso para consultar reportes", 403

    if estado:
        if estado not in Reporte.Estado.values:
            return "Estado de reporte no válido", 400

        reportes = reportes.filter(estado=estado)

    reportes = reportes.select_related(
        "paciente",
        "medico",
        "cita",
    )

    return ReporteSerializer(reportes, many=True).data, 200


@transaction.atomic
def gestionarReporteService(administrador, reporte_id, datos):

    if not esAdministrador(administrador):
        return "No tienes permisos de administrador", 403

    reporte = Reporte.objects.select_for_update().filter(
        pk=reporte_id
    ).first()

    if not reporte:
        return "Reporte no encontrado", 404

    if reporte.estado in [
        Reporte.Estado.RESUELTO,
        Reporte.Estado.DESCARTADO,
    ]:
        return "Este reporte ya fue cerrado", 400

    accion = datos["accion"]
    observacion = datos.get("observacion_admin", "").strip()
    ahora = timezone.now()

    if accion == "revision":
        reporte.estado = Reporte.Estado.EN_REVISION

    elif accion == "descartar":
        reporte.estado = Reporte.Estado.DESCARTADO

    elif accion == "sancionar":
        dias = datos.get("dias_suspension")

        if not isinstance(dias, int) or not 1 <= dias <= 30:
            return "La suspensión debe durar entre 1 y 30 días", 400

        # El sancionado es siempre quien recibió el reporte.
        if reporte.reportante == Reporte.Reportante.PACIENTE:
            sancionado = Medico.objects.select_for_update().get(
                pk=reporte.medico_id
            )
        else:
            sancionado = Usuario.objects.select_for_update().get(
                pk=reporte.paciente_id
            )

        if tieneSancionActivaService(sancionado):
            return "El usuario ya tiene una sanción activa", 400

        fecha_fin = ahora + timedelta(days=dias)

        sancion = Sancion.objects.create(
            reporte=reporte,
            motivo=observacion or reporte.motivo,
            fecha_inicio=ahora,
            fecha_fin=fecha_fin,
        )

        # Cancelar citas que ocurran durante la suspensión.
        filtro_citas = (
            Q(id_medico=sancionado)
            if isinstance(sancionado, Medico)
            else Q(id_usuario=sancionado)
        )

        citas = Cita.objects.filter(
            filtro_citas,
            fecha_programada__gte=ahora,
            fecha_programada__lt=fecha_fin,
        ).filter(
            Q(id_estado__nombre__iexact="pendiente")
            | Q(id_estado__nombre__iexact="confirmada")
            | Q(id_estado__nombre__iexact="reprogramada")
        ).order_by("id")

        # Se implementará en citas/services.py.
        from citas.services import cancelarCitaPorSancionService

        citas_canceladas = 0

        for cita_id in citas.values_list("id", flat=True):
            resultado, codigo = cancelarCitaPorSancionService(
                cita_id,
                sancionado,
            )

            if codigo != 200:
                raise ValidationError({
                    "citas": [resultado]
                })

            citas_canceladas += 1

        reporte.estado = Reporte.Estado.RESUELTO

        notificarUsuario(
            sancionado,
            "Cuenta suspendida",
            (
                f"Tu cuenta fue suspendida durante {dias} días. "
                f"Motivo: {sancion.motivo}"
            )
        )

    else:
        return "Acción no válida", 400

    reporte.observacion_admin = observacion
    reporte.revisado_por = administrador
    reporte.fecha_revision = ahora

    reporte.save(update_fields=[
        "estado",
        "observacion_admin",
        "revisado_por",
        "fecha_revision",
    ])

    reportante = (
        reporte.paciente
        if reporte.reportante == Reporte.Reportante.PACIENTE
        else reporte.medico
    )

    notificarUsuario(
        reportante,
        "Actualización de reporte",
        f"Tu reporte #{reporte.id} cambió al estado: {reporte.get_estado_display()}."
    )

    resultado = ReporteSerializer(reporte).data

    if accion == "sancionar":
        resultado["citas_canceladas"] = citas_canceladas

    return resultado, 200


@transaction.atomic
def anularSancionService(administrador, sancion_id):

    if not esAdministrador(administrador):
        return "No tienes permisos de administrador", 403

    sancion = Sancion.objects.select_for_update().filter(
        pk=sancion_id
    ).first()

    if not sancion:
        return "Sanción no encontrada", 404

    if sancion.anulada_en:
        return "Esta sanción ya fue anulada", 400

    if sancion.fecha_fin <= timezone.now():
        return "Esta sanción ya finalizó", 400

    sancion.anulada_en = timezone.now()
    sancion.anulada_por = administrador

    sancion.save(update_fields=[
        "anulada_en",
        "anulada_por",
    ])

    reporte = sancion.reporte

    sancionado = (
        reporte.medico
        if reporte.reportante == Reporte.Reportante.PACIENTE
        else reporte.paciente
    )

    notificarUsuario(
        sancionado,
        "Suspensión anulada",
        "Tu suspensión fue levantada por el administrador."
    )

    return "Sanción anulada correctamente", 200



def periodosSancionService(usuario, inicio, fin):
    if inicio >= fin:
        return []

    if isinstance(usuario, Medico):
        filtros = {
            "reporte__medico_id": usuario.pk,
            "reporte__reportante": Reporte.Reportante.PACIENTE,
        }

    elif isinstance(usuario, Usuario):
        filtros = {
            "reporte__paciente_id": usuario.pk,
            "reporte__reportante": Reporte.Reportante.MEDICO,
        }

    else:
        return []

    return list(
        Sancion.objects.filter(
            **filtros,
            anulada_en__isnull=True,
            fecha_inicio__lt=fin,
            fecha_fin__gt=inicio,
        ).values_list(
            "fecha_inicio",
            "fecha_fin",
        )
    )


def obtenerMiSancionService(usuario):
    ahora = timezone.now()

    if isinstance(usuario, Medico):
        sanciones = Sancion.objects.filter(
            reporte__medico_id=usuario.pk,
            reporte__reportante=Reporte.Reportante.PACIENTE,
        )

    elif (
        isinstance(usuario, Usuario)
        and usuario.id_rol.nombre.strip().lower() == "paciente"
    ):
        sanciones = Sancion.objects.filter(
            reporte__paciente_id=usuario.pk,
            reporte__reportante=Reporte.Reportante.MEDICO,
        )

    else:
        return "No tienes permiso para consultar sanciones", 403

    sancion = (
        sanciones.filter(
            anulada_en__isnull=True,
            fecha_inicio__lte=ahora,
            fecha_fin__gt=ahora,
        )
        .order_by("-fecha_inicio")
        .first()
    )

    return {
        "suspendido": sancion is not None,
        "sancion": (
            SancionSerializer(sancion).data
            if sancion
            else None
        ),
    }, 200

def listarUsuariosReportablesService(usuario):
    if (
        isinstance(usuario, Usuario)
        and usuario.id_rol.nombre == "paciente"
    ):
        personas = Medico.objects.filter(
            pk__in=Cita.objects.filter(
                id_usuario_id=usuario.pk
            ).values("id_medico_id")
        )

    elif isinstance(usuario, Medico) and usuario.esta_aprobado:
        personas = Usuario.objects.filter(
            id_rol__nombre="paciente",
            pk__in=Cita.objects.filter(
                id_medico_id=usuario.pk
            ).values("id_usuario_id")
        )

    else:
        return "No tienes permiso para consultar usuarios", 403

    personas = personas.order_by(
        "nombre", "apellido", "pk"
    ).values("id", "nombre", "apellido")

    resultado = [
        {
            "id": persona["id"],
            "nombre": (
                f'{persona["nombre"]} {persona["apellido"]}'
            ).strip()
        }
        for persona in personas
    ]

    return resultado, 200


def obtenerContextoCitaReporteService(usuario, cita_id):
    citas = Cita.objects.select_related(
        "id_usuario",
        "id_medico",
    ).filter(pk=cita_id)

    if isinstance(usuario, Medico):
        if not usuario.esta_aprobado:
            return "El médico debe estar aprobado", 403

        cita = citas.filter(id_medico_id=usuario.pk).first()
        reportado = cita.id_usuario if cita else None

    elif (
        isinstance(usuario, Usuario)
        and usuario.id_rol.nombre == "paciente"
    ):
        cita = citas.filter(id_usuario_id=usuario.pk).first()
        reportado = cita.id_medico if cita else None

    else:
        return "No tienes permiso para consultar esta cita", 403

    if not cita:
        return "Cita no encontrada o no te pertenece", 404

    return {
        "id_cita": cita.pk,
        "codigo_cita": cita.codigo_cita,
        "id_reportado": reportado.pk,
        "nombre_reportado": (
            f"{reportado.nombre} {reportado.apellido}"
        ).strip(),
    }, 200
