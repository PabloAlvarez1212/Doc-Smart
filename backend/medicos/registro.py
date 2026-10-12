"""Fases del registro médico; OCR y OTP reutilizan el proceso del paciente."""
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from catalogos.models import Ciudad, Rol
from storage_app.models import Archivo
from storage_app.services import subir_archivo
from users.models import ProcesoRegistroUsuario, Usuario
from users import services
from users.serializers import IniciarRegistroUsuarioSerializer, DatosAdicionalesRegistroSerializer, CredencialesRegistroSerializer, SubirDocumentoRegistroSerializer, VerificarCorreoRegistroSerializer, ReenviarCodigoRegistroSerializer
from .models import Medico, Especialidad, SolicitudValidacionMedico
from .serializers import validar_hoja_vida_pdf


def es_mayor(fecha):
    hoy=timezone.localdate()
    return hoy.year-fecha.year-((hoy.month,hoy.day)<(fecha.month,fecha.day))>=18


class IniciarRegistroMedicoSerializer(IniciarRegistroUsuarioSerializer):
    def validate_fecha_nacimiento(self, valor):
        valor=super().validate_fecha_nacimiento(valor)
        if not es_mayor(valor):raise serializers.ValidationError('El registro profesional requiere ser mayor de 18 años')
        return valor


class DatosProfesionalesSerializer(serializers.Serializer):
    proceso_id=serializers.UUIDField()
    telefono=serializers.CharField(max_length=10)
    direccion=serializers.CharField(max_length=255,min_length=5,trim_whitespace=True)
    ciudad=serializers.PrimaryKeyRelatedField(queryset=Ciudad.objects.all())
    id_especialidad=serializers.PrimaryKeyRelatedField(queryset=Especialidad.objects.all())
    hoja_vida=serializers.FileField(allow_empty_file=False)
    validate_telefono=DatosAdicionalesRegistroSerializer.validate_telefono
    validate_hoja_vida=staticmethod(validar_hoja_vida_pdf)
    def validate_direccion(self,valor):
        if any(ord(c)<32 for c in valor):raise serializers.ValidationError('La dirección contiene caracteres inválidos')
        return ' '.join(valor.split())


@transaction.atomic
def guardar_profesionales(datos):
    proceso=ProcesoRegistroUsuario.objects.select_for_update().filter(pk=datos['proceso_id']).first()
    error=services.validarProcesoRegistro(proceso,'medico')
    if error:return error
    if not proceso.documento_verificado:return {'documento':['Primero verifica tu documento']},403
    if proceso.contraseña_hash:return {'general':['Los datos profesionales ya están fijados']},400
    metadata=subir_archivo(datos['hoja_vida'],'hoja_vida','registro_medico',proceso.pk)
    archivo=Archivo.objects.create(storage_key=metadata['key'],nombre_original=metadata['nombre'],content_type=metadata['tipo'],tamano=metadata['tamano'],tipo='documento',categoria='hoja_vida')
    proceso.telefono=datos['telefono']
    proceso.direccion_profesional=datos['direccion']
    proceso.ciudad_profesional=datos['ciudad']
    proceso.especialidad=datos['id_especialidad']
    proceso.hoja_vida=archivo
    proceso.save(update_fields=['telefono','direccion_profesional','ciudad_profesional','especialidad','hoja_vida'])
    return {'datos_guardados':True},200


@transaction.atomic
def completar_medico(proceso_id):
    proceso=ProcesoRegistroUsuario.objects.select_for_update().filter(pk=proceso_id).first()
    error=services.validarProcesoRegistro(proceso,'medico')
    if error:return error
    if not all([proceso.documento_verificado,proceso.correo_verificado,proceso.documento_verificado_en,proceso.correo_verificado_en,proceso.nombre_verificado,proceso.apellido_verificado,proceso.numero_documento_verificado,proceso.fecha_nacimiento_verificada,proceso.telefono,proceso.direccion_profesional,proceso.ciudad_profesional_id,proceso.especialidad_id,proceso.hoja_vida_id,proceso.correo,proceso.contraseña_hash]):
        return {'general':['Completa la identidad, datos profesionales y verificación del correo']},403
    if not es_mayor(proceso.fecha_nacimiento_verificada):return {'fecha_nacimiento':['Debes ser mayor de edad']},400
    if Usuario.objects.filter(correo__iexact=proceso.correo).exists() or Medico.objects.filter(correo__iexact=proceso.correo).exists():return {'correo':['No fue posible completar el registro']},400
    if Usuario.objects.filter(cedula=proceso.numero_documento_verificado).exists() or Medico.objects.filter(cedula=proceso.numero_documento_verificado).exists():return {'numero_documento':['No fue posible completar el registro']},400
    rol=Rol.objects.filter(nombre__iexact='doctor').first()
    if not rol:return {'general':['Rol de médico no configurado']},503
    medico=Medico.objects.create(nombre=proceso.nombre_verificado,apellido=proceso.apellido_verificado,cedula=proceso.numero_documento_verificado,tipo_documento=proceso.tipo_documento,fecha_nacimiento=proceso.fecha_nacimiento_verificada,telefono=proceso.telefono,correo=proceso.correo,contraseña=proceso.contraseña_hash,direccion=proceso.direccion_profesional,ciudad=proceso.ciudad_profesional,id_especialidad=proceso.especialidad,id_rol=rol,documento_verificado_en=proceso.documento_verificado_en,correo_verificado_en=proceso.correo_verificado_en)
    proceso.hoja_vida.medico=medico
    proceso.hoja_vida.save(update_fields=['medico'])
    solicitud=SolicitudValidacionMedico.objects.create(medico=medico,hoja_vida=proceso.hoja_vida,estado='pendiente')
    proceso.medico=medico
    proceso.estado=ProcesoRegistroUsuario.Estado.COMPLETADO
    proceso.completado_en=timezone.now()
    proceso.save(update_fields=['medico','estado','completado_en'])
    return {'id':medico.pk,'estado_validacion':solicitud.estado},201


class RegistroMedicoView(APIView):
    permission_classes=[AllowAny]
    authentication_classes=[]
    parser_classes=[JSONParser,MultiPartParser,FormParser]
    fase='iniciar'
    def post(self,request):
        clases={'iniciar':IniciarRegistroMedicoSerializer,'datos-profesionales':DatosProfesionalesSerializer,'credenciales':CredencialesRegistroSerializer,'subir-documento':SubirDocumentoRegistroSerializer,'verificar-correo':VerificarCorreoRegistroSerializer}
        serializer=clases.get(self.fase,ReenviarCodigoRegistroSerializer)(data=request.data)
        if not serializer.is_valid():return Response({'ok':False,'mensaje':'Revisa los campos indicados.','errores':serializer.errors},status=400)
        datos=serializer.validated_data
        if self.fase=='iniciar':resultado,estado=services.registrarUsuarioService(datos,'medico')
        elif self.fase=='datos-profesionales':resultado,estado=guardar_profesionales(datos)
        elif self.fase=='credenciales':resultado,estado=services.configurarCredencialesRegistroService(datos,'medico')
        elif self.fase=='subir-documento':resultado,estado=services.subirDocumentoRegistroService(**datos,tipo_registro='medico')
        elif self.fase=='documento/verificar':resultado,estado=services.verificarDocumentoRegistroService(datos['proceso_id'],'medico')
        elif self.fase=='documento/extraer':resultado,estado=services.extraerDocumentoRegistroService(datos['proceso_id'],'medico')
        elif self.fase=='verificar-correo':resultado,estado=services.verificarCorreoRegistroService(datos['proceso_id'],datos['codigo'],'medico')
        elif self.fase=='reenviar-codigo':resultado,estado=services.reenviarCodigoRegistroService(datos['proceso_id'],'medico')
        else:resultado,estado=completar_medico(datos['proceso_id'])
        if estado>=400:return Response({'ok':False,'mensaje':'Revisa los datos indicados y vuelve a intentar.','errores':resultado.get('errores',resultado),**({'data':{'comparaciones':resultado['comparaciones']}} if 'comparaciones' in resultado else {})},status=estado)
        return Response({'ok':True,'data':resultado,'mensaje':'Datos confirmados'},status=estado)
