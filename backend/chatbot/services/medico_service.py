from medicos.models import Medico


class MedicoService:

    @staticmethod
    def obtener_por_id(id_medico):
        return (
            Medico.objects
            .select_related("id_especialidad", "ciudad")
            .filter(id=id_medico)
            .first()
        )

    @staticmethod
    def buscar_medicos(
        nombre=None,
        apellido=None,
        especialidad=None,
        ciudad=None
    ):

        medicos = (
            Medico.objects
            .select_related(
                "id_especialidad",
                "ciudad"
            )
            .all()
        )

        if nombre:
            medicos = medicos.filter(
                nombre__icontains=nombre
            )

        if apellido:
            medicos = medicos.filter(
                apellido__icontains=apellido
            )

        if especialidad:
            medicos = medicos.filter(
                id_especialidad__nombre__icontains=especialidad
            )

        if ciudad:
            medicos = medicos.filter(
                ciudad__nombre__icontains=ciudad
            )

        return medicos.order_by("apellido", "nombre")

    @staticmethod
    def obtener_medico(
        nombre=None,
        apellido=None,
        especialidad=None,
        ciudad=None
    ):
        medico = MedicoService.buscar_medicos(
            nombre=nombre,
            apellido=apellido,
            especialidad=especialidad,
            ciudad=ciudad,
        ).first()

        # Si el usuario dio un nombre concreto, una palabra usada como título
        # (por ejemplo, "cirujana") no debe impedir encontrar a la persona.
        if medico is None and (nombre or apellido) and especialidad:
            medico = MedicoService.buscar_medicos(
                nombre=nombre,
                apellido=apellido,
                ciudad=ciudad,
            ).first()

        return medico
