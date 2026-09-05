from historial_medico.models import HistorialClinico


class HistorialService:

    LIMITE_PREDETERMINADO = 5
    LIMITE_MAXIMO = 10

    @classmethod
    def normalizar_limite(cls, limite):
        try:
            limite = int(limite)
        except (TypeError, ValueError):
            return cls.LIMITE_PREDETERMINADO
        return min(max(limite, 1), cls.LIMITE_MAXIMO)

    @classmethod
    def obtener_historial(cls, usuario, limite=5):
        limite = cls.normalizar_limite(limite)

        return (
            HistorialClinico.objects
            .select_related(
                "medico",
            )
            .filter(
                usuario=usuario
            )
            .order_by("-fecha_creacion")[:limite]
        )
