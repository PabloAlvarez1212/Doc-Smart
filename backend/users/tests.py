from datetime import date, timedelta
from io import BytesIO
from tempfile import TemporaryDirectory
from unittest.mock import patch

import bcrypt
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from catalogos.models import Rol
from users.models import ProcesoRegistroUsuario, Usuario
from users.services import MAX_INTENTOS_OTP


class RegistroPacienteTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.media = TemporaryDirectory()
        self.addCleanup(self.media.cleanup)
        settings = override_settings(MEDIA_ROOT=self.media.name, STORAGES={
            'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
            'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
        })
        settings.enable()
        self.addCleanup(settings.disable)
        Rol.objects.get_or_create(nombre='paciente')
        self.personales = dict(nombre='Ana', apellido='Perez', tipo_documento='CC',
                               numero_documento='1234567890', fecha_nacimiento='1990-05-10')
        self.adicionales = dict(telefono='3001234567', estatura=1.75, peso=70, genero='F', tipo_sangre='O+')
        self.credenciales = {'correo': 'ANA@example.com', 'contraseña': 'Segura123!'}

    def post(self, ruta, datos):
        return self.client.post('/api/usuarios/registro/' + ruta, datos, format='json')

    def iniciar(self):
        response = self.post('', self.personales)
        self.assertEqual(response.status_code, 201, response.data)
        return ProcesoRegistroUsuario.objects.get(pk=response.data['data']['proceso_id'])

    def imagen(self):
        content = BytesIO()
        Image.new('RGB', (600, 350), 'white').save(content, format='PNG')
        return SimpleUploadedFile('documento.png', content.getvalue(), content_type='image/png')

    def verificar_documento(self, proceso, **cambios):
        response = self.client.post('/api/usuarios/registro/subir-documento/', {
            'proceso_id': str(proceso.pk), 'documento_frente': self.imagen(),
            'documento_reverso': self.imagen(),
        }, format='multipart')
        self.assertEqual(response.status_code, 200, response.data)
        datos = dict(numero_documento='1234567890', nombre_coincide=True,
                     apellido_coincide=True, fecha_nacimiento=date(1990, 5, 10))
        with patch('users.services.extraer_datos_documento', return_value={**datos, **cambios}):
            return self.post('documento/verificar/', {'proceso_id': str(proceso.pk)})

    def test_inicio_solo_identidad_sin_usuario_ni_otp(self):
        proceso = self.iniciar()
        self.assertFalse(proceso.correo)
        self.assertFalse(proceso.contraseña_hash)
        self.assertIsNone(proceso.estatura)
        self.assertIsNone(proceso.otp_hash)
        self.assertFalse(Usuario.objects.exists())

    def test_flujo_completo_usa_identidad_del_proceso(self):
        proceso = self.iniciar()
        datos = {'proceso_id': str(proceso.pk)}
        self.assertEqual(self.verificar_documento(proceso).status_code, 200)
        proceso.refresh_from_db()
        self.assertTrue(proceso.documento_verificado)
        self.assertFalse(proceso.correo_verificado)
        self.assertEqual(self.post('datos-adicionales/', {**datos, **self.adicionales}).status_code, 200)
        with patch('users.services.resend.Emails.send'), patch('users.services.generarCodigoOTP', return_value='123456'):
            response = self.post('credenciales/', {**datos, **self.credenciales})
        self.assertEqual(response.status_code, 200, response.data)
        proceso.refresh_from_db()
        self.assertEqual(proceso.correo, 'ana@example.com')
        self.assertTrue(bcrypt.checkpw(b'Segura123!', proceso.contraseña_hash.encode()))
        self.assertNotEqual(proceso.otp_hash, '123456')
        self.assertFalse(Usuario.objects.exists())
        self.assertEqual(self.post('completar/', datos).status_code, 400)
        self.assertEqual(self.post('verificar-correo/', {**datos, 'codigo': '123456'}).status_code, 200)
        response = self.post('completar/', {**datos, 'nombre': 'Falso', 'numero_documento': '999999'})
        self.assertEqual(response.status_code, 201, response.data)
        usuario = Usuario.objects.get()
        self.assertEqual((usuario.nombre, usuario.cedula, usuario.id_rol.nombre), ('Ana', '1234567890', 'paciente'))
        self.assertEqual((usuario.genero, usuario.tipo_sangre), ('F', 'O+'))
        self.assertEqual(self.post('completar/', datos).status_code, 400)

    def test_no_permite_saltar_pasos(self):
        proceso = self.iniciar()
        datos = {'proceso_id': str(proceso.pk)}
        for ruta, extras in [('datos-adicionales/', self.adicionales), ('credenciales/', self.credenciales),
                             ('verificar-correo/', {'codigo': '123456'}), ('reenviar-codigo/', {}), ('completar/', {})]:
            with self.subTest(ruta=ruta):
                self.assertIn(self.post(ruta, {**datos, **extras}).status_code, (400, 403))
        self.assertEqual(self.verificar_documento(proceso).status_code, 200)
        self.assertEqual(self.post('credenciales/', {**datos, **self.credenciales}).status_code, 403)

    def test_rechaza_identidad_no_coincidente(self):
        proceso = self.iniciar()
        for campo, valor in [('numero_documento', '999999'), ('nombre_coincide', False),
                             ('apellido_coincide', False), ('fecha_nacimiento', date(1991, 1, 1))]:
            with self.subTest(campo=campo):
                self.assertEqual(self.verificar_documento(proceso, **{campo: valor}).status_code, 400)
                proceso.refresh_from_db()
                self.assertFalse(proceso.documento_verificado)

    def test_cc_exige_reverso(self):
        proceso = self.iniciar()
        self.client.post('/api/usuarios/registro/subir-documento/', {
            'proceso_id': str(proceso.pk), 'documento_frente': self.imagen(),
        }, format='multipart')
        response = self.post('documento/verificar/', {'proceso_id': str(proceso.pk)})
        self.assertEqual(response.status_code, 400)
        self.assertIn('documento', response.data['errores'])

    def test_otros_documentos_comparan_nombres(self):
        from users.documento_identidad import extraer_datos_documento
        with patch('users.documento_identidad.ejecutar_ocr', return_value='ANA PEREZ'):
            for tipo in ('TI', 'RC', 'PASAPORTE'):
                datos = extraer_datos_documento(b'imagen', tipo, nombre_declarado='Ana', apellido_declarado='Perez')
                self.assertIs(datos.get('nombre_coincide'), True)
                self.assertIs(datos.get('apellido_coincide'), True)

    def test_proceso_expirado_rechaza_operaciones(self):
        proceso = self.iniciar()
        proceso.expira_en = timezone.now() - timedelta(seconds=1)
        proceso.save()
        for ruta, extras in [('datos-adicionales/', self.adicionales), ('credenciales/', self.credenciales),
                             ('documento/verificar/', {}), ('completar/', {})]:
            self.assertEqual(self.post(ruta, {'proceso_id': str(proceso.pk), **extras}).status_code, 400)

    def test_otp_limita_intentos_y_no_se_reinicia_con_credenciales(self):
        proceso = self.iniciar()
        datos = {'proceso_id': str(proceso.pk)}
        self.verificar_documento(proceso)
        self.post('datos-adicionales/', {**datos, **self.adicionales})
        with patch('users.services.resend.Emails.send'), patch('users.services.generarCodigoOTP', return_value='123456'):
            self.assertEqual(self.post('credenciales/', {**datos, **self.credenciales}).status_code, 200)
            for _ in range(MAX_INTENTOS_OTP):
                self.assertEqual(self.post('verificar-correo/', {**datos, 'codigo': '000000'}).status_code, 400)
            self.assertEqual(self.post('credenciales/', {**datos, **self.credenciales}).status_code, 400)
        self.assertEqual(self.post('verificar-correo/', {**datos, 'codigo': '123456'}).status_code, 400)

    def preparar_correo(self):
        proceso = self.iniciar()
        datos = {'proceso_id': str(proceso.pk)}
        self.assertEqual(self.verificar_documento(proceso).status_code, 200)
        self.assertEqual(self.post('datos-adicionales/', {**datos, **self.adicionales}).status_code, 200)
        with patch('users.services.resend.Emails.send'), patch('users.services.generarCodigoOTP', return_value='123456'):
            self.assertEqual(self.post('credenciales/', {**datos, **self.credenciales}).status_code, 200)
        proceso.refresh_from_db()
        return proceso, datos

    def test_reintento_credenciales_no_reinicia_otp(self):
        proceso, datos = self.preparar_correo()
        self.post('verificar-correo/', {**datos, 'codigo': '000000'})
        response = self.post('credenciales/', {**datos, **self.credenciales})
        self.assertEqual(response.status_code, 200)
        proceso.refresh_from_db()
        self.assertEqual(proceso.intentos_otp, 1)
        self.assertEqual(self.post('credenciales/', {**datos, **self.credenciales, 'correo': 'otro@example.com'}).status_code, 400)
        self.assertEqual(self.post('datos-adicionales/', {**datos, **self.adicionales, 'peso': 80}).status_code, 400)
        self.assertEqual(proceso.peso, 70)

    def test_otp_expirado_y_reenvio_limitado(self):
        proceso, datos = self.preparar_correo()
        proceso.otp_expira_en = timezone.now() - timedelta(seconds=1)
        proceso.save()
        self.assertEqual(self.post('verificar-correo/', {**datos, 'codigo': '123456'}).status_code, 400)
        self.assertEqual(self.post('reenviar-codigo/', datos).status_code, 429)
        proceso.ultimo_envio_otp = timezone.now() - timedelta(minutes=2)
        proceso.save()
        with patch('users.services.resend.Emails.send'), patch('users.services.generarCodigoOTP', return_value='654321'):
            self.assertEqual(self.post('reenviar-codigo/', datos).status_code, 200)
        self.assertEqual(self.post('verificar-correo/', {**datos, 'codigo': '123456'}).status_code, 400)
        self.assertEqual(self.post('verificar-correo/', {**datos, 'codigo': '654321'}).status_code, 200)

    def test_completar_rechaza_cualquier_dato_faltante(self):
        proceso, datos = self.preparar_correo()
        self.post('verificar-correo/', {**datos, 'codigo': '123456'})
        for campo, vacio in [('documento_verificado', False), ('correo_verificado', False), ('telefono', ''),
                             ('estatura', None), ('peso', None), ('contraseña_hash', ''), ('correo', ''),
                             ('nombre_verificado', ''), ('apellido_verificado', ''),
                             ('numero_documento_verificado', ''), ('fecha_nacimiento_verificada', None)]:
            with self.subTest(campo=campo):
                proceso.refresh_from_db()
                original = getattr(proceso, campo)
                ProcesoRegistroUsuario.objects.filter(pk=proceso.pk).update(**{campo: vacio})
                self.assertEqual(self.post('completar/', datos).status_code, 400)
                self.assertFalse(Usuario.objects.exists())
                ProcesoRegistroUsuario.objects.filter(pk=proceso.pk).update(**{campo: original})

    def test_error_envio_permite_reintentar_sin_perder_identidad(self):
        proceso = self.iniciar()
        datos = {'proceso_id': str(proceso.pk)}
        self.verificar_documento(proceso)
        self.post('datos-adicionales/', {**datos, **self.adicionales})
        with patch('users.services.resend.Emails.send', side_effect=RuntimeError('Fallo de correo')), self.assertLogs('users.services', level='ERROR'):
            self.assertEqual(self.post('credenciales/', {**datos, **self.credenciales}).status_code, 500)
        proceso.refresh_from_db()
        self.assertTrue(proceso.documento_verificado)
        self.assertFalse(proceso.contraseña_hash)
        with patch('users.services.resend.Emails.send'):
            self.assertEqual(self.post('credenciales/', {**datos, **self.credenciales}).status_code, 200)

    def test_archivo_invalido_y_datos_adicionales_invalidos(self):
        proceso = self.iniciar()
        datos = {'proceso_id': str(proceso.pk)}
        response = self.client.post('/api/usuarios/registro/subir-documento/', {
            **datos, 'documento_frente': SimpleUploadedFile('falso.png', b'no es imagen', content_type='image/png'),
        }, format='multipart')
        self.assertEqual(response.status_code, 400)
        self.verificar_documento(proceso)
        for extras in [{'telefono': '123'}, {'estatura': 9}, {'peso': 0}]:
            self.assertEqual(self.post('datos-adicionales/', {**datos, **self.adicionales, **extras}).status_code, 400)

    def test_duplicados_en_credenciales_y_al_completar(self):
        from medicos.models import Medico, Especialidad
        proceso, datos = self.preparar_correo()
        self.post('verificar-correo/', {**datos, 'codigo': '123456'})
        comunes = dict(nombre='Otra', apellido='Persona', fecha_nacimiento=date(1980, 1, 1),
                       telefono='3009999999', contraseña=proceso.contraseña_hash, id_rol=Rol.objects.get(nombre='paciente'))
        especialidad = Especialidad.objects.create(nombre='General')
        for modelo, extras in [(Usuario, dict(estatura=1.7, peso=60)),
                                (Medico, dict(id_especialidad=especialidad, direccion='Calle 1'))]:
            with self.subTest(modelo=modelo.__name__):
                existente = modelo.objects.create(**comunes, **extras, cedula='9999999999', correo='ana@example.com')
                self.assertEqual(self.post('completar/', datos).status_code, 400)
                ProcesoRegistroUsuario.objects.filter(pk=proceso.pk).update(contraseña_hash='', correo_verificado=False)
                self.assertEqual(self.post('credenciales/', {**datos, **self.credenciales}).status_code, 400)
                ProcesoRegistroUsuario.objects.filter(pk=proceso.pk).update(contraseña_hash=proceso.contraseña_hash, correo_verificado=True)
                existente.correo = 'otro@example.com'
                existente.cedula = '1234567890'
                existente.save()
                self.assertEqual(self.post('completar/', datos).status_code, 400)
                self.assertEqual(self.post('', self.personales).status_code, 400)
                existente.delete()
