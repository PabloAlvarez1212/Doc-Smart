import re
from rest_framework.permissions import BasePermission
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import CSRFCheck
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.exceptions import InvalidToken
import calendar
from datetime import date, datetime, time, timedelta
from users.models import Usuario
from medicos.models import Medico,SolicitudValidacionMedico
from citas.models import Cita
from django.db.models import Count, OuterRef, Q, Subquery
import os
import resend
from rest_framework import serializers
from django.utils import timezone
from rest_framework.response import Response
from django.template.loader import render_to_string

MENSAJE_CUENTA_BLOQUEADA = "Tu acceso a DocSmart está bloqueado."


def mensaje_bloqueo(cuenta):
    motivo = (getattr(cuenta, "motivo_bloqueo", "") or "").strip()
    return f"{MENSAJE_CUENTA_BLOQUEADA} Motivo: {motivo}" if motivo else MENSAJE_CUENTA_BLOQUEADA


def validarContraseña(contraseña):
    if len(contraseña) < 8:
        return 'La contraseña debe tener mínimo 8 caracteres'
    if re.search(r'[<>\\"\'&]', contraseña):
        return 'No se permiten los caracteres (<, >, ", \', &) en la contraseña'
    if not re.search(r'[^a-zA-Z0-9]', contraseña):
        return 'La contraseña debe contener al menos un carácter especial'
    if not re.search(r'[A-Z]', contraseña):
        return 'La contraseña debe tener mínimo una mayúscula'
    if not re.search(r'[a-z]', contraseña):
        return 'La contraseña debe tener mínimo una minúscula'
    if not re.search(r'\d', contraseña):
        return 'La contraseña debe tener mínimo un número'
    return None

def validarNumber(cedula):
    if not re.match(r"^\d+$",cedula):
        return 'Ingresa un numero valido'
    
# Autenticación JWT personalizada para soportar dos modelos de usuario (Medico y Usuario)
class CustomJWTAuthentication(JWTAuthentication):

    def authenticate(self, request):
        token = request.COOKIES.get("token")

        if not token:
            return super().authenticate(request)
        
        validated_token = self.get_validated_token(token)

        self.enforce_csrf(request)

        return self.get_user(validated_token), validated_token


    def enforce_csrf(self, request):
        def dummy_get_response(request):
            return None

        check = CSRFCheck(dummy_get_response)

        check.process_request(request)

        reason = check.process_view(
            request,
            None,
            (),
            {}
        )

        if reason:
            raise PermissionDenied(
                f"CSRF Failed: {reason}"
            )


    def get_user(self, validated_token):
        user_id = validated_token.get("user_id")
        tipo = validated_token.get("tipo")

        if tipo == "medico":
            medico = Medico.objects.filter(
                id=user_id
            ).first()

            if medico:
                if medico.acceso_bloqueado:
                    raise InvalidToken(mensaje_bloqueo(medico))
                return medico

        elif tipo == "usuario":
            usuario = Usuario.objects.filter(
                id=user_id
            ).first()

            if usuario:
                if usuario.acceso_bloqueado:
                    raise InvalidToken(mensaje_bloqueo(usuario))
                return usuario

        raise InvalidToken("User not found")
    
class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and  # ← verifica primero que esté logueado
            hasattr(request.user, 'id_rol') and  # ← verifica que tenga id_rol
            request.user.id_rol.nombre == 'admin'
        )
        
class IsMedico(BasePermission):

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and isinstance(request.user, Medico)
        )
        
class IsMedicoAprobado(BasePermission):

    message = (
        "Tu cuenta médica debe estar aprobada "
        "para acceder a esta sección."
    )

    def has_permission(self, request, view):
        if not (
            request.user
            and request.user.is_authenticated
            and isinstance(request.user, Medico)
        ):
            return False

        return request.user.esta_aprobado

class IsPaciente(BasePermission):
    message = "No tienes permisos para acceder a esta sección."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and isinstance(request.user, Usuario)
            and request.user.id_rol
            and request.user.id_rol.nombre == "paciente"
        )
        
class IsPacienteOrMedico(BasePermission):
    message = "No tienes permisos para realizar esta acción."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and (
                isinstance(request.user, Usuario)
                or isinstance(request.user, Medico)
            )
        )

class IsPacienteOrMedicoAprobado(BasePermission):
    message = "No tienes permisos para realizar esta acción."

    def has_permission(self, request, view):
        if not (
            request.user
            and request.user.is_authenticated
        ):
            return False

        if isinstance(request.user, Usuario):
            return bool(
                request.user.id_rol
                and request.user.id_rol.nombre == "paciente"
            )

        if isinstance(request.user, Medico):
            return request.user.esta_aprobado

        return False

def calcular_edad(fecha_nacimiento):
    hoy = date.today()

    edad = hoy.year - fecha_nacimiento.year

    if (hoy.month, hoy.day) < (fecha_nacimiento.month, fecha_nacimiento.day):
        edad -= 1

    return edad

def enviarCorreoMedicoAprobado(medico):
    frontend_url = os.getenv("FRONTEND_URL", "").rstrip("/")

    html_content = render_to_string(
        "emails/medico_aprobado.html",
        {
            "nombre": medico.nombre,
            "apellido": medico.apellido,
            "login_url": f"{frontend_url}/login",
        }
    )

    try:
        email = resend.Emails.send({
            "from": os.getenv("RESEND_FROM_EMAIL"),
            "to": [medico.correo],
            "subject": "Tu solicitud fue aprobada - DocSmart",
            "html": html_content,
        })

        print("Correo de aprobación enviado:", email)
        return True

    except Exception as e:
        print("Error enviando correo de aprobación:", repr(e))
        return False
    
def enviarCorreoMedicoRechazado(medico, motivo_rechazo, puede_reintentar_desde):
    frontend_url = os.getenv("FRONTEND_URL", "").rstrip("/")

    html_content = render_to_string(
        "emails/medico_rechazado.html",
        {
            "nombre": medico.nombre,
            "apellido": medico.apellido,
            "motivo_rechazo": motivo_rechazo,
            "puede_reintentar_desde": puede_reintentar_desde,
            "login_url": f"{frontend_url}/login",
        }
    )

    try:
        email = resend.Emails.send({
            "from": os.getenv("RESEND_FROM_EMAIL"),
            "to": [medico.correo],
            "subject": "Actualización sobre tu solicitud - DocSmart",
            "html": html_content,
        })

        print("Correo de rechazo enviado:", email)
        return True

    except Exception as e:
        print("Error enviando correo de rechazo:", repr(e))
        return False

# Nombres de Estado de cita tal como están en la tabla catalogos.Estado.
ESTADO_CITA_PENDIENTE = "pendiente"
ESTADO_CITA_CONFIRMADA = "confirmada"
ESTADO_CITA_REPROGRAMADA = "reprogramada"
ESTADO_CITA_COMPLETADA = "completada"
ESTADO_CITA_CANCELADA = "cancelada"
ESTADO_CITA_VENCIDA = "vencida"
ESTADO_CITA_INASISTENCIA = "inasistencia_paciente"

ESTADOS_INVALIDOS_CITA = (ESTADO_CITA_CANCELADA, ESTADO_CITA_VENCIDA)


def rellenarSerie(datos, inicio, fin, agrupacion, campo_valor, clave_periodo="periodo", siempre_rellenar=False):
    """
    Rellena con ceros los períodos sin datos entre inicio y min(fin, hoy).

    - Si el período está completamente en el futuro, devuelve datos sin modificar.
    - Si todos los valores son 0 y siempre_rellenar es False, devuelve [].
    """
    hoy = timezone.localdate()
    inicio_date = inicio.date() if hasattr(inicio, "date") else inicio
    fin_date = fin.date() if hasattr(fin, "date") else fin

    if inicio_date > hoy:
        return datos

    corte_date = min(fin_date, hoy + timedelta(days=1))

    indice = {item[clave_periodo]: item[campo_valor] for item in datos}

    resultado = []

    if agrupacion == "dia":
        cursor = inicio_date
        while cursor < corte_date:
            key = cursor.strftime("%Y-%m-%d")
            resultado.append({clave_periodo: key, campo_valor: indice.get(key, 0)})
            cursor += timedelta(days=1)
    else:
        cursor = date(inicio_date.year, inicio_date.month, 1)
        _ultimo_dia_corte = corte_date - timedelta(days=1)
        corte_mes = date(_ultimo_dia_corte.year, _ultimo_dia_corte.month, 1)
        while cursor <= corte_mes:
            key = cursor.strftime("%Y-%m")
            resultado.append({clave_periodo: key, campo_valor: indice.get(key, 0)})
            cursor = date(cursor.year + (cursor.month // 12), cursor.month % 12 + 1, 1)

    if not siempre_rellenar and all(item[campo_valor] == 0 for item in resultado):
        return []

    return resultado


def rellenarHoras(datos):
    """Rellena con 0 las horas faltantes entre la mínima y la máxima con datos."""
    if not datos:
        return datos
    horas = {item["hora"]: item["total_citas"] for item in datos}
    valores_hora = [int(h.split(":")[0]) for h in horas]
    min_h, max_h = min(valores_hora), max(valores_hora)
    return [
        {"hora": f"{h:02d}:00", "total_citas": horas.get(f"{h:02d}:00", 0)}
        for h in range(min_h, max_h + 1)
    ]

def citasValidas(queryset):
    "Excluye citas canceladas y vencidas."
    return queryset.exclude(id_estado__nombre__in=ESTADOS_INVALIDOS_CITA)


RESPONSABLE_SIN_DATO = "sin_dato"


def porcentajeUnDecimal(parte, base):
    return round(parte / base * 100, 1) if base else None


def conteosAgenda(rango=None, prefijo=""):
    """Agregados condicionales de agenda sobre un rango de fecha_programada (Q opcional); una sola consulta."""
    rango = rango if rango is not None else Q()
    es_valida = ~Q(id_estado__nombre__in=ESTADOS_INVALIDOS_CITA)
    es_valida_ya_ocurrida = es_valida & Q(fecha_programada__lt=timezone.now())
    return {
        f"{prefijo}base_programadas": Count("id", filter=rango),
        f"{prefijo}canceladas": Count("id", filter=rango & Q(id_estado__nombre=ESTADO_CITA_CANCELADA)),
        f"{prefijo}validas": Count("id", filter=rango & es_valida),
        f"{prefijo}base_inasistencia": Count("id", filter=rango & es_valida_ya_ocurrida),
        f"{prefijo}inasistencias": Count(
            "id", filter=rango & es_valida_ya_ocurrida & Q(id_estado__nombre=ESTADO_CITA_INASISTENCIA)
        ),
    }


def calidadAgenda(programadas):
    """Tasas de cancelación e inasistencia sobre las citas ya filtradas por fecha_programada."""
    canceladas_qs = programadas.filter(id_estado__nombre=ESTADO_CITA_CANCELADA)

    conteos = programadas.aggregate(**conteosAgenda())
    base_programadas = conteos["base_programadas"]
    canceladas = conteos["canceladas"]
    base_inasistencia = conteos["base_inasistencia"]
    inasistencias = conteos["inasistencias"]

    por_responsable = {}
    for item in canceladas_qs.values("cancelada_por").annotate(total=Count("id")):
        clave = item["cancelada_por"] or RESPONSABLE_SIN_DATO
        por_responsable[clave] = por_responsable.get(clave, 0) + item["total"]

    return {
        "base_programadas": base_programadas,
        "canceladas": canceladas,
        "tasa_cancelacion": porcentajeUnDecimal(canceladas, base_programadas),
        "base_inasistencia": base_inasistencia,
        "inasistencias": inasistencias,
        "tasa_inasistencia": porcentajeUnDecimal(inasistencias, base_inasistencia),
        "canceladas_por_responsable": [
            {"responsable": r, "total": t}
            for r, t in sorted(por_responsable.items(), key=lambda kv: (-kv[1], kv[0]))
        ],
    }


def pacientesNoBloqueados(queryset=None):
    """Única regla de "paciente contable": rol paciente y acceso no bloqueado."""
    if queryset is None:
        queryset = Usuario.objects.all()
    return queryset.filter(id_rol__nombre__iexact="paciente", acceso_bloqueado=False)


# Citas de pacientes contables (rol paciente y sin bloqueo); misma regla que pacientesNoBloqueados.
FILTRO_PACIENTE_ACTIVO = Q(
    id_usuario__id_rol__nombre__iexact="paciente",
    id_usuario__acceso_bloqueado=False,
)

# Con menos citas/calificaciones que esto en el tramo anterior, la variación de una tasa no es fiable.
MIN_BASE_COMPARACION = 5


def tramosComparacion(hoy=None):
    """Tramo del mes en curso (día 1 a hoy) y el mismo tramo del mes anterior, con fechas inclusivas.

    Si el mes anterior tiene menos días, el tramo anterior termina en su último día."""
    hoy = hoy or timezone.localdate()
    inicio_actual = hoy.replace(day=1)
    inicio_anterior = (inicio_actual - timedelta(days=1)).replace(day=1)
    dias_mes_anterior = calendar.monthrange(inicio_anterior.year, inicio_anterior.month)[1]
    fin_anterior = inicio_anterior.replace(day=min(hoy.day, dias_mes_anterior))
    return {"actual": (inicio_actual, hoy), "anterior": (inicio_anterior, fin_anterior)}


def limitesTramo(desde, hasta):
    """(inicio, fin_exclusivo) en la zona horaria del proyecto para un tramo de fechas inclusivas."""
    zona = timezone.get_current_timezone()
    return (
        timezone.make_aware(datetime.combine(desde, time.min), zona),
        timezone.make_aware(datetime.combine(hasta + timedelta(days=1), time.min), zona),
    )


def variacionPorcentual(valor, anterior):
    """Variación en % respecto al período anterior; None si no hay base para compararla."""
    if valor is None or not anterior:
        return None
    return porcentajeUnDecimal(valor - anterior, anterior)


def variacionDiferencia(valor, anterior, base_anterior):
    """Diferencia absoluta (puntos de una tasa o de una calificación) con base mínima en el período anterior."""
    if valor is None or anterior is None or base_anterior < MIN_BASE_COMPARACION:
        return None
    return round(valor - anterior, 1)


def pacientesActivos(inicio, fin):
    return (
        citasValidas(
            Cita.objects.filter(
                FILTRO_PACIENTE_ACTIVO,
                fecha_programada__gte=inicio,
                fecha_programada__lt=fin,
            )
        )
        .values("id_usuario")
        .distinct()
        .count()
    )

def medicosAprobadosActivos(queryset):
    return filtrarMedicosAprobados(queryset).filter(acceso_bloqueado=False)


def filtrarMedicosAprobados(queryset):
    ultima_solicitud = (
        SolicitudValidacionMedico.objects
        .filter(medico=OuterRef("pk"))
        .order_by("-fecha_solicitud")
        .values("estado")[:1]
    )

    return (
        queryset
        .annotate(
            estado_ultima_solicitud=Subquery(
                ultima_solicitud
            )
        )
        .filter(
            estado_ultima_solicitud=(
                SolicitudValidacionMedico
                .EstadoSolicitud
                .APROBADO
            )
        )
    )

class FiltroPeriodoSerializer(serializers.Serializer):
    anio = serializers.IntegerField(
        required=False
    )
    mes = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=12
    )

    def validate(self, data):
        anio = data.get("anio")
        mes = data.get("mes")

        if mes is not None and anio is None:
            raise serializers.ValidationError({
                "anio": "Debes seleccionar un año para filtrar por mes."
            })

        if anio is None:
            data["anio"] = timezone.localdate().year

        return data
    
def respuesta_ok(data=None, mensaje=None, status=200):
    return Response({'ok': True, 'mensaje': mensaje, 'data': data}, status=status)

def respuesta_error(mensaje, errores=None, status=400):
    return Response({
        'ok': False,
        'mensaje': 'Error',
        'errores': errores or {'detalle': mensaje}
    }, status=status)

def respuesta_serializer_invalido(errors):
    return respuesta_error('Datos inválidos', errores=errors, status=400)