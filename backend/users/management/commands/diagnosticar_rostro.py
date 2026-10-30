"""Explica, paso a paso, por qué una fotografía de documento y unas selfies se aprueban, se repiten o pasan a revisión.

Es una herramienta de diagnóstico local: lee los archivos que se le indican, no guarda ni envía nada y solo imprime
valores (parecido, problemas de calidad, postura). Úsala solo con imágenes propias o con autorización de la persona.
"""
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from users import validacion_facial as vf


class Command(BaseCommand):
    help = "Diagnostica la verificación facial con una foto de documento y una o más selfies (archivos locales)."

    def add_arguments(self, parser):
        parser.add_argument("--documento", required=True, help="Imagen de la cédula o documento (foto completa)")
        parser.add_argument("--selfie", required=True, nargs="+", help="Una o más selfies; con 2 o más se evalúa la presencia")

    def handle(self, *args, documento, selfie, **opciones):
        def leer(ruta):
            try:
                with open(ruta, "rb") as f:
                    return f.read()
            except OSError as error:
                raise CommandError(f"No se pudo leer {ruta}: {error}")

        try:
            vf._dependencias()
            doc = vf.rostro_documento(leer(documento))
        except vf.FacialNoDisponible as error:
            raise CommandError(f"El motor facial no está disponible: {error}")
        self.stdout.write(self.style.MIGRATE_HEADING("Documento"))
        if doc is None:
            self.stdout.write("  No se detectó un rostro en el documento. Pasaría a revisión manual (o a alternativa si no trae foto).")
            return
        self.stdout.write(f"  rostro detectado, {doc.ancho}x{doc.alto} px en la miniatura")
        self.stdout.write(f"  foto pequeña o poco nítida: {'sí' if doc.calidad_baja else 'no'}"
                          f" | alineación: {doc.alineacion}"
                          f"{' (el servidor no la rechaza: con mucho parecido aprueba; si no, pasa a revisión)' if doc.alineacion_incierta or doc.calidad_baja else ''}")

        contenidos = [leer(r) for r in selfie]
        if len(contenidos) < vf.MIN_FOTOGRAMAS:
            contenidos = contenidos * vf.MIN_FOTOGRAMAS
            self.stdout.write(self.style.WARNING("  Solo diste una selfie: se repite, y por eso la presencia saldrá como 'sin_movimiento'."))

        self.stdout.write(self.style.MIGRATE_HEADING("Selfies"))
        with vf._candado:
            for i, contenido in enumerate(contenidos, 1):
                img = vf._decodificar(contenido, vf.LADO_SELFIE)
                caras = [c for c in vf._rostros(img) if c[14] >= 0.6] if img is not None else []
                if not caras:
                    self.stdout.write(f"  #{i}: no se detectó rostro")
                    continue
                malla, ideales, bloqueantes = vf.evaluar_captura(img, caras)
                parecido = vf._similitud(vf._embedding(img, caras[0], malla), doc[0])
                pose = f"giro {malla.roll:+.0f}°, lateral {malla.yaw:+.2f}, cabeceo {malla.pitch:.2f}" if malla else "sin malla"
                self.stdout.write(
                    f"  #{i}: parecido {parecido:.3f} | {pose} | ideal: {ideales or 'sin problemas'} | "
                    f"{'BLOQUEA: ' + str(bloqueantes) if bloqueantes else 'se puede comparar'}")

        r = vf.comparar(doc[0], contenidos)
        self.stdout.write(self.style.MIGRATE_HEADING("Resultado"))
        self.stdout.write(f"  decisión: {r['decision']} {('(' + r['motivo'] + ')') if r['motivo'] else ''}"
                          f"{'  parecido ' + format(r['similitud'], '.3f') if r['similitud'] is not None else ''}")
        if r["decision"] == "reintento":
            self.stdout.write(f"  mensaje al usuario: {vf.MENSAJES.get(r['motivo'], r['motivo'])}")
        self.stdout.write(
            f"  umbrales: aprobar desde {settings.FACIAL_UMBRAL_APROBADO}, revisión desde {settings.FACIAL_UMBRAL_REVISION}, "
            f"rechazo seguro por debajo de {settings.FACIAL_UMBRAL_DESCARTE}")
