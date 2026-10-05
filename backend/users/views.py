from multiprocessing.util import DEBUG

from rest_framework.views import APIView
from django.middleware.csrf import get_token
from rest_framework.response import Response
from citas import serializers
from rest_framework.permissions import IsAuthenticated,AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from utils import IsAdmin,IsPaciente,FiltroPeriodoSerializer
from django.conf import settings
from users.services import (
    loginService,
    cambiarContraseñaService,
    registrarUsuarioService,
    guardarDatosAdicionalesRegistroService,
    configurarCredencialesRegistroService,
    verificarCorreoRegistroService,
    reenviarCodigoRegistroService,
    completarRegistroUsuarioService,
    solicitarCambioCorreoService,
    confirmarCambioCorreoService,
    listarPacientesService,
    obtenerUsuarioService,
    editarUsuarioService,
    eliminarUsuarioService,
    obtenerDashboardPacienteInicioService,
    actualizarFotoPerfilPacienteService,
    eliminarFotoPerfilPacienteService,
    refreshTokenService,
    cambiarContraseñaAutenticadoService,
    obtenerMetricasSistema,
    obtenerEstadisticasPacientesService,
    subirDocumentoRegistroService,
    extraerDocumentoRegistroService,
    verificarDocumentoRegistroService,
    
)
from users.serializers import (
    LoginSerializer,
    CambiarContraseñaSerializer,
    IniciarRegistroUsuarioSerializer,
    DatosAdicionalesRegistroSerializer,
    CredencialesRegistroSerializer,
    VerificarCorreoRegistroSerializer,
    ReenviarCodigoRegistroSerializer,
    EditarUsuarioSerializer,
    SolicitarCambioCorreoSerializer,
    ConfirmarCambioCorreoSerializer,
    FotoPerfilPacienteSerializer,
    CambiarContraseñaAutenticadoSerializer,
    SubirDocumentoRegistroSerializer,
    ReenviarCodigoRegistroSerializer,
    ExtraerDocumentoRegistroSerializer,
    VerificarDocumentoRegistroSerializer,
    CompletarRegistroUsuarioSerializer,
)


# ─── RESPUESTAS ESTANDARIZADAS ────────────────────────────────────────────────

def respuesta_ok(data=None, mensaje=None, status=200):
    return Response({
        'ok': True,
        'mensaje': mensaje,
        'data': data
    }, status=status)

def respuesta_error(mensaje, errores=None, status=400):
    return Response({
        'ok': False,
        'mensaje': "Error",
        'errores': errores or {"detalle" : mensaje}
    }, status=status)

def respuesta_serializer_invalido(errors):
    return respuesta_error('Datos inválidos', errores=errors, status=400)


# ─── VISTAS ───────────────────────────────────────────────────────────────────

#! Auths publicas - no necesitan Token

class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if not serializer.is_valid():
            return respuesta_serializer_invalido(
                serializer.errors
            )

        try:
            token, resultado, status_code = loginService(
                serializer.validated_data["correo"],
                serializer.validated_data["contraseña"]
            )

            if status_code != 200:
                return respuesta_error(
                    "Error",
                    errores=resultado,
                    status=status_code
                )

            response = Response({
                "ok": True,
                "mensaje": "Inicio de sesión exitoso",
                "data": resultado
            })

            # Access token
            response.set_cookie(
                key="token",
                value=str(token.access_token),
                httponly=True,
                secure=settings.AUTH_COOKIE_SECURE,
                samesite=settings.AUTH_COOKIE_SAMESITE,
                path="/",
                max_age=30 * 60
            )

            # Refresh token
            response.set_cookie(
                key="refresh_token",
                value=str(token),
                httponly=True,
                secure=settings.AUTH_COOKIE_SECURE,
                samesite=settings.AUTH_COOKIE_SAMESITE,
                path="/api/refresh/",
                max_age=7 * 24 * 60 * 60
            )

            return response

        except Exception:
            return respuesta_error(
                "Error interno del servidor",
                status=500
            )
class RefreshTokenView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")

        if not refresh_token:
            return respuesta_error(
                "Error",
                errores={
                    "general": [
                        "No hay una sesión disponible para renovar."
                    ]
                },
                status=401
            )

        nuevo_access_token, errores, status_code = refreshTokenService(
            refresh_token
        )

        if status_code != 200:
            response = respuesta_error(
                "Error",
                errores=errores,
                status=status_code
            )

            # Si el refresh ya no sirve,
            # limpiamos ambas cookies.
            response.delete_cookie(
                "token",
                path="/"
            )

            response.delete_cookie(
                "refresh_token",
                path="/api/refresh/"
            )

            return response

        response = respuesta_ok(
            mensaje="Sesión renovada correctamente"
        )

        response.set_cookie(
            key="token",
            value=str(nuevo_access_token),
            httponly=True,
            secure=settings.AUTH_COOKIE_SECURE,
            samesite=settings.AUTH_COOKIE_SAMESITE,
            path="/",
            max_age=30 * 60
        )

        return response

class LogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        try:
            response = respuesta_ok(
                mensaje="Sesión cerrada correctamente"
            )

            response.delete_cookie(
                "token",
                path="/"
            )

            response.delete_cookie(
                "refresh_token",
                path="/api/refresh/"
            )

            return response

        except Exception:
            return respuesta_error(
                "Error interno del servidor",
                status=500
            )

class CSRFTokenView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        csrf_token = get_token(request)

        return respuesta_ok(
            data={
                "csrf_token": csrf_token
            }
        )

class ExtraerDocumentoRegistroView(APIView):
    permission_classes=[AllowAny]
    authentication_classes=[]

    def post(self,request):
        serializer=ExtraerDocumentoRegistroSerializer(data=request.data)

        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)

        resultado,status_code=extraerDocumentoRegistroService(
            serializer.validated_data["proceso_id"]
        )

        if status_code!=200:
            return respuesta_error(
                "No fue posible extraer los datos del documento",
                errores=resultado,
                status=status_code
            )

        return respuesta_ok(
            data=resultado,
            mensaje="Datos extraídos correctamente",
            status=200
        )

class SolicitarCambioCorreoView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsPaciente
    ]

    def post(self, request):

        serializer = (
            SolicitarCambioCorreoSerializer(
                data=request.data
            )
        )

        if not serializer.is_valid():
            return respuesta_serializer_invalido(
                serializer.errors
            )

        resultado, status_code = (
            solicitarCambioCorreoService(
                request.user,
                serializer.validated_data[
                    "correo"
                ]
            )
        )

        if status_code != 201:
            return respuesta_error(
                "No fue posible solicitar el cambio",
                errores=resultado,
                status=status_code
            )

        return respuesta_ok(
            data=resultado,
            mensaje=(
                "Código enviado al nuevo correo"
            ),
            status=201
        )


class ConfirmarCambioCorreoView(APIView):

    permission_classes = [IsAuthenticated,IsPaciente]

    def post(self, request):
        serializer = (ConfirmarCambioCorreoSerializer(data=request.data))

        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)

        resultado, status_code = (
            confirmarCambioCorreoService(
                request.user,
                serializer.validated_data[
                    "cambio_id"
                ],
                serializer.validated_data[
                    "codigo"
                ]
            )
        )

        if status_code != 200:
            return respuesta_error("No fue posible cambiar el correo",errores=resultado,status=status_code)
        return respuesta_ok(data=resultado,mensaje=("Correo actualizado correctamente"),status=200)


class CambiarContraseñaView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = CambiarContraseñaSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)

        try:
            mensaje, status_code = cambiarContraseñaService(
                serializer.validated_data['token'],
                serializer.validated_data['nueva_contraseña']
            )

            if status_code != 200:
                return respuesta_error('Error',errores=mensaje, status=status_code)

            response = respuesta_ok(mensaje=mensaje)
            response.delete_cookie('token')
            response.delete_cookie('user_role')
            return response

        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)

class CambiarContraseñaAutenticadoView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self,request):
        try:
            serializer = CambiarContraseñaAutenticadoSerializer(data=request.data)
            if not serializer.is_valid():
                return respuesta_serializer_invalido(serializer.errors)
            respuesta, status = cambiarContraseñaAutenticadoService(
                persona=request.user,
                contraseña_actual=serializer.validated_data["contraseña_actual"],
                nueva_contraseña=serializer.validated_data["nueva_contraseña"])        
            if status != 200:
                return respuesta_error(respuesta,status=status)
            return respuesta_ok(mensaje=respuesta,status=status)
        except Exception as e:
            print(e)
            return respuesta_error("Error en el servidor",status=500)

#!Registro - publico - NO REQUIERE TOKEN
class RegistroView(APIView):

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = IniciarRegistroUsuarioSerializer(
            data=request.data
        )

        if not serializer.is_valid():return respuesta_serializer_invalido(serializer.errors)

        try:

            respuesta, status_code = (registrarUsuarioService(serializer.validated_data))
            if status_code != 201:
                return respuesta_error("No fue posible iniciar el registro",errores=respuesta,status=status_code)
            return respuesta_ok(data=respuesta,mensaje="Proceso de registro iniciado",status=201)

        except Exception as e:
            print(e)
            return respuesta_error("Error interno del servidor",status=500)



class DatosAdicionalesRegistroView(APIView):
    permission_classes=[AllowAny]
    authentication_classes=[]

    def post(self,request):
        serializer=DatosAdicionalesRegistroSerializer(data=request.data)
        if not serializer.is_valid():return respuesta_serializer_invalido(serializer.errors)
        resultado,status_code=guardarDatosAdicionalesRegistroService(serializer.validated_data)
        if status_code!=200:return respuesta_error("No fue posible guardar los datos",errores=resultado,status=status_code)
        return respuesta_ok(data=resultado,mensaje="Datos adicionales guardados",status=200)


class CredencialesRegistroView(APIView):
    permission_classes=[AllowAny]
    authentication_classes=[]

    def post(self,request):
        serializer=CredencialesRegistroSerializer(data=request.data)
        if not serializer.is_valid():return respuesta_serializer_invalido(serializer.errors)
        resultado,status_code=configurarCredencialesRegistroService(serializer.validated_data)
        if status_code!=200:return respuesta_error("No fue posible configurar el correo",errores=resultado,status=status_code)
        return respuesta_ok(data=resultado,mensaje="Código de verificación enviado",status=200)


class SubirDocumentoRegistroView(APIView):
    permission_classes=[AllowAny]
    authentication_classes=[]
    parser_classes=[MultiPartParser,FormParser]

    def post(self,request):
        serializer=SubirDocumentoRegistroSerializer(data=request.data)
        if not serializer.is_valid(): return respuesta_serializer_invalido(serializer.errors)

        resultado,status_code=subirDocumentoRegistroService(
            serializer.validated_data["proceso_id"],
            serializer.validated_data.get("documento_frente"),
            serializer.validated_data.get("documento_reverso")
        )

        if status_code!=200:
            return respuesta_error("No fue posible subir el documento",errores=resultado,status=status_code)

        return respuesta_ok(data=resultado,mensaje="Documento cargado correctamente",status=200)


class VerificarCorreoRegistroView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        serializer = (VerificarCorreoRegistroSerializer( data=request.data))

        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)

        resultado, status_code = (
            verificarCorreoRegistroService(
                serializer.validated_data[
                    "proceso_id"
                ],
                serializer.validated_data[
                    "codigo"
                ]
            )
        )

        if status_code != 200:
            return respuesta_error("No fue posible verificar el correo",errores=resultado,status=status_code)
        return respuesta_ok( data=resultado,mensaje="Correo verificado",status=200)  


class ReenviarCodigoRegistroView(APIView):

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):

        serializer = (ReenviarCodigoRegistroSerializer(data=request.data))

        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)

        resultado, status_code = (
            reenviarCodigoRegistroService(
                serializer.validated_data[
                    "proceso_id"
                ]
            )
        )

        if status_code != 200:
            return respuesta_error("No fue posible reenviar el código",errores=resultado,status=status_code)
        return respuesta_ok( mensaje="Código reenviado",status=200)   


class VerificarDocumentoRegistroView(APIView):
    permission_classes=[AllowAny]
    authentication_classes=[]

    def post(self,request):
        serializer=VerificarDocumentoRegistroSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)

        resultado,status_code=verificarDocumentoRegistroService(
            serializer.validated_data["proceso_id"]
        )

        if status_code!=200:
            return respuesta_error(
                "No fue posible verificar el documento",
                errores=resultado,
                status=status_code
            )

        return respuesta_ok(
            data=resultado,
            mensaje="Documento verificado correctamente",
            status=200
        )
    
class CompletarRegistroUsuarioView(APIView):
    permission_classes=[AllowAny]
    authentication_classes=[]

    def post(self,request):
        serializer=CompletarRegistroUsuarioSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)

        resultado,status_code=completarRegistroUsuarioService(
            serializer.validated_data["proceso_id"]
        )

        if status_code!=201:
            return respuesta_error(
                "No fue posible completar el registro",
                errores=resultado,
                status=status_code
            )

        return respuesta_ok(
            data=resultado,
            mensaje="Registro completado correctamente",
            status=201
        ) 


#!Metodos unicos del usuario - requiere Token

class PerfilPacienteView(APIView):
    permission_classes = [IsAuthenticated,IsPaciente]
    def get(self,request):
        try:
            respuesta,status_code = obtenerUsuarioService(request.user.id)
            if status_code != 200:
                return respuesta_error(mensaje=respuesta,status=status_code)
            return respuesta_ok(data=respuesta,status=status_code)
        except Exception as e:
            print(f"Error: {e}")
    def put(self,request):
        try:
            serializer = EditarUsuarioSerializer(
                data=request.data,
                context={
                    "request": request
                }
            )
            if not serializer.is_valid():
                return respuesta_serializer_invalido(serializer.errors)
            respuesta , status_code = editarUsuarioService(
                request.user.id,
                serializer.validated_data
            )
            if status_code != 200:
                return respuesta_error(mensaje=respuesta,status=status_code)
            return respuesta_ok(data=respuesta,mensaje="Usuario actualizado correctamente",status=status_code)
        except Exception as e:
            print(f"Error: {e}")
            return respuesta_error("Error interno en el servidor",status=500)
    def delete(self, request):
        try:
            resultado, status_code = eliminarUsuarioService(request.user.id)
            if status_code != 200:
                return respuesta_error(resultado,status=status_code)
            response = respuesta_ok(mensaje=resultado)
            response.delete_cookie('token',path='/')
            response.delete_cookie('user_role',path='/')
            response.delete_cookie('user_id',path='/')
            return response
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor',status=500)

class PerfilAdminView(APIView):
    permission_classes = [IsAuthenticated,IsAdmin]
    def get(self,request):
        try:
            respuesta,status_code = obtenerUsuarioService(request.user.id)
            if status_code != 200:
                return respuesta_error(mensaje=respuesta,status=status_code)
            return respuesta_ok(data=respuesta,status=status_code)
        except Exception as e:
            print(f"Error interno en el servidor: {e}")
                    
class FotoPerfilPacienteView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated,IsPaciente]

    def patch(self, request):

        try:

            serializer = FotoPerfilPacienteSerializer(
                data=request.data
            )

            if not serializer.is_valid():

                return respuesta_error(
                    "Error",
                    errores=serializer.errors,
                    status=400
                )

            foto = serializer.validated_data[
                "foto_perfil"
            ]

            usuario = actualizarFotoPerfilPacienteService(
                request.user,
                foto
            )

            return respuesta_ok(
                data={
                    "foto_perfil": usuario.foto_perfil.url
                }
            )

        except Exception as e:

            print(e)

            return respuesta_error(
                "Error interno del servidor",
                status=500
            )
            
    def delete(self, request):

        try:

            usuario = eliminarFotoPerfilPacienteService(
                request.user
            )

            return respuesta_ok(
                data={
                    "foto_perfil": None
                }
            )

        except Exception as e:

            print(e)

            return respuesta_error(
                "Error interno del servidor",
                status=500
            )
        
# ! Metodos para el Admin
class UsuarioListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    def get(self, request):
        try:
            page = request.query_params.get('page')
            page_size = request.query_params.get('page_size', 10)
            search = request.query_params.get('search')

            resultado, status_code = listarPacientesService(
                page=page, page_size=page_size, search=search,
            )
            return respuesta_ok(data=resultado, status=status_code)
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)

class UsuarioDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    def get(self, request, pk):
        try:
            resultado, status_code = obtenerUsuarioService(pk)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado)
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)

    def put(self, request, pk):
        serializer = EditarUsuarioSerializer(
            data=request.data,
            context={
                "usuario_id": pk
            }
        )
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)

        try:
            resultado, status_code = editarUsuarioService(
                pk, serializer.validated_data
            )
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado, mensaje='Usuario actualizado correctamente')
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)

    def delete(self, request, pk):
        try:
            resultado, status_code = eliminarUsuarioService(pk)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(mensaje=resultado)
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor', status=500)

class DashboardInicioPacienteView(APIView):
    permission_classes = [IsAuthenticated,IsPaciente]
    def get(self,request):
        try:
            resultado, statusCode = obtenerDashboardPacienteInicioService(request.user.id)
            if statusCode != 200:
                return respuesta_error(resultado,status=statusCode)
            return respuesta_ok(data=resultado,mensaje="Datos traidos exitosamente")
        except Exception as e:
            print(e)
            return respuesta_error('Error interno del servidor',status=500)

#vista admin: lista metricas necesarias para el dashboard del admin
class MetricasSistemaView(APIView):
    permission_classes = [IsAuthenticated,IsAdmin]
    def get(self,request):
        try:
            data,status_code = obtenerMetricasSistema()
            if(status_code != 200):
                return respuesta_error('Error al cargar las metricas: ', status=status_code)
            return respuesta_ok(data=data,mensaje='metricas traidas exitosamente',status=status_code)
        except Exception as e:
            print(e)
            return respuesta_error('Error en el servidor: ',status=500)
        
class EstadisticasPacienteView(APIView):
    permission_classes = [IsAuthenticated,IsAdmin]
    def get(self,request):
        try:
            serializer = FiltroPeriodoSerializer(data=request.query_params)

            if not serializer.is_valid():
                return Response({"ok": False,"mensaje": "Filtros inválidos","errores": serializer.errors},status=400)

            anio = serializer.validated_data["anio"]
            mes = serializer.validated_data.get("mes")
            
            data, status_code = obtenerEstadisticasPacientesService(anio=anio,mes=mes)

            if status_code != 200:
                return respuesta_error(
                    "Error al cargar las estadísticas del paciente",
                    status=status_code
                )

            return respuesta_ok(
                data=data,
                mensaje="Estadísticas obtenidas exitosamente",
                status=status_code
            )

        except Exception as e:
            print(e)
            return respuesta_error(
                "Error interno del servidor",
                status=500
            )
