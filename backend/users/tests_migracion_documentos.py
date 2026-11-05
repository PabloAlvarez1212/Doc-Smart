"""Migraciones 0025 (users) y 0023 (medicos): pasan los documentos de cifrado a texto en claro sin perder ni truncar datos."""
import importlib
import os
from unittest.mock import patch

from django.apps import apps as apps_globales
from django.db import connection
from django.test import TransactionTestCase

from core.cifrado import cifrar_documento, descifrar_documento_estricto

migracion_users = importlib.import_module("users.migrations.0025_documentos_en_claro")
migracion_medicos = importlib.import_module("medicos.migrations.0023_documentos_en_claro")


class DescifradoEstrictoTests(TransactionTestCase):
    def test_ida_y_vuelta_y_texto_sin_cifrar(self):
        self.assertEqual(descifrar_documento_estricto(cifrar_documento("1001234567")), "1001234567")
        self.assertEqual(descifrar_documento_estricto("1001234567"), "1001234567")

    def test_doble_cifrado_se_resuelve(self):
        doble = "cif1:" + cifrar_documento("98765")[5:]
        self.assertEqual(descifrar_documento_estricto(doble), "98765")

    def test_clave_distinta_lanza_error_en_vez_de_devolver_vacio(self):
        token = cifrar_documento("1001234567")
        with patch.dict(os.environ, {"DATA_ENCRYPTION_KEY": "otra-clave"}):
            with self.assertRaises(ValueError):
                descifrar_documento_estricto(token)


class MigracionDocumentosTests(TransactionTestCase):
    def _ejecutar(self):
        with connection.schema_editor() as editor:
            migracion_users.descifrar_documentos(apps_globales, editor)

    def _crudo(self, tabla, columna, pk):
        with connection.cursor() as c:
            c.execute(f"SELECT {columna} FROM {tabla} WHERE id = %s", [pk])
            return c.fetchone()[0]

    def _crear(self, numero):
        from users.models import ProcesoRegistroUsuario
        import datetime
        from django.utils import timezone
        proceso = ProcesoRegistroUsuario.objects.create(
            nombre_declarado="N", apellido_declarado="A", fecha_nacimiento_declarada=datetime.date(1990, 1, 1),
            tipo_documento="CC", numero_documento_declarado="1", expira_en=timezone.now())
        with connection.cursor() as c:
            c.execute("UPDATE users_procesoregistrousuario SET numero_documento_declarado=%s WHERE id=%s",
                      [numero, proceso.pk.hex if connection.vendor != "postgresql" else str(proceso.pk)])
        return proceso

    def test_convierte_cifrados_y_conserva_los_que_ya_estan_en_claro(self):
        cifrado, claro = self._crear(cifrar_documento("1001234567")), self._crear("555")
        self._ejecutar()
        self.assertEqual(self._crudo("users_procesoregistrousuario", "numero_documento_declarado", cifrado.pk.hex), "1001234567")
        self.assertEqual(self._crudo("users_procesoregistrousuario", "numero_documento_declarado", claro.pk.hex), "555")
        self._ejecutar()  # idempotente

    def test_clave_incorrecta_detiene_sin_modificar_nada(self):
        a, b = self._crear(cifrar_documento("1001234567")), self._crear(cifrar_documento("52123456"))
        antes = [self._crudo("users_procesoregistrousuario", "numero_documento_declarado", p.pk.hex) for p in (a, b)]
        with patch.dict(os.environ, {"DATA_ENCRYPTION_KEY": "otra-clave"}):
            with self.assertRaisesMessage(RuntimeError, "No se modificó ningún dato"):
                self._ejecutar()
        despues = [self._crudo("users_procesoregistrousuario", "numero_documento_declarado", p.pk.hex) for p in (a, b)]
        self.assertEqual(antes, despues)

    def test_documento_demasiado_largo_no_se_trunca(self):
        largo = self._crear("9" * 40)
        with self.assertRaisesMessage(RuntimeError, "admite 30"):
            self._ejecutar()
        self.assertEqual(self._crudo("users_procesoregistrousuario", "numero_documento_declarado", largo.pk.hex), "9" * 40)


class MigracionCedulaMedicoTests(TransactionTestCase):
    def _medico(self, cedula, n):
        from medicos.models import Medico
        import datetime
        from catalogos.models import Rol
        from medicos.models import Especialidad
        rol, _ = Rol.objects.get_or_create(nombre="medico")
        esp, _ = Especialidad.objects.get_or_create(nombre="General")
        medico = Medico.objects.create(nombre="M", apellido="D", cedula=f"c{n}", correo=f"m{n}@x.com", contraseña="x", telefono="1",
                                       fecha_nacimiento=datetime.date(1980, 1, 1), id_especialidad=esp, id_rol=rol,
                                       direccion="d", latitud=4, longitud=-74)
        with connection.cursor() as c:
            c.execute("UPDATE medicos_medico SET cedula=%s WHERE id=%s", [cedula, medico.pk])
        return medico

    def _leer(self, medico):
        with connection.cursor() as c:
            c.execute("SELECT cedula FROM medicos_medico WHERE id=%s", [medico.pk])
            return c.fetchone()[0]

    def _ejecutar(self):
        with connection.schema_editor() as editor:
            migracion_medicos.descifrar_documentos(apps_globales, editor)

    def test_convierte_y_se_detiene_con_clave_incorrecta(self):
        a, b = self._medico(cifrar_documento("79123456"), 1), self._medico("555", 2)
        with patch.dict(os.environ, {"DATA_ENCRYPTION_KEY": "otra-clave"}):
            with self.assertRaisesMessage(RuntimeError, "No se modificó ningún dato"):
                self._ejecutar()
        self.assertTrue(self._leer(a).startswith("cif1:"))
        self._ejecutar()
        self.assertEqual((self._leer(a), self._leer(b)), ("79123456", "555"))
