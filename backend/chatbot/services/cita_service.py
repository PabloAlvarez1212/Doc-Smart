from datetime import datetime

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from citas.models import Cita
from citas.services import (
    cancelarCitaService,
    crearCitaService,
    editarCitaService,
)
from medicos.models import Medico


class CitaService:

    FORMATOS_FECHA = (
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d %H:%M:%S",
        "%d/%m/%Y %H:%M",
    )

    @staticmethod
    def normalizar_fecha(valor):
        if isinstance(valor, datetime):
            fecha = valor
        elif isinstance(valor, str):
            fecha = parse_datetime(valor.strip())

            if fecha is None:
                for formato in CitaService.FORMATOS_FECHA:
                    try:
                        fecha = datetime.strptime(valor.strip(), formato)
                        break
                    except ValueError:
                        continue
        else:
            fecha = None

        if fecha is None:
            return None

        if timezone.is_naive(fecha):
            fecha = timezone.make_aware(
                fecha,
                timezone.get_current_timezone(),
            )

        return fecha

    @staticmethod
    def obtener_medico(id_medico):

        return Medico.objects.filter(
            id=id_medico
        ).first()

    @staticmethod
    def medico_tiene_cita(id_medico, fecha, excluir_cita_id=None):

        citas = Cita.objects.filter(
            id_medico_id=id_medico,
            fecha_programada=fecha
        )

        if excluir_cita_id is not None:
            citas = citas.exclude(id=excluir_cita_id)

        return citas.exists()

    @staticmethod
    def obtener_cita_usuario(id_cita, usuario):
        return (
            Cita.objects
            .select_related(
                "id_medico",
                "id_medico__id_especialidad",
                "id_estado",
            )
            .filter(id=id_cita, id_usuario=usuario)
            .first()
        )

    @staticmethod
    def crear_cita(usuario, medico, fecha, estado):

        return Cita.objects.create(
            id_usuario=usuario,
            id_medico=medico,
            fecha_programada=fecha,
            id_estado=estado
        )

    @staticmethod
    def obtener_proximas(usuario):

        return (
            Cita.objects
            .select_related(
                "id_medico",
                "id_medico__id_especialidad",
                "id_estado"
            )
            .filter(
                id_usuario=usuario,
                fecha_programada__gte=timezone.now()
            )
            .exclude(id_estado__nombre__in=["cancelada", "completada"])
            .order_by("fecha_programada")
        )

    @staticmethod
    def agendar(usuario, medico, fecha):
        return crearCitaService(
            {
                "id_medico": medico.id,
                "fecha_programada": fecha,
            },
            usuario.id,
        )

    @staticmethod
    def reprogramar(usuario, cita, fecha):
        # La pertenencia se valida antes de delegar al servicio general.
        if cita.id_usuario_id != usuario.id:
            return "La cita no pertenece al usuario autenticado", 403

        return editarCitaService(
            cita.id,
            {"fecha_programada": fecha},
            usuario.id,
        )

    @staticmethod
    def cancelar(usuario, cita):
        # La pertenencia se valida antes de delegar al servicio general.
        if cita.id_usuario_id != usuario.id:
            return "La cita no pertenece al usuario autenticado", 403

        return cancelarCitaService(cita.id, usuario.id)
