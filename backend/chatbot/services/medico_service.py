from difflib import SequenceMatcher
import unicodedata

from medicos.models import Medico


class MedicoService:

    UMBRAL_SIMILITUD = 0.82
    MARGEN_AMBIGUEDAD = 0.05

    @staticmethod
    def _normalizar(texto):
        texto = unicodedata.normalize("NFKD", texto or "")
        texto = "".join(
            caracter
            for caracter in texto
            if not unicodedata.combining(caracter)
        )
        return " ".join(texto.lower().strip().split())

    @staticmethod
    def _similitud_nombre(nombre_buscado, apellido_buscado, medico):
        buscados = MedicoService._normalizar(
            f"{nombre_buscado or ''} {apellido_buscado or ''}"
        ).split()
        registrados = MedicoService._normalizar(
            f"{medico.nombre} {medico.apellido}"
        ).split()

        if not buscados or not registrados:
            return 0

        similitudes = [
            max(
                SequenceMatcher(None, buscado, registrado).ratio()
                for registrado in registrados
            )
            for buscado in buscados
        ]

        return sum(similitudes) / len(similitudes)

    @staticmethod
    def _seleccionar_candidato(nombre, apellido, candidatos):
        puntuados = sorted(
            (
                (
                    MedicoService._similitud_nombre(nombre, apellido, medico),
                    medico,
                )
                for medico in candidatos
            ),
            key=lambda elemento: elemento[0],
            reverse=True,
        )

        if not puntuados:
            return None

        mejor_puntuacion, mejor_medico = puntuados[0]

        if mejor_puntuacion < MedicoService.UMBRAL_SIMILITUD:
            return None

        if len(puntuados) > 1:
            segunda_puntuacion = puntuados[1][0]
            if mejor_puntuacion - segunda_puntuacion < MedicoService.MARGEN_AMBIGUEDAD:
                return None

        return mejor_medico

    @staticmethod
    def buscar_por_especialidad_aproximada(
        especialidad,
        ciudad=None,
        limite=20,
    ):
        especialidad_normalizada = MedicoService._normalizar(especialidad)

        if not especialidad_normalizada:
            return []

        candidatos = (
            Medico.objects
            .select_related("id_especialidad", "ciudad")
            .all()
        )

        if ciudad:
            candidatos = candidatos.filter(ciudad__nombre__icontains=ciudad)

        puntuados = []

        for medico in candidatos.order_by("id")[:100]:
            nombre_especialidad = MedicoService._normalizar(
                medico.id_especialidad.nombre
            )
            puntuacion = SequenceMatcher(
                None,
                especialidad_normalizada,
                nombre_especialidad,
            ).ratio()

            if puntuacion >= 0.72:
                puntuados.append((puntuacion, medico))

        puntuados.sort(key=lambda elemento: elemento[0], reverse=True)
        return [medico for _, medico in puntuados[:limite]]

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

        if medico is None and nombre and apellido:
            candidatos = (
                Medico.objects
                .select_related("id_especialidad", "ciudad")
                .all()
            )

            if ciudad:
                candidatos = candidatos.filter(
                    ciudad__nombre__icontains=ciudad
                )

            # La evaluación aproximada queda acotada para no recorrer toda la
            # tabla si el catálogo crece significativamente.
            medico = MedicoService._seleccionar_candidato(
                nombre,
                apellido,
                candidatos.order_by("id")[:100],
            )

        return medico
