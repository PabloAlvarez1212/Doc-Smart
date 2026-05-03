from rest_framework.views import APIView
from rest_framework.response import Response
from chatbot.services import (
    crearChatService,
    listarChatsService,
    crearMensajeService,
    listarMensajesService,
    eliminarChatService
)

class ChatListView(APIView):
    # GET → listar chats de un usuario
    def get(self, request, id_usuario):
        try:
            resultado, status_code = listarChatsService(id_usuario)
            return Response(resultado, status=status_code)
        except Exception as e:
            print(f'Error: {e}') 
            return Response({'error': 'Error interno del servidor'}, status=500)

    # POST → crear chat
    def post(self, request, id_usuario):
        try:
            resultado, status_code = crearChatService(id_usuario)
            if status_code != 201:
                return Response({'error': resultado}, status=status_code)
            return Response(resultado, status=status_code)
        except Exception as e:
            print(f'Error: {e}') 
            return Response({'error': 'Error interno del servidor'}, status=500)
        
class ChatDetailView(APIView):
    # DELETE → eliminar chat
    def delete(self, request, id_chat):
        try:
            resultado, status_code = eliminarChatService(id_chat)
            if status_code != 200:
                return Response({'error': resultado}, status=status_code)
            return Response({'mensaje': resultado}, status=status_code)
        except Exception as e:
            return Response({'error': 'Error interno del servidor'}, status=500)

class MensajeListView(APIView):
    # GET → listar mensajes de un chat
    def get(self, request, id_chat):
        try:
            resultado, status_code = listarMensajesService(id_chat)
            if status_code != 200:
                return Response({'error': resultado}, status=status_code)
            return Response(resultado, status=status_code)
        except Exception as e:
            print(f'Error: {e}') 
            return Response({'error': 'Error interno del servidor'}, status=500)

    # POST → crear mensaje
    def post(self, request, id_chat):
        contenido = request.data.get('contenido')
        es_bot = request.data.get('es_bot', False)

        if not contenido:
            return Response({'error': 'El contenido es requerido'}, status=400)

        try:
            resultado, status_code = crearMensajeService(id_chat, contenido, es_bot)
            if status_code != 201:
                return Response({'error': resultado}, status=status_code)
            return Response(resultado, status=status_code)
        except Exception as e:
            print(f'Error: {e}') 
            return Response({'error': 'Error interno del servidor'}, status=500)
