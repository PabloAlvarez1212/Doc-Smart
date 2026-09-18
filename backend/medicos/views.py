import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from utils import IsAdmin,IsMedico,IsMedicoAprobado,IsPaciente
from rest_framework.permissions import AllowAny, IsAuthenticated
from medicos.models import Medico
from medicos.services import (
    listarMedicosService,
    obtenerMedicoService,
    crearMedicoService,
    actualizarMedicoService,
    eliminarMedicoService,
    listarEspecialidadesService,
    obtenerEspecialidadService,
    crearEspecialidadService,
    editarEspecialidadService,
    eliminarEspecialidadService,
    obtenerDashboardMedicoInicioService,
    obtenerPerfilMedicoService,
    editarPerfilMedicoService,
    actualizarFotoPerfilMedicoService,
    eliminarFotoPerfilMedicoService,
    listarMedicosPublicosService,
    listarSolicitudesValidacionService,
    obtenerMetricasValidacionMedicosService,
    obtenerHojaVidaSolicitudService,
    aprobarSolicitudValidacionService,
    rechazarSolicitudValidacionService,
    obtenerMiValidacionService,
    reintentarSolicitudValidacionService,
)
from medicos.serializers import (
    RegistrarMedicoSerializer,
    EditarMedicoSerializer,
    RegistrarEspecialidadSerializer,
    EditarEspecialidadSerializer,
    FotoPerfilMedicoSerializer,
    RechazarSolicitudValidacionSerializer,
    ReintentarSolicitudValidacionSerializer,
)
from rest_framework.parsers import MultiPartParser, FormParser


logger = logging.getLogger(__name__)

# ── HELPERS DE RESPUESTA ESTANDARIZADA ───────────────────────────────────────

# Respuesta exitosa: incluye datos y mensaje opcional
def respuesta_ok(data=None, mensaje=None, status=200):
    return Response({
        'ok': True,
        'mensaje': mensaje,
        'data': data
    }, status=status)

# Respuesta de error: incluye mensaje y detalle de errores opcional
def respuesta_error(mensaje, errores=None, status=400):
    return Response({
        'ok': False,
        'mensaje': "Error",
        'errores': errores or {"detalle": mensaje}
    }, status=status)

# Atajo para responder errores de validación de serializer
def respuesta_serializer_invalido(errors):
    return respuesta_error('Datos inválidos', errores=errors, status=400)


# ── VISTAS DE MÉDICOS ────────────────────────────────────────────────────────

# Vista pública: permite registrar un nuevo médico sin autenticación
class RegistrarMedicoView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    parser_classes = [MultiPartParser, FormParser]
    def post(self, request):
        try:
            serializer = RegistrarMedicoSerializer(
                data=request.data
            )

            if not serializer.is_valid():
                return respuesta_serializer_invalido(
                    serializer.errors
                )

            respuesta, status_code = crearMedicoService(
                serializer.validated_data
            )

            if status_code != 201:
                return respuesta_error(
                    respuesta,
                    status=status_code
                )

            return respuesta_ok(
                data=respuesta,
                mensaje="Médico registrado correctamente. Tu solicitud está pendiente de validación.",
                status=status_code
            )

        except Exception as e:
            print("Error registrando médico:", e)

            return respuesta_error(
                "Error interno en el servidor",
                status=500
            )


# Vista admin: lista todos los médicos registrados
class MedicoListView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        try:
            resultado, status_code = listarMedicosService()
            return respuesta_ok(resultado, status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error("Error interno en el servidor", status=500)

#Vista admin: Lista los medicos que estan en pendientes y rechazados
class ListarSolicitudesValidacionView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        busqueda = request.query_params.get("busqueda")
        estado = request.query_params.get("estado")
        especialidad = request.query_params.get("especialidad")
        departamento = request.query_params.get("departamento")
        ciudad = request.query_params.get("ciudad")

        try:
            data, status_code = listarSolicitudesValidacionService(
                request=request,
                busqueda=busqueda,
                estado=estado,
                especialidad=especialidad,
                departamento=departamento,
                ciudad=ciudad,
            )
        except ValidationError as error:
            return respuesta_serializer_invalido(error.detail)

        return respuesta_ok(
            data=data,
            mensaje="Solicitudes de validación obtenidas correctamente",
            status=status_code
        )

#Vista admin: Muestra metricas del numero de medicos aprobados,rechazados y pendientes
class MetricasValidacionMedicosView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get(self, request):
        try:
            data, status_code = obtenerMetricasValidacionMedicosService()

            return respuesta_ok(
                data=data,
                mensaje="Métricas de validación obtenidas correctamente",
                status=status_code
            )

        except Exception as e:
            return respuesta_error(
                mensaje="Error al obtener las métricas de validación",
                errores={"detalle": str(e)},
                status=500
            )

#Vista admin: Genera url de la hoja de vida
class HojaVidaSolicitudValidacionView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    def get(self, request, solicitud_id):
        try:
            data, status_code = obtenerHojaVidaSolicitudService(solicitud_id)

            if status_code == 404:
                return respuesta_error(
                    mensaje="Solicitud de validación no encontrada",
                    status=404
                )

            return respuesta_ok(
                data=data,
                mensaje="Hoja de vida obtenida correctamente",
                status=status_code
            )

        except Exception as e:
            return respuesta_error(
                mensaje="Error al obtener la hoja de vida",
                errores={"detalle": str(e)},
                status=500
            )

#Vista admin: Aprueba solicitudes de medicos.
class AprobarSolicitudValidacionView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    def patch(self, request, solicitud_id):
        try:
            data, status_code = aprobarSolicitudValidacionService(
                solicitud_id
            )

            if status_code == 404:
                return respuesta_error(
                    mensaje="Solicitud de validación no encontrada",
                    status=404
                )

            if status_code == 400:
                return respuesta_error(
                    mensaje="Solo se pueden aprobar solicitudes pendientes",
                    status=400
                )

            return respuesta_ok(
                data=data,
                mensaje="Solicitud de validación aprobada correctamente",
                status=status_code
            )

        except Exception as e:
            return respuesta_error(
                mensaje="Error al aprobar la solicitud de validación",
                errores={"detalle": str(e)},
                status=500
            )

class RechazarSolicitudValidacionView(APIView):

    def patch(self, request, solicitud_id):
        try:
            serializer = RechazarSolicitudValidacionSerializer(
                data=request.data
            )

            if not serializer.is_valid():
                return respuesta_serializer_invalido(
                    serializer.errors
                )

            motivo_rechazo = serializer.validated_data["motivo_rechazo"]

            data, status_code = rechazarSolicitudValidacionService(
                solicitud_id,
                motivo_rechazo
            )

            if status_code == 404:
                return respuesta_error(
                    mensaje="Solicitud de validación no encontrada",
                    status=404
                )

            if status_code == 400:
                return respuesta_error(
                    mensaje="Solo se pueden rechazar solicitudes pendientes",
                    status=400
                )

            return respuesta_ok(
                data=data,
                mensaje="Solicitud de validación rechazada correctamente",
                status=status_code
            )

        except Exception as e:
            return respuesta_error(
                mensaje="Error al rechazar la solicitud de validación",
                errores={"detalle": str(e)},
                status=500
            )

class MiValidacionMedicoView(APIView):
    permission_classes = [
        IsAuthenticated,
        IsMedico,
    ]

    def get(self, request):
        try:
            resultado, status_code = obtenerMiValidacionService(
                request.user.id
            )

            if status_code != 200:
                return respuesta_error(
                    resultado,
                    status=status_code
                )

            return respuesta_ok(
                data=resultado,
                mensaje="Estado de validación obtenido correctamente",
                status=status_code
            )

        except Exception as e:
            print(
                f"Error al obtener estado de validación médica: {e}"
            )

            return respuesta_error(
                "Error interno del servidor",
                status=500
            )

class ReintentarSolicitudValidacionView(APIView):
    permission_classes = [
        IsAuthenticated,
        IsMedico,
    ]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = ReintentarSolicitudValidacionSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return respuesta_serializer_invalido(
                serializer.errors
            )

        try:
            resultado, status_code = (
                reintentarSolicitudValidacionService(
                    request.user.id,
                    serializer.validated_data["hoja_vida"]
                )
            )

            if status_code != 201:
                return respuesta_error(
                    "No fue posible enviar la solicitud",
                    errores=resultado,
                    status=status_code
                )

            return respuesta_ok(
                data=resultado,
                mensaje=(
                    "Nueva solicitud enviada correctamente"
                ),
                status=status_code
            )

        except Exception:
            logger.exception(
                "Error interno al reenviar una solicitud de validación."
            )

            return respuesta_error(
                "Error interno del servidor",
                status=500
            )
                              
# Vista admin: obtiene, actualiza o elimina un médico por ID
class MedicoDetailView(APIView):
    permission_classes = [IsAdmin]
    # Obtiene los datos de un médico específico
    def get(self, request, id_medico):
        try:
            resultado, status_code = obtenerMedicoService(id_medico)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(resultado, status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error("Error interno en el servidor", status=500)

    # Actualiza los datos de un médico existente
    def put(self, request, id_medico):
        try:
            serializer = EditarMedicoSerializer(data=request.data)
            if not serializer.is_valid():
                return respuesta_serializer_invalido(serializer.errors)
            data_validada = serializer.validated_data
            resultado, status_code = actualizarMedicoService(id_medico, data_validada)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(resultado, "Medico actualizado correctamente", status=status_code)
        except Exception as e:
            print(f"Error: {e}")
            return respuesta_error("Error interno en el servidor", status=500)

    # Elimina un médico por su ID
    def delete(self, request, id_medico):
        try:
            resultado, status_code = eliminarMedicoService(id_medico)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(mensaje=resultado, status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error("Error interno en el servidor", status=500)


# ── VISTAS DE ESPECIALIDADES ──────────────────────────────────────────────────

# Lista todas las especialidades (GET) y permite crear una nueva (POST)
class EspecialidadListView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdmin()] 

    def get(self, request):
        try:
            page = request.query_params.get('page')
            page_size = request.query_params.get('page_size', 10)
            search = request.query_params.get('search')

            resultado, status_code = listarEspecialidadesService(
                page=page, page_size=page_size, search=search,
            )
            return respuesta_ok(resultado, status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error("Error interno en el servidor", status=500)

    # Crea una nueva especialidad
    def post(self, request):
        try:
            serializer = RegistrarEspecialidadSerializer(data=request.data)
            if not serializer.is_valid():
                return respuesta_serializer_invalido(serializer.errors)
            data_validada = serializer.validated_data
            resultado, status_code = crearEspecialidadService(data_validada)
            if status_code != 201:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(resultado, "Especialidad registrada con éxito", status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error("Error interno en el servidor", status=500)


# Obtiene, actualiza o elimina una especialidad por ID
class EspecialidadDetailView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdmin()] 
    # Retorna los datos de una especialidad específica
    def get(self, request, id_especialidad):
        try:
            resultado, status_code = obtenerEspecialidadService(id_especialidad)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(resultado, status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error("Error interno en el servidor", status=500)

    # Actualiza el nombre de una especialidad existente
    def put(self, request, id_especialidad):
        try:
            serializer = EditarEspecialidadSerializer(data=request.data)
            if not serializer.is_valid():
                return respuesta_serializer_invalido(serializer.errors)
            data_validada = serializer.validated_data
            resultado, status_code = editarEspecialidadService(id_especialidad, data_validada)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(resultado, "Especialidad actualizada correctamente", status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error("Error interno en el servidor", status=500)

    # Elimina una especialidad por su ID
    def delete(self, request, id_especialidad):
        try:
            resultado, status_code = eliminarEspecialidadService(id_especialidad)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(mensaje=resultado, status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error("Error interno en el servidor", status=500)


class DashboardInicioMedicoView(APIView):
    permission_classes = [IsAuthenticated, IsMedicoAprobado]

    def get(self, request):
        try:
            resultado, statusCode = obtenerDashboardMedicoInicioService(
                request.user.id
            )

            if statusCode != 200:
                return respuesta_error(resultado, status=statusCode)

            return respuesta_ok(
                data=resultado,
                mensaje="Datos traídos exitosamente"
            )

        except Exception as e:
            print(e)
            return respuesta_error(
                "Error interno del servidor",
                status=500
            )
class PerfilMedicoView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsMedico,
    ]

    # Obtener perfil del médico autenticado
    def get(self, request):
        try:
            resultado, status_code = obtenerPerfilMedicoService(
                request.user.id
            )

            if status_code != 200:
                return respuesta_error(
                    resultado,
                    status=status_code
                )

            return respuesta_ok(
                data=resultado,
                status=status_code
            )

        except Exception as e:
            print(f"Error al obtener perfil médico: {e}")

            return respuesta_error(
                "Error interno del servidor",
                status=500
            )

    # Actualizar perfil del médico autenticado
    def put(self, request):
        try:
            resultado, status_code = editarPerfilMedicoService(
                request.user.id,
                request.data
            )

            if status_code != 200:
                return respuesta_error(
                    "Datos inválidos",
                    errores=resultado,
                    status=status_code
                )

            return respuesta_ok(
                data=resultado,
                mensaje="Perfil actualizado correctamente",
                status=status_code
            )

        except Exception as e:
            print(f"Error al actualizar perfil médico: {e}")

            return respuesta_error(
                "Error interno del servidor",
                status=500
            )

    def delete(self, request):
        try:

            resultado, status_code = eliminarMedicoService(
                request.user.id
            )

            if status_code != 200:
                return respuesta_error(
                    resultado,
                    status=status_code
                )

            response = respuesta_ok(
                mensaje=resultado
            )

            response.delete_cookie(
                'token',
                path='/'
            )

            response.delete_cookie(
                'user_role',
                path='/'
            )

            response.delete_cookie(
                'user_id',
                path='/'
            )

            return response

        except Exception as e:

            print(
                f"Error al eliminar cuenta del médico: {e}"
            )

            return respuesta_error(
                "Error interno del servidor",
                status=500
            )

class FotoPerfilMedicoView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated, IsMedico]

    def patch(self, request):

        try:

            serializer = FotoPerfilMedicoSerializer(
                data=request.data
            )

            if not serializer.is_valid():

                return respuesta_serializer_invalido(
                    serializer.errors
                )

            foto = serializer.validated_data[
                "foto_perfil"
            ]

            medico = actualizarFotoPerfilMedicoService(
                request.user,
                foto
            )

            return respuesta_ok(
                data={
                    "foto_perfil": medico.foto_perfil.url
                },
                mensaje="Foto de perfil actualizada correctamente"
            )

        except Exception as e:

            print(
                f"Error al actualizar foto del médico: {e}"
            )

            return respuesta_error(
                "Error interno del servidor",
                status=500
            )

    def delete(self, request):

        try:

            eliminarFotoPerfilMedicoService(
                request.user
            )

            return respuesta_ok(
                data={
                    "foto_perfil": None
                },
                mensaje="Foto de perfil eliminada correctamente"
            )

        except Exception as e:

            print(
                f"Error al eliminar foto del médico: {e}"
            )

            return respuesta_error(
                "Error interno del servidor",
                status=500
            )
class MedicosDisponiblesView(APIView):
    permission_classes = [
        IsAuthenticated,
        IsPaciente
    ]

    def get(self, request):
        try:
            search = request.query_params.get("search")
            especialidad = request.query_params.get("especialidad")
            departamento = request.query_params.get("departamento")
            ciudad = request.query_params.get("ciudad")

            respuesta, status_code = listarMedicosPublicosService(
                search=search,
                especialidad=especialidad,
                departamento=departamento,
                ciudad=ciudad
            )

            return respuesta_ok(data=respuesta,mensaje="Lista de médicos públicos",status=status_code)

        except Exception as e:
            print("Error en el servidor:", e)
            return respuesta_error(mensaje="Error interno en el servidor",status=500)
