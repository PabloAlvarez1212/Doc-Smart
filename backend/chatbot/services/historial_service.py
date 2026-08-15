from historial_medico.models import HistorialClinico


class HistorialService:

    @staticmethod
    def obtener_historial(usuario, limite=5):

        return (
            HistorialClinico.objects
            .select_related(
                "medico",
                "cita"
            )
            .filter(
                usuario=usuario
            )
            .order_by("-fecha_creacion")[:limite]
        )