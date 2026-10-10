from datetime import date, timedelta
from io import BytesIO
from tempfile import TemporaryDirectory
from unittest.mock import patch

from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from catalogos.models import Rol, Departamento, Ciudad
from users.models import Usuario, ProcesoRegistroUsuario
from users.services import MAX_INTENTOS_OTP
from medicos.models import Medico, Especialidad
from utils import IsMedicoAprobado


class RegistroMedicoTests(TestCase):
    def setUp(self):
        self.client=APIClient()
        self.media=TemporaryDirectory()
        self.addCleanup(self.media.cleanup)
        override=override_settings(MEDIA_ROOT=self.media.name,STORAGES={'default':{'BACKEND':'django.core.files.storage.FileSystemStorage'}})
        override.enable()
        self.addCleanup(override.disable)
        Rol.objects.create(nombre='doctor')
        Rol.objects.create(nombre='paciente')
        self.especialidad=Especialidad.objects.create(nombre='Medicina general')
        self.ciudad=Ciudad.objects.create(nombre='Bogotá',departamento=Departamento.objects.create(nombre='Cundinamarca'))
        self.personales=dict(nombre='Ana',apellido='Perez',tipo_documento='CC',numero_documento='1234567890',fecha_nacimiento='1990-05-10')
        self.credenciales={'correo':'ANA@example.com','contraseña':'Segura123!'}

    def post(self,ruta,datos):
        return self.client.post('/api/medicos/registro/'+ruta,datos,format='json')

    def iniciar(self):
        response=self.post('',self.personales)
        self.assertEqual(response.status_code,201,response.data)
        return ProcesoRegistroUsuario.objects.get(pk=response.data['data']['proceso_id'])

    def imagen(self,nombre='documento.png',mime='image/png'):
        output=BytesIO()
        Image.new('RGB',(600,350),'white').save(output,format='PNG')
        return SimpleUploadedFile(nombre,output.getvalue(),content_type=mime)

    def documento(self,proceso,**cambios):
        response=self.client.post('/api/medicos/registro/subir-documento/',{'proceso_id':str(proceso.pk),'documento_frente':self.imagen(),'documento_reverso':self.imagen()},format='multipart')
        self.assertEqual(response.status_code,200,response.data)
        ocr=dict(numero_documento='1234567890',nombre_coincide=True,apellido_coincide=True,fecha_nacimiento=date(1990,5,10))
        with patch('users.services.extraer_datos_documento',return_value={**ocr,**cambios}):
            return self.post('documento/verificar/',{'proceso_id':str(proceso.pk)})

    def profesional(self,proceso,archivo=None):
        pdf=archivo or SimpleUploadedFile('hoja.pdf',b'%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF',content_type='application/pdf')
        with patch('medicos.registro.subir_archivo',return_value={'key':f'hoja_vida/{proceso.pk}/hoja.pdf','nombre':'hoja.pdf','tipo':'application/pdf','tamano':pdf.size}) as storage:
            response=self.client.post('/api/medicos/registro/datos-profesionales/',{'proceso_id':str(proceso.pk),'telefono':'3001234567','direccion':'Calle 10 # 20-30','ciudad':self.ciudad.pk,'id_especialidad':self.especialidad.pk,'hoja_vida':pdf},format='multipart')
        return response,storage

    def correo(self):
        proceso=self.iniciar()
        self.assertEqual(self.documento(proceso).status_code,200)
        self.assertEqual(self.profesional(proceso)[0].status_code,200)
        with patch('users.services.resend.Emails.send'),patch('users.services.generarCodigoOTP',return_value='123456'):
            response=self.post('credenciales/',{'proceso_id':str(proceso.pk),**self.credenciales})
        self.assertEqual(response.status_code,200,response.data)
        proceso.refresh_from_db()
        return proceso,{'proceso_id':str(proceso.pk)}

    def test_inicio_solo_crea_proceso_medico(self):
        p=self.iniciar()
        self.assertEqual(p.tipo_registro,'medico')
        self.assertFalse(Medico.objects.exists())
        self.assertIsNone(p.otp_hash)

    def test_legacy_no_crea_cuenta_sin_verificaciones(self):
        response=self.post('',{'cedula':'1234567890',**self.credenciales})
        self.assertEqual(response.status_code,400)
        self.assertFalse(Medico.objects.exists())

    def test_mayoria_edad_y_sanitizacion(self):
        for fecha in ['2090-01-01','2015-01-01','2020-02-30']:
            self.assertEqual(self.post('',{**self.personales,'fecha_nacimiento':fecha}).status_code,400)
        self.assertEqual(self.post('',{**self.personales,'nombre':'<script>'}).status_code,400)
        response=self.post('',{**self.personales,'nombre':'  Ana  '})
        self.assertEqual(response.status_code,201)
        self.assertEqual(ProcesoRegistroUsuario.objects.get(pk=response.data['data']['proceso_id']).nombre_declarado,'Ana')

    def test_documento_duplicado_entre_roles(self):
        Usuario.objects.create(nombre='Ana',apellido='Perez',cedula='1234567890',fecha_nacimiento=date(1990,5,10),telefono='3001234567',correo='otra@example.com',contraseña='hash',estatura=1.7,peso=60,id_rol=Rol.objects.get(nombre='paciente'))
        self.assertEqual(self.post('',self.personales).status_code,400)

    def test_no_saltar_pasos(self):
        p=self.iniciar(); datos={'proceso_id':str(p.pk)}
        self.assertEqual(self.profesional(p)[0].status_code,403)
        for ruta,extra in [('credenciales/',self.credenciales),('verificar-correo/',{'codigo':'123456'}),('completar/',{})]:
            self.assertIn(self.post(ruta,{**datos,**extra}).status_code,(400,403))
        self.documento(p)
        self.assertEqual(self.post('credenciales/',{**datos,**self.credenciales}).status_code,403)

    def test_proceso_medico_no_puede_usar_rutas_paciente(self):
        p=self.iniciar()
        for ruta,extras in [('credenciales/',self.credenciales),('documento/verificar/',{}),('verificar-correo/',{'codigo':'123456'}),('reenviar-codigo/',{}),('completar/',{})]:
            response=self.client.post('/api/usuarios/registro/'+ruta,{'proceso_id':str(p.pk),**extras},format='json')
            self.assertEqual(response.status_code,403,response.data)

    def test_proceso_paciente_no_puede_usar_rutas_medico(self):
        response=self.client.post('/api/usuarios/registro/',self.personales,format='json')
        p=response.data['data']['proceso_id']
        self.assertEqual(self.post('documento/verificar/',{'proceso_id':p}).status_code,403)

    def test_archivo_documento_invalido_extension_mime_y_tamano(self):
        p=self.iniciar()
        archivos=[SimpleUploadedFile('fake.png',b'no image',content_type='image/png'),self.imagen('imagen.exe'),self.imagen('imagen.jpg'),SimpleUploadedFile('large.png',b'x'*(8*1024*1024+1),content_type='image/png')]
        for archivo in archivos:
            response=self.client.post('/api/medicos/registro/subir-documento/',{'proceso_id':str(p.pk),'documento_frente':archivo},format='multipart')
            self.assertEqual(response.status_code,400,response.data)

    def test_documento_no_coincide_muestra_cuatro_comparaciones(self):
        p=self.iniciar()
        response=self.documento(p,numero_documento='99999',nombre_coincide=False)
        self.assertEqual(response.status_code,400)
        self.assertEqual(response.data['data']['comparaciones'],dict(nombre=False,apellido=True,numero_documento=False,fecha_nacimiento=True))
        p.refresh_from_db()
        self.assertFalse(p.documento_verificado)
        self.assertEqual(p.numero_documento_declarado,'1234567890')

    def test_documento_correcto_y_fijado(self):
        p=self.iniciar()
        response=self.documento(p)
        self.assertEqual(response.status_code,200)
        self.assertTrue(all(response.data['data']['comparaciones'].values()))
        response=self.client.post('/api/medicos/registro/subir-documento/',{'proceso_id':str(p.pk),'documento_frente':self.imagen()},format='multipart')
        self.assertEqual(response.status_code,400)

    def test_pdf_invalido_no_se_almacena(self):
        p=self.iniciar();self.documento(p)
        response,storage=self.profesional(p,SimpleUploadedFile('fake.pdf',b'not pdf',content_type='application/pdf'))
        self.assertEqual(response.status_code,400)
        storage.assert_not_called()

    def test_correo_duplicado_y_normalizado(self):
        p,datos=self.correo()
        self.assertEqual(p.correo,'ana@example.com')
        q=self.iniciar();self.documento(q);self.profesional(q)
        Usuario.objects.create(nombre='Otra',apellido='Persona',cedula='88888888',fecha_nacimiento=date(1990,5,10),telefono='3001234567',correo='ana@example.com',contraseña='hash',estatura=1.7,peso=60,id_rol=Rol.objects.get(nombre='paciente'))
        self.assertEqual(self.post('credenciales/',{'proceso_id':str(q.pk),**self.credenciales}).status_code,400)

    def test_otp_incorrecto_expirado_y_limites(self):
        p,datos=self.correo()
        self.assertNotEqual(p.otp_hash,'123456')
        self.assertNotIn('otp',str(self.post('credenciales/',{**datos,**self.credenciales}).data['data']))
        self.assertEqual(self.post('verificar-correo/',{**datos,'codigo':'000000'}).status_code,400)
        p.refresh_from_db();self.assertEqual(p.intentos_otp,1)
        p.otp_expira_en=timezone.now()-timedelta(seconds=1);p.save()
        self.assertEqual(self.post('verificar-correo/',{**datos,'codigo':'123456'}).status_code,400)

    def test_otp_bloquea_tras_limite(self):
        p,datos=self.correo()
        for _ in range(MAX_INTENTOS_OTP):self.post('verificar-correo/',{**datos,'codigo':'000000'})
        self.assertEqual(self.post('verificar-correo/',{**datos,'codigo':'123456'}).status_code,400)
        p.refresh_from_db();self.assertEqual(p.estado,'bloqueado')

    def test_reenvio_cooldown_y_codigo_anterior_invalidado(self):
        p,datos=self.correo()
        self.assertEqual(self.post('reenviar-codigo/',datos).status_code,429)
        p.ultimo_envio_otp=timezone.now()-timedelta(minutes=2);p.save()
        with patch('users.services.resend.Emails.send'),patch('users.services.generarCodigoOTP',return_value='654321'):
            self.assertEqual(self.post('reenviar-codigo/',datos).status_code,200)
        self.assertEqual(self.post('verificar-correo/',{**datos,'codigo':'123456'}).status_code,400)
        self.assertEqual(self.post('verificar-correo/',{**datos,'codigo':'654321'}).status_code,200)

    def test_completar_medico_pendiente_sin_privilegios(self):
        p,datos=self.correo()
        self.assertEqual(self.post('completar/',datos).status_code,403)
        self.assertEqual(self.post('verificar-correo/',{**datos,'codigo':'123456'}).status_code,200)
        p.refresh_from_db();self.assertIsNone(p.otp_hash)
        response=self.post('completar/',{**datos,'nombre':'Falso','cedula':'999999'})
        self.assertEqual(response.status_code,201,response.data)
        medico=Medico.objects.get()
        self.assertEqual((medico.nombre,medico.cedula),('Ana','1234567890'))
        self.assertEqual(medico.ultima_solicitud_validacion.estado,'pendiente')
        self.assertFalse(medico.esta_aprobado)
        request=type('Request',(),{'user':medico})()
        self.assertFalse(IsMedicoAprobado().has_permission(request,None))
        self.client.force_authenticate(user=medico)
        self.assertEqual(self.client.get('/api/medicos/dashboard/inicio/').status_code,403)
        self.assertFalse(Usuario.objects.exists())
        self.assertEqual(self.post('completar/',datos).status_code,400)

    def test_identidad_verificada_protegida_en_perfil(self):
        from medicos.services import editarPerfilMedicoService, actualizarMedicoService
        p,datos=self.correo()
        self.post('verificar-correo/',{**datos,'codigo':'123456'})
        self.post('completar/',datos)
        medico=Medico.objects.get()
        for editar in (editarPerfilMedicoService,actualizarMedicoService):
            self.assertEqual(editar(medico.pk,{'nombre':'Otra persona'})[1],400)
            self.assertEqual(editar(medico.pk,{'nombre':'Ana'})[1],200)
        medico.refresh_from_db()
        self.assertEqual(medico.nombre,'Ana')

    def test_ambas_caras_se_validan_antes_de_almacenar(self):
        p=self.iniciar()
        with patch('users.services.default_storage.save') as storage:
            response=self.client.post('/api/medicos/registro/subir-documento/',{
                'proceso_id':str(p.pk),'documento_frente':self.imagen(),
                'documento_reverso':self.imagen('falso.jpg')},format='multipart')
        self.assertEqual(response.status_code,400)
        storage.assert_not_called()
        p.refresh_from_db()
        self.assertIsNone(p.documento_id)

    def test_correo_y_profesionales_fijados_otp_no_se_reinicia(self):
        p,datos=self.correo()
        self.post('verificar-correo/',{**datos,'codigo':'000000'})
        p.refresh_from_db();hash_anterior=p.otp_hash
        self.assertEqual(self.post('credenciales/',{**datos,**self.credenciales}).status_code,200)
        p.refresh_from_db();self.assertEqual(p.otp_hash,hash_anterior)
        self.assertEqual(p.intentos_otp,1)
        self.assertEqual(self.profesional(p)[0].status_code,400)

    def test_expiracion_del_proceso_impide_avanzar(self):
        p=self.iniciar()
        p.expira_en=timezone.now()-timedelta(seconds=1);p.save()
        for ruta,extras in [('credenciales/',self.credenciales),('documento/verificar/',{}),('completar/',{})]:
            self.assertEqual(self.post(ruta,{'proceso_id':str(p.pk),**extras}).status_code,400)

    def test_tipos_de_documento_compatibles(self):
        for tipo in ('TI','RC','PASAPORTE'):
            response=self.post('',{**self.personales,'tipo_documento':tipo,'numero_documento':'AB12345' if tipo=='PASAPORTE' else '1234567'})
            self.assertEqual(response.status_code,201,response.data)
            p=ProcesoRegistroUsuario.objects.get(pk=response.data['data']['proceso_id'])
            self.assertEqual(p.tipo_documento,tipo)
