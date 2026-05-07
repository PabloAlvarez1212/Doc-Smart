from rest_framework.views import APIView
from rest_framework.response import Response
from chatbot.services import (
    crearChatService,
    listarChatsService,
    crearMensajeService,
    listarMensajesService,
    eliminarChatService
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
        'mensaje': mensaje,
        'errores': errores or {}
    }, status=status)

def respuesta_serializer_invalido(errors):
    return respuesta_error('Datos inválidos', errores=errors, status=400)

class ChatListView(APIView):
    def get(self, request):
        try:
            usuario_id = request.user.id  # ← del token
            resultado, status_code = listarChatsService(usuario_id)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error('Error interno del servidor', status=500)

    def post(self, request):
        try:
            usuario_id = request.user.id  # ← del token
            resultado, status_code = crearChatService(usuario_id)
            if status_code != 201:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado, mensaje='Chat creado correctamente', status=201)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error('Error interno del servidor', status=500)

class ChatDetailView(APIView):
    def delete(self, request, id_chat):
        try:
            resultado, status_code = eliminarChatService(id_chat)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(mensaje=resultado)
        except Exception as e:
            return respuesta_error('Error interno del servidor', status=500)

class MensajeListView(APIView):
    def get(self, request, id_chat):
        try:
            resultado, status_code = listarMensajesService(id_chat)
            if status_code != 200:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error('Error interno del servidor', status=500)

    def post(self, request, id_chat):
        contenido = request.data.get('contenido')
        es_bot    = request.data.get('es_bot', False)

        if not contenido:
            return respuesta_error('El contenido es requerido', status=400)

        try:
            resultado, status_code = crearMensajeService(id_chat, contenido, es_bot)
            if status_code != 201:
                return respuesta_error(resultado, status=status_code)
            return respuesta_ok(data=resultado, mensaje='Mensaje creado correctamente', status=201)
        except Exception as e:
            print(f'Error: {e}')
            return respuesta_error('Error interno del servidor', status=500)