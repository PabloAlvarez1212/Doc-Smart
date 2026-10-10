from rest_framework import serializers
from users.models import Usuario,InfoUser, TipoInfoUser
from medicos.models import Medico
from utils import validarNumber,validarContraseña,calcular_edad
import re
from datetime import date



class ExtraerDocumentoRegistroSerializer(serializers.Serializer):
    proceso_id=serializers.UUIDField()


#!SALIDA
class UsuarioSerializer(serializers.ModelSerializer):
    rol = serializers.CharField(source='id_rol.nombre')
    
    class Meta:
        model = Usuario
        fields = ['id','nombre','apellido','correo','rol','telefono','cedula','genero','tipo_sangre']

class MedicoSerializer(serializers.ModelSerializer):
    rol = serializers.CharField(source='id_rol.nombre')
    especialidad = serializers.CharField(source='id_especialidad.nombre')    # Nombre de la especialidad
    ciudad = serializers.CharField(source='ciudad.nombre')                   # Nombre de la ciudad
    departamento = serializers.CharField(source='ciudad.departamento.nombre') # Departamento de la ciudad
    estado_validacion = serializers.SerializerMethodField()
    class Meta:
        model = Medico
        fields = ['id', 'nombre', 'apellido', 'correo', 'rol','telefono','especialidad', 'ciudad', 'departamento', 'direccion','cedula','estado_validacion']
        
    def get_estado_validacion(self, obj):
        solicitud = obj.ultima_solicitud_validacion

        if not solicitud:
            return None

        return solicitud.estado
class UsuarioPerfilSerializer(serializers.ModelSerializer):
    rol = serializers.CharField(source='id_rol.nombre')
    edad = serializers.SerializerMethodField()
    class Meta:
        model  = Usuario
        fields = [
            'id',
            'nombre',
            'apellido',
            'correo',
            'cedula',
            'telefono',
            'estatura',
            'peso',
            'genero',
            'tipo_sangre',
            'fecha_nacimiento',
            'edad',
            'rol',
            'foto_perfil',
        ]
    def get_edad(self, obj):
        return calcular_edad(obj.fecha_nacimiento)

class FotoPerfilPacienteSerializer(serializers.Serializer):

    foto_perfil = serializers.ImageField(
        required=True,
        error_messages={
            "required": "Debes seleccionar una imagen",
            "invalid": "El archivo seleccionado no es una imagen válida",
        }
    )

    def validate_foto_perfil(self, value):

        tipos_permitidos = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ]

        if value.content_type not in tipos_permitidos:
            raise serializers.ValidationError(
                "Solo se permiten imágenes JPG, PNG o WEBP"
            )

        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError(
                "La imagen no puede superar los 5 MB"
            )

        return value
       
#! MENSAJES REUTILIZABLES

def msg(campo, articulo = 'El'):
    return {
        'required': f'{articulo} {campo} es obligatorio',
        'blank':    f'{articulo}  {campo} no puede estar vacío',
        'null':     f'{articulo}  {campo} no puede ser nulo',
        'invalid':  f'{articulo}  {campo} no tiene un formato válido',
        'max_length': f'{articulo}  {campo} es demasiado largo',
        'min_length': f'{articulo}  {campo} es demasiado corto',
    }

def msg_numero(campo, articulo = 'El'):
    return {
        'required':   f'{articulo} {campo} es obligatorio',
        'invalid':    f'{articulo} {campo} debe ser un número válido',
        'min_value':  f'{articulo}  {campo} ingresado es demasiado bajo',
        'max_value':  f'{articulo}  {campo} ingresado es demasiado alto',
    }


#!ENTRADA

class IniciarRegistroUsuarioSerializer(serializers.Serializer):
    nombre=serializers.CharField(max_length=100,allow_blank=False,trim_whitespace=True,error_messages=msg("nombre"))
    apellido=serializers.CharField(max_length=100,allow_blank=False,trim_whitespace=True,error_messages=msg("apellido"))
    tipo_documento=serializers.ChoiceField(choices=Usuario.TIPOS_DOCUMENTO)
    numero_documento=serializers.CharField(min_length=5,max_length=30,allow_blank=False,trim_whitespace=True)
    fecha_nacimiento=serializers.DateField(error_messages={"required":"La fecha de nacimiento es obligatoria","invalid":"La fecha de nacimiento no tiene un formato válido"})

    def validate_nombre(self,value):
        value=value.strip()
        if len(value)<2: raise serializers.ValidationError("El nombre debe tener al menos 2 caracteres")
        if not re.fullmatch(r"[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]+",value): raise serializers.ValidationError("El nombre solo puede contener letras")
        return value

    def validate_apellido(self,value):
        value=value.strip()
        if len(value)<2: raise serializers.ValidationError("El apellido debe tener al menos 2 caracteres")
        if not re.fullmatch(r"[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]+",value): raise serializers.ValidationError("El apellido solo puede contener letras")
        return value

    def validate_numero_documento(self,value):
        value=value.strip().upper()
        if not re.fullmatch(r"[A-Z0-9\-]+",value): raise serializers.ValidationError("Número de documento inválido")
        return value

    def validate_fecha_nacimiento(self,value):
        hoy=date.today()
        if value>hoy: raise serializers.ValidationError("La fecha de nacimiento no puede estar en el futuro")
        if value.year<1900: raise serializers.ValidationError("La fecha de nacimiento no es válida")
        return value

    def validate(self,attrs):
        tipo=attrs.get("tipo_documento")
        numero=attrs.get("numero_documento","")

        if tipo in ("CC","TI","RC") and not numero.isdigit():
            raise serializers.ValidationError({"numero_documento":["Debe contener únicamente números"]})

        if tipo=="PASAPORTE" and not re.fullmatch(r"[A-Z0-9]+",numero):
            raise serializers.ValidationError({"numero_documento":["Formato de pasaporte inválido"]})

        return attrs

    
class DatosAdicionalesRegistroSerializer(serializers.Serializer):
    proceso_id=serializers.UUIDField()
    telefono=serializers.CharField(min_length=10,max_length=10,allow_blank=False,trim_whitespace=True)
    estatura=serializers.FloatField(min_value=0.5,max_value=2.5,error_messages=msg_numero("estatura","La"))
    peso=serializers.FloatField(min_value=1.0,max_value=500.0,error_messages=msg_numero("peso"))
    genero=serializers.ChoiceField(choices=["M","F","OTRO","PREFIERO_NO_DECIR"])
    tipo_sangre=serializers.ChoiceField(choices=["A+","A-","B+","B-","AB+","AB-","O+","O-"])

    def validate_telefono(self,value):
        if not value.isdigit(): raise serializers.ValidationError("El teléfono solo puede contener números")
        if not value.startswith("3"): raise serializers.ValidationError("El número de celular debe comenzar por 3")
        return value


class CredencialesRegistroSerializer(serializers.Serializer):
    proceso_id=serializers.UUIDField()
    correo=serializers.EmailField(trim_whitespace=True,error_messages={**msg("correo"),"invalid":"El correo no tiene un formato válido"})
    contraseña=serializers.CharField(min_length=8,max_length=72,trim_whitespace=False,write_only=True,error_messages={**msg("contraseña","La"),"min_length":"La contraseña debe tener mínimo 8 caracteres"})

    def validate_correo(self,value):
        return value.strip().lower()

    def validate_contraseña(self,value):
        error=validarContraseña(value)
        if error: raise serializers.ValidationError(error)
        if len(value.encode())>72: raise serializers.ValidationError("La contraseña supera el máximo de 72 bytes")
        return value


class SubirDocumentoRegistroSerializer(serializers.Serializer):
    proceso_id=serializers.UUIDField()
    documento_frente=serializers.ImageField(required=False,allow_empty_file=False)
    documento_reverso=serializers.ImageField(required=False,allow_empty_file=False)

    def validate(self,attrs):
        if not attrs.get("documento_frente") and not attrs.get("documento_reverso"):
            raise serializers.ValidationError(
                {"documento":["Debes enviar al menos una cara del documento"]}
            )

        return attrs

class VerificarCorreoRegistroSerializer(serializers.Serializer):

    proceso_id = serializers.UUIDField()

    codigo = serializers.CharField(
        min_length=6,
        max_length=6,
        trim_whitespace=True
    )

    def validate_codigo(self, value):

        if not value.isdigit():
            raise serializers.ValidationError(
                "El código debe contener únicamente números"
            )

        return value


class ReenviarCodigoRegistroSerializer(serializers.Serializer):

    proceso_id = serializers.UUIDField()

class VerificarDocumentoRegistroSerializer(serializers.Serializer):
    proceso_id=serializers.UUIDField()

class CompletarRegistroUsuarioSerializer(serializers.Serializer):

    proceso_id = serializers.UUIDField()

class EditarUsuarioSerializer(serializers.Serializer):

    telefono = serializers.CharField(
        min_length=10,
        max_length=10,
        allow_blank=False,
        trim_whitespace=True,
        required=False,
        error_messages={
            **msg("teléfono"),
            "min_length": "El teléfono debe tener 10 dígitos",
            "max_length": "El teléfono debe tener 10 dígitos",
        }
    )

    estatura = serializers.FloatField(
        min_value=0.5,
        max_value=2.5,
        required=False,
        error_messages=msg_numero(
            "estatura",
            "La"
        )
    )

    peso = serializers.FloatField(
        min_value=1.0,
        max_value=500.0,
        required=False,
        error_messages=msg_numero("peso")
    )

    genero=serializers.ChoiceField(
        choices=["M","F","OTRO","PREFIERO_NO_DECIR"],
        required=False
    )

    tipo_sangre=serializers.ChoiceField(
        choices=["A+","A-","B+","B-","AB+","AB-","O+","O-"],
        required=False
    )

    def validate_telefono(self, value):

        if not value.isdigit():
            raise serializers.ValidationError(
                "El teléfono solo puede contener números"
            )

        if not value.startswith("3"):
            raise serializers.ValidationError(
                "El número de celular debe comenzar por 3"
            )

        return value

class LoginSerializer(serializers.Serializer):
    correo = serializers.EmailField(
                trim_whitespace=True,
                error_messages={**msg('correo'), 'invalid': 'El correo no tiene un formato válido'})
    
    contraseña = serializers.CharField(
                    error_messages=msg('contraseña'))


class SolicitarCambioCorreoSerializer(serializers.Serializer):

    correo = serializers.EmailField(
        trim_whitespace=True,
        error_messages={
            **msg("correo"),
            "invalid": "El correo no tiene un formato válido",
        }
    )

    def validate_correo(self, value):
        return value.strip().lower()


class ConfirmarCambioCorreoSerializer(serializers.Serializer):

    cambio_id = serializers.UUIDField()

    codigo = serializers.CharField(
        min_length=6,
        max_length=6,
        trim_whitespace=True
    )

    def validate_codigo(self, value):

        if not value.isdigit():
            raise serializers.ValidationError(
                "El código debe contener únicamente números"
            )

        return value


class CambiarContraseñaSerializer(serializers.Serializer):
    token = serializers.CharField(
                           error_messages=msg('token'))
    nueva_contraseña = serializers.CharField(
                           min_length=8,
                           error_messages={
                               **msg('contraseña'),
                               'min_length': 'La contraseña debe tener al menos 8 caracteres'
                           })
    def validate_nueva_contraseña(self, value):
        error = validarContraseña(value)
        if error:
            raise serializers.ValidationError(error)
        return value

class CambiarContraseñaAutenticadoSerializer(serializers.Serializer):
    contraseña_actual = serializers.CharField(
        write_only=True,
        error_messages={
            **msg('contraseña','La')
        }
    )
    nueva_contraseña = serializers.CharField(
        min_length=8,
        error_messages={
            **msg('nueva contraseña','La'),
            'min_length': 'La contraseña debe tener al menos 8 caracteres'})
    def validate_nueva_contraseña(self, value):
        error = validarContraseña(value)
        if error:
            raise serializers.ValidationError(error)
        return value

class TipoInfoUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoInfoUser
        fields = ["id", "codigo", "nombre"]


class InfoUserSerializer(serializers.ModelSerializer):
    tipo_nombre = serializers.CharField(
        source="id_tipo.nombre", read_only=True
    )
    tipo_codigo = serializers.CharField(
        source="id_tipo.codigo", read_only=True
    )
    id_tipo = serializers.PrimaryKeyRelatedField(
        queryset=TipoInfoUser.objects.filter(activo=True)
    )

    class Meta:
        model = InfoUser
        fields = [
            "id", "id_tipo", "tipo_nombre", "tipo_codigo",
            "nombre", "descripcion", "fecha_inicio", "fecha_fin",
            "estado", "es_permanente", "dosis", "frecuencia",
            "via_administracion", "reaccion",
            "fecha_creacion", "fecha_actualizacion",
        ]
        read_only_fields = ["id", "fecha_creacion", "fecha_actualizacion"]

    def validate(self, datos):
        def valor(campo):
            return datos.get(campo, getattr(self.instance, campo, None))

        inicio, fin = valor("fecha_inicio"), valor("fecha_fin")
        if inicio and fin and fin < inicio:
            raise serializers.ValidationError({
                "fecha_fin": "No puede ser anterior a la fecha de inicio."
            })

        tipo = valor("id_tipo")
        campos = {
            "medicamento": ("dosis", "frecuencia", "via_administracion"),
            "alergia": ("reaccion",),
        }
        for codigo, nombres in campos.items():
            for campo in nombres:
                if tipo.codigo != codigo:
                    if datos.get(campo):
                        raise serializers.ValidationError({
                            campo: f"Este campo solo corresponde a {codigo}."
                        })

                    datos[campo] = ""
        return datos