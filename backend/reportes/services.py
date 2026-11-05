
from datetime import timedelta
from functools import partial
import hashlib
import json
import logging
from django.core import signing

from django.db import transaction
from django.db.models import Q, Prefetch
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from users.models import Usuario
from medicos.models import Medico
from citas.models import Cita
from notificaciones.services import enviarNotificacion

from .serializers import SancionSerializer
from .models import Reporte, Sancion, HistorialReporte
from .serializers import ReporteSerializer

logger = logging.getLogger(__name__)

SITUACIONES_ADMIN = {
    "pendiente", "en_revision", "descartado", "advertido", "sancion_activa",
    "sancion_finalizada", "sancion_levantada", "resuelto", "sancion_programada",
}


def registrarDecision(reporte, accion, administrador=None, estado_anterior="", motivo="", respuesta=""):
    return HistorialReporte.objects.create(
        reporte=reporte, accion=accion, administrador=administrador,
        estado_anterior=estado_anterior, estado_nuevo=reporte.estado,
        motivo=motivo, respuesta_reportante=respuesta,
    )


def consultasReportes(reportes):
    return reportes.select_related(
        "paciente", "medico", "cita", "evidencia", "revisado_por",
        "sancion__aplicada_por", "sancion__anulada_por",
    ).prefetch_related(Prefetch("historial_administrativo",
                               queryset=HistorialReporte.objects.select_related("administrador")))


def esAdministrador(usuario):
    return (
        isinstance(usuario, Usuario)
        and usuario.id_rol.nombre == "admin"
    )


def sancionesUsuario(usuario):
    if isinstance(usuario, Medico):
        return Sancion.objects.filter(reporte__medico_id=usuario.pk,
                                     reporte__reportante=Reporte.Reportante.PACIENTE)
    if isinstance(usuario, Usuario):
        return Sancion.objects.filter(reporte__paciente_id=usuario.pk,
                                     reporte__reportante=Reporte.Reportante.MEDICO)
    return Sancion.objects.none()


def tieneSancionActivaService(usuario):
    ahora = timezone.now()
    return sancionesUsuario(usuario).filter(
        Q(fecha_fin__isnull=True) | Q(fecha_fin__gt=ahora),
        anulada_en__isnull=True, fecha_inicio__lte=ahora).exists()


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


def crearReporteService(usuario, datos):
    archivos_subidos = []
    try:
        with transaction.atomic():
            return _crearReporte(usuario, datos, archivos_subidos)
    except Exception:
        from storage_app.services import eliminar_archivo
        for key in archivos_subidos:
            try:
                if not eliminar_archivo(key):
                    logger.error("Evidencia pendiente de limpieza: %s", key)
            except Exception:
                logger.exception("No se pudo limpiar la evidencia: %s", key)
        logger.exception("No se pudo registrar el reporte")
        return "No se pudo guardar el reporte. Intenta nuevamente.", 503


def _crearReporte(usuario, datos, archivos_subidos):

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

    # Mismo orden que reservas/sanciones; también serializa reintentos.
    Usuario.objects.select_for_update().get(pk=paciente.pk)
    Medico.objects.select_for_update().get(pk=medico.pk)

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

    duplicado = Reporte.objects.filter(
        paciente=paciente, medico=medico, reportante=reportante, cita=cita,
        motivo=datos["motivo"], otro_motivo=datos.get("otro_motivo", ""),
        descripcion=datos["descripcion"],
    ).exists()
    if duplicado:
        return "Ya registraste un reporte sobre este mismo incidente", 409

    evidencia = None
    if datos.get("evidencia"):
        from storage_app.services import subir_archivo, determinar_tipo_archivo
        from storage_app.models import Archivo
        from storage_app.validators import validar_evidencia_reporte
        archivo = datos["evidencia"]
        validar_evidencia_reporte(archivo)
        metadata = subir_archivo(archivo, "reportes_privado",
                                "medico" if isinstance(usuario, Medico) else "usuario", usuario.pk)
        archivos_subidos.append(metadata["key"])
        evidencia = Archivo.objects.create(
            **({"medico": usuario} if isinstance(usuario, Medico) else {"usuario": usuario}),
            nombre_original=metadata["nombre"], storage_key=metadata["key"],
            content_type=metadata["tipo"], tamano=metadata["tamano"],
            tipo=determinar_tipo_archivo(metadata["tipo"]), categoria="reportes_privado")

    reporte = Reporte.objects.create(
        paciente=paciente,
        medico=medico,
        cita=cita,
        reportante=reportante,
        motivo=datos["motivo"],
        descripcion=datos["descripcion"],
        otro_motivo=datos.get("otro_motivo", ""), evidencia=evidencia,
    )
    registrarDecision(reporte, HistorialReporte.Accion.CREACION)
    notificarUsuario(usuario, "Reporte registrado", "Tu reporte fue registrado y será revisado por administración.")
    return ReporteSerializer(reporte).data, 201


def listarReportesService(usuario, estado=None, situacion=None):

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

    if situacion and (not esAdministrador(usuario) or situacion not in SITUACIONES_ADMIN | {"todos"}):
        return "Filtro administrativo no válido", 400
    resultado = ReporteSerializer(consultasReportes(reportes), many=True,
                                 context={"es_admin": esAdministrador(usuario), "ahora": timezone.now()}).data
    if situacion and situacion != "todos":
        resultado = [r for r in resultado if r["estado_administrativo"] == situacion]
    return resultado, 200


def usuarioReportado(reporte):
    return reporte.medico if reporte.reportante == Reporte.Reportante.PACIENTE else reporte.paciente


def citasAfectadas(usuario, inicio, fin):
    filtro = Q(id_medico=usuario) if isinstance(usuario, Medico) else Q(id_usuario=usuario)
    citas = Cita.objects.filter(filtro, fecha_programada__gte=inicio).filter(
        Q(id_estado__nombre__iexact="pendiente") | Q(id_estado__nombre__iexact="confirmada")
        | Q(id_estado__nombre__iexact="reprogramada"))
    if fin is not None:
        citas = citas.filter(fecha_programada__lt=fin)
    return citas.order_by("pk")


def datosSuspension(datos, inicio):
    tipo = datos.get("tipo", Sancion.Tipo.TEMPORAL)
    dias = datos.get("dias_suspension")
    if tipo not in Sancion.Tipo.values:
        raise ValidationError({"tipo": "Tipo de suspensión inválido."})
    if not datos.get("observacion_admin", "").strip():
        raise ValidationError({"observacion_admin": "Escribe el motivo administrativo."})
    if tipo == Sancion.Tipo.TEMPORAL:
        if type(dias) is not int or not 1 <= dias <= 30:
            raise ValidationError({"dias_suspension": "Indica entre 1 y 30 días."})
        return tipo, inicio + timedelta(days=dias)
    if dias is not None:
        raise ValidationError({"dias_suspension": "Una suspensión indefinida no lleva duración."})
    return tipo, None


def huellaVistaPrevia(reporte, administrador, datos, filas):
    payload = {"reporte": reporte.pk, "admin": administrador.pk,
               "tipo": datos.get("tipo", "temporal"), "dias": datos.get("dias_suspension"),
               "motivo": datos.get("observacion_admin", "").strip(),
               "observacion": datos.get("observacion_reportante", "").strip(), "citas": filas}
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()


def filasVistaPrevia(citas):
    return list(citas.values("id", "codigo_cita", "fecha_programada", "id_estado_id"))


def previsualizarSancionService(administrador, reporte_id, datos):
    if not esAdministrador(administrador):
        return "No tienes permisos de administrador", 403
    reporte = Reporte.objects.select_related("medico", "paciente").filter(pk=reporte_id).first()
    if not reporte:
        return "Reporte no encontrado", 404
    if reporte.estado != Reporte.Estado.EN_REVISION:
        return "Debes iniciar la revisión antes de previsualizar una sanción", 409
    sancionado = usuarioReportado(reporte)
    if tieneSancionActivaService(sancionado):
        return "El usuario ya tiene una sanción activa", 409
    inicio = timezone.now()
    tipo, fin = datosSuspension(datos, inicio)
    filas = filasVistaPrevia(citasAfectadas(sancionado, inicio, fin))
    token = signing.dumps({"huella": huellaVistaPrevia(reporte, administrador, datos, filas)},
                          salt="reportes.sancion.preview")
    return {"nombre_sancionado": f"{sancionado.nombre} {sancionado.apellido}".strip(),
            "tipo": tipo, "dias_suspension": datos.get("dias_suspension"),
            "fecha_inicio": inicio, "fecha_fin": fin, "cantidad_citas": len(filas),
            "citas": [{"codigo_cita": f["codigo_cita"], "fecha_programada": f["fecha_programada"]} for f in filas],
            "token_vista_previa": token}, 200


def bloquearAgendaSancion(sancionado):
    # Las FK de notificaciones también bloquean destinatarios en MySQL.
    # Bloquear todos los pacientes antes del médico evita invertir ese orden.
    if isinstance(sancionado, Medico):
        pacientes = set(Cita.objects.filter(id_medico=sancionado).values_list("id_usuario_id", flat=True))
        list(Usuario.objects.select_for_update().filter(pk__in=pacientes).order_by("pk"))
        Medico.objects.select_for_update().get(pk=sancionado.pk)
        actuales = set(Cita.objects.filter(id_medico=sancionado).values_list("id_usuario_id", flat=True))
        if not actuales.issubset(pacientes):
            raise ValidationError({"citas": "La agenda cambió. Solicita una nueva vista previa."})
    else:
        Usuario.objects.select_for_update().get(pk=sancionado.pk)
        ids = Cita.objects.filter(id_usuario=sancionado).values("id_medico_id")
        list(Medico.objects.select_for_update().filter(pk__in=ids).order_by("pk"))


@transaction.atomic
def gestionarReporteService(administrador, reporte_id, datos):
    if not esAdministrador(administrador):
        return "No tienes permisos de administrador", 403
    reporte = Reporte.objects.select_for_update().filter(pk=reporte_id).first()
    if not reporte:
        return "Reporte no encontrado", 404
    if reporte.estado in (Reporte.Estado.RESUELTO, Reporte.Estado.DESCARTADO):
        return "Este reporte ya fue cerrado", 409
    accion = datos["accion"]
    if accion not in ("revision", "descartar", "advertir", "sancionar"):
        return "Acción no válida", 400
    if accion != "revision" and reporte.estado != Reporte.Estado.EN_REVISION:
        return "Debes iniciar la revisión antes de tomar una decisión", 409
    observacion = datos.get("observacion_admin", "").strip()
    if accion != "revision" and (not observacion or len(observacion) > 2000):
        return "Escribe el motivo de la decisión administrativa (máximo 2000 caracteres)", 400
    estado_anterior = reporte.estado
    if accion == "revision" and reporte.estado == Reporte.Estado.EN_REVISION:
        return ReporteSerializer(reporte, context={"es_admin": True}).data, 200
    citas_canceladas = 0
    if accion == "sancionar":
        sancionado = usuarioReportado(reporte)
        if type(sancionado) is type(administrador) and sancionado.pk == administrador.pk:
            return "No puedes sancionarte a ti mismo", 403
        bloquearAgendaSancion(sancionado)
        if tieneSancionActivaService(sancionado):
            return "El usuario ya tiene una sanción activa", 409
        ahora = timezone.now()
        tipo, fin = datosSuspension(datos, ahora)
        filas = filasVistaPrevia(citasAfectadas(sancionado, ahora, fin).select_for_update())
        try:
            previa = signing.loads(datos.get("token_vista_previa", ""),
                                   salt="reportes.sancion.preview", max_age=600)
        except signing.BadSignature:
            return "Solicita una nueva vista previa antes de confirmar", 409
        if previa.get("huella") != huellaVistaPrevia(reporte, administrador, datos, filas):
            return "Las citas o la sanción cambiaron. Revisa una nueva vista previa", 409
        sancion = Sancion.objects.create(reporte=reporte, tipo=tipo, aplicada_por=administrador,
                                        motivo=observacion, fecha_inicio=ahora, fecha_fin=fin)
        from citas.services import cancelarCitaPorSancionService
        for fila in filas:
            resultado, codigo = cancelarCitaPorSancionService(fila["id"], sancionado)
            if codigo != 200:
                raise ValidationError({"citas": [resultado]})
            citas_canceladas += 1
        reporte.estado = Reporte.Estado.RESUELTO
        duracion = "indefinidamente" if fin is None else f"durante {datos['dias_suspension']} días"
        notificarUsuario(sancionado, "Cuenta suspendida", f"Tu cuenta fue suspendida {duracion}. Motivo: {observacion}")
        from notificaciones.email_citas_services import enviarCorreoSancion
        transaction.on_commit(partial(enviarCorreoSancion, sancion.pk), robust=True)
    elif accion == "revision":
        reporte.estado = Reporte.Estado.EN_REVISION
    elif accion == "descartar":
        reporte.estado = Reporte.Estado.DESCARTADO
    elif accion == "advertir":
        # Es una decisión formal, sin tocar sanciones, agendas ni permisos.
        Usuario.objects.select_for_update().get(pk=reporte.paciente_id)
        Medico.objects.select_for_update().get(pk=reporte.medico_id)
        reporte.estado = Reporte.Estado.RESUELTO
        notificarUsuario(usuarioReportado(reporte), "Advertencia formal",
                         f"Administración emitió una advertencia. Motivo: {observacion}. Tu cuenta no ha sido suspendida por esta advertencia.")
        from notificaciones.email_citas_services import enviarCorreoAdvertencia
        transaction.on_commit(partial(enviarCorreoAdvertencia, reporte.pk), robust=True)
    else:
        return "Acción no válida", 400
    if accion != "revision":
        reporte.decision = accion
        reporte.observacion_admin = observacion
        reporte.observacion_reportante = datos.get("observacion_reportante", "").strip()
    reporte.revisado_por = administrador
    reporte.fecha_revision = timezone.now()
    reporte.save(update_fields=["estado", "decision", "observacion_admin", "observacion_reportante", "revisado_por", "fecha_revision"])
    registrarDecision(reporte, accion, administrador, estado_anterior,
                      observacion if accion != "revision" else "",
                      reporte.observacion_reportante if accion != "revision" else "")
    reportante = reporte.paciente if reporte.reportante == Reporte.Reportante.PACIENTE else reporte.medico
    notificarUsuario(reportante, "Actualización de reporte",
                     f"Tu reporte #{reporte.id} cambió al estado: {reporte.get_estado_display()}.")
    reporte = consultasReportes(Reporte.objects.filter(pk=reporte.pk)).get()
    resultado = ReporteSerializer(reporte, context={"es_admin": True}).data
    if accion == "sancionar":
        resultado["citas_canceladas"] = citas_canceladas
    return resultado, 200


@transaction.atomic
def anularSancionService(administrador, sancion_id, motivo):
    if not esAdministrador(administrador):
        return "No tienes permisos de administrador", 403
    if not isinstance(motivo, str) or not motivo.strip() or len(motivo.strip()) > 2000:
        return "Indica el motivo administrativo de la rehabilitación (máximo 2000 caracteres)", 400
    referencia = Sancion.objects.filter(pk=sancion_id).values("reporte_id").first()
    if not referencia:
        return "Sanción no encontrada", 404
    reporte = Reporte.objects.select_for_update().get(pk=referencia["reporte_id"])
    sancionado = usuarioReportado(reporte)
    if type(sancionado) is type(administrador) and sancionado.pk == administrador.pk:
        return "No puedes habilitarte a ti mismo", 403
    bloquearAgendaSancion(sancionado)
    sancion = Sancion.objects.select_for_update().get(pk=sancion_id)
    if not sancion.esta_activa:
        return "Esta suspensión ya no está vigente", 409
    sancion.anulada_en = timezone.now()
    sancion.anulada_por = administrador
    sancion.motivo_anulacion = motivo.strip()
    sancion.save(update_fields=["anulada_en", "anulada_por", "motivo_anulacion"])
    registrarDecision(reporte, HistorialReporte.Accion.REHABILITAR, administrador,
                      reporte.estado, motivo.strip())
    notificarUsuario(sancionado, "Suspensión levantada",
                     "Administración levantó tu suspensión. Las citas canceladas no se restauran automáticamente.")
    from notificaciones.email_citas_services import enviarCorreoSancion
    transaction.on_commit(partial(enviarCorreoSancion, sancion.pk, rehabilitacion=True), robust=True)
    return "Usuario habilitado correctamente", 200


def periodosSancionService(usuario, inicio, fin):
    if inicio >= fin:
        return []
    periodos = sancionesUsuario(usuario).filter(
        Q(fecha_fin__isnull=True) | Q(fecha_fin__gt=inicio),
        anulada_en__isnull=True, fecha_inicio__lt=fin).values_list("fecha_inicio", "fecha_fin")
    return [(max(desde, inicio), min(hasta, fin) if hasta else fin) for desde, hasta in periodos]


def obtenerMiSancionService(usuario):
    if not (isinstance(usuario, Medico) or
            isinstance(usuario, Usuario) and usuario.id_rol.nombre == "paciente"):
        return "No tienes permiso para consultar sanciones", 403
    sanciones = sancionesUsuario(usuario).select_related("aplicada_por", "anulada_por")
    advertencias = reportesContraUsuario(usuario).filter(decision=Reporte.Decision.ADVERTIR,
                                                        estado=Reporte.Estado.RESUELTO)
    ahora = timezone.now()
    sancion = sanciones.filter(Q(fecha_fin__isnull=True) | Q(fecha_fin__gt=ahora),
                              anulada_en__isnull=True, fecha_inicio__lte=ahora).first()
    return {"suspendido": sancion is not None,
            "sancion": SancionSerializer(sancion, context={"ahora": ahora}).data if sancion else None,
            "historial": SancionSerializer(sanciones, many=True, context={"ahora": ahora}).data,
            "advertencias": list(advertencias.values("id", "observacion_admin", "fecha_revision"))}, 200


def reportesContraUsuario(usuario):
    if isinstance(usuario, Medico):
        return Reporte.objects.filter(medico=usuario, reportante=Reporte.Reportante.PACIENTE)
    return Reporte.objects.filter(paciente=usuario, reportante=Reporte.Reportante.MEDICO)


def antecedentesReporteService(administrador, reporte_id):
    if not esAdministrador(administrador):
        return "No tienes permisos de administrador", 403
    reporte = Reporte.objects.select_related("paciente", "medico").filter(pk=reporte_id).first()
    if not reporte:
        return "Reporte no encontrado", 404
    antecedentes = reportesContraUsuario(usuarioReportado(reporte)).exclude(pk=reporte.pk).filter(
        Q(decision=Reporte.Decision.ADVERTIR) | Q(sancion__isnull=False))
    return ReporteSerializer(consultasReportes(antecedentes), many=True,
                             context={"es_admin": True, "ahora": timezone.now()}).data, 200


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


def listarCitasReportablesService(usuario, reportado_id):
    if isinstance(usuario, Medico) and usuario.esta_aprobado:
        citas = Cita.objects.filter(id_medico=usuario, id_usuario_id=reportado_id)
    elif isinstance(usuario, Usuario) and usuario.id_rol.nombre == "paciente":
        citas = Cita.objects.filter(id_usuario=usuario, id_medico_id=reportado_id)
    else:
        return "No tienes permiso para consultar citas", 403
    return list(citas.order_by("-fecha_programada").values("id", "codigo_cita", "fecha_programada")), 200


def obtenerEvidenciaReporteService(usuario, reporte_id):
    reportes = Reporte.objects.select_related("evidencia")
    if esAdministrador(usuario):
        pass
    elif isinstance(usuario, Medico):
        reportes = reportes.filter(medico=usuario, reportante=Reporte.Reportante.MEDICO)
    elif isinstance(usuario, Usuario) and usuario.id_rol.nombre == "paciente":
        reportes = reportes.filter(paciente=usuario, reportante=Reporte.Reportante.PACIENTE)
    else:
        return "No tienes permiso para consultar evidencias", 403
    reporte = reportes.filter(pk=reporte_id, evidencia__activo=True).first()
    if not reporte:
        return "Evidencia no encontrada", 404
    return reporte.evidencia, 200
