from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from .services import marcarNotificacionLeidaService,listarNotificacionesService,marcarTodasNotificacionesLeidasService,eliminarNotificacionService,eliminarTodasNotificacionesService
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

class NotificacionesView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            page = request.query_params.get('page')
            page_size = request.query_params.get('page_size', 10)
            resultado, status_code = listarNotificacionesService(
                usuario=request.user,page=page,page_size=page_size
            )

            if status_code != 200:
                return respuesta_error(
                    mensaje=resultado,
                    status=status_code
                )

            return respuesta_ok(
                data=resultado,
                status=status_code
            )

        except Exception as e:
            print(e)

            return respuesta_error(
                mensaje="Error interno del servidor",
                status=500
            )
            
class MarcarNotificacionLeidaView(APIView):

    permission_classes = [IsAuthenticated]

    def patch(self, request, id_notificacion):
        try:

            resultado, status_code = marcarNotificacionLeidaService(
                id_notificacion,
                request.user
            )

            if status_code != 200:
                return respuesta_error(
                    mensaje=resultado,
                    status=status_code
                )

            return respuesta_ok(
                mensaje=resultado,
                status=status_code
            )

        except Exception as e:

            print(e)

            return respuesta_error(
                mensaje="Error interno del servidor",
                status=500
            )

class MarcarTodasNotificacionesLeidasView(APIView):
    permission_classes = [IsAuthenticated]
    def patch(self,request):
        try:
            respuesta, status_code = marcarTodasNotificacionesLeidasService(usuario=request.user)
            if(status_code !=200):
                return respuesta_error(mensaje=respuesta,status=status_code)
            return respuesta_ok(mensaje=respuesta,status=status_code)
        except Exception as e:
            print(e)
            return respuesta_error(mensaje="Error interno en el servidor",status=500)
        
class EliminarNotificacionView(APIView):
    permission_classes = [IsAuthenticated]
    def delete(self,request,id_notificacion):
        try:
            respuesta,status_code = eliminarNotificacionService(usuario=request.user,idNotificacion=id_notificacion)
            if status_code !=200:
                return respuesta_error(mensaje=respuesta,status=status_code)
            return respuesta_ok(mensaje=respuesta,status=status_code)
        except Exception as e:
            print(e)
            return respuesta_error(mensaje="Error interno en el servidor",status=500)
        
class EliminarTodasNotificacionesView(APIView):

    permission_classes = [IsAuthenticated]

    def delete(self, request):
        try:

            respuesta, status_code = eliminarTodasNotificacionesService(
                usuario=request.user
            )

            if status_code != 200:
                return respuesta_error(
                    mensaje=respuesta,
                    status=status_code
                )

            return respuesta_ok(
                mensaje=respuesta,
                status=status_code
            )

        except Exception as e:
            print(e)

            return respuesta_error(
                mensaje="Error interno en el servidor",
                status=500
            )