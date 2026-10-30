"""Muestra qué palabras lee el OCR junto a "Apellidos" y "Nombres" y cuáles toma por nombres reales.

Herramienta de diagnóstico local: lee los archivos indicados, no guarda ni envía nada. Imprime texto del documento
(nombres) en tu terminal; úsala solo con tus propios documentos.
"""
from django.core.management.base import BaseCommand, CommandError

from users.documento_identidad import (
    DocumentoError, _creible, _segmentos_nombre, _tokens_nombre, ejecutar_ocr, nombres_del_documento,
    normalizar_texto, revisar_cantidad_nombres, similitud,
)


class Command(BaseCommand):
    help = "Explica por qué un nombre o apellido se marca como incompleto al verificar el documento."

    def add_arguments(self, parser):
        parser.add_argument("--frente", required=True)
        parser.add_argument("--reverso")
        parser.add_argument("--nombre", required=True, help="Nombre tal como lo escribiste")
        parser.add_argument("--apellido", required=True, help="Apellido tal como lo escribiste")

    def handle(self, *args, frente, reverso, nombre, apellido, **opciones):
        def leer(ruta):
            try:
                with open(ruta, "rb") as f:
                    return f.read()
            except OSError as error:
                raise CommandError(f"No se pudo leer {ruta}: {error}")

        try:
            textos = [ejecutar_ocr(leer(frente))]
            if reverso:
                textos.append(ejecutar_ocr(leer(reverso)))
        except DocumentoError as error:
            raise CommandError(str(error))

        segmento = next((s for s in (_segmentos_nombre(t) for t in textos) if s), None)
        self.stdout.write(self.style.MIGRATE_HEADING("Lo que lee el OCR"))
        if not segmento:
            self.stdout.write("  No se leyeron claramente las etiquetas Apellidos / Nombres: no se afirma nada sobre nombres incompletos.")
            return
        for etiqueta, crudo in (("Apellidos", segmento[0]), ("Nombres", segmento[1])):
            todos = _tokens_nombre(crudo)
            validos = [t for t in todos if _creible(t)]
            self.stdout.write(f"  {etiqueta}: texto leído «{crudo}»")
            self.stdout.write(f"     palabras creíbles: {validos}   descartadas (etiqueta o ruido): {[t for t in todos if t not in validos]}")
        ap_doc, nom_doc, fuente = nombres_del_documento(textos)
        self.stdout.write(self.style.MIGRATE_HEADING("Lo que escribiste"))
        for etiqueta, doc, escrito in (("Apellido", ap_doc, apellido), ("Nombre", nom_doc, nombre)):
            esp = _tokens_nombre(escrito)
            sin_pareja = [d for d in (doc or []) if max((similitud(d, e) for e in esp), default=0) < .72]
            self.stdout.write(f"  {etiqueta}: {esp}  → palabras del documento sin pareja: {sin_pareja or 'ninguna'}")
        r = revisar_cantidad_nombres(textos, nombre, apellido)
        self.stdout.write(self.style.MIGRATE_HEADING("Resultado"))
        self.stdout.write(f"  nombre incompleto: {r['nombre_incompleto'] or 'no'} | apellido incompleto: {r['apellido_incompleto'] or 'no'}")
