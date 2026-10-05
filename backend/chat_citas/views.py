from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .exceptions import ChatError
from .queries import listarConversacionesService, detalleConversacionService, listarMensajesService
from .serializers import EnviarMensajeSerializer, MensajeSerializer, LecturaSerializer, AdjuntoSerializer
from .message_services import enviarMensajeConversacionService
from .read_services import marcarLecturaConversacionService
from .attachment_services import cargarAdjuntoConversacionService, obtenerUrlAdjuntoConversacionService
from .services import habilitarConversacionAnticipadamenteService
from .access import cargarConversacionVisible
from dataclasses import asdict


def ok(data, status=200):
    return Response({'ok': True, 'mensaje': None, 'data': data}, status=status)


class ChatView(APIView):
    permission_classes = [IsAuthenticated]

    def handle_exception(self, exc):
        if isinstance(exc, ChatError):
            return Response({'ok': False, 'mensaje': 'Error',
                'errores': {'code': exc.code, 'detalle': exc.detail}}, status=exc.status)
        response = super().handle_exception(exc)
        response.data = {'ok': False, 'mensaje': 'Error',
                         'errores': response.data if isinstance(response.data, dict)
                         else {'detalle': response.data}}
        return response


class ConversacionesView(ChatView):
    def get(self, request):
        return ok(listarConversacionesService(request.user, page=request.query_params.get('page'),
            page_size=request.query_params.get('page_size')))


class ConversacionView(ChatView):
    def get(self, request, pk):
        return ok(detalleConversacionService(pk, request.user))


class MensajesView(ChatView):
    def get(self, request, pk):
        return ok(listarMensajesService(pk, request.user, antes_de=request.query_params.get('antes_de'),
            limit=request.query_params.get('limit')))

    def post(self, request, pk):
        serializer = EnviarMensajeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = enviarMensajeConversacionService(pk, request.user, **serializer.validated_data)
        return ok(MensajeSerializer(result.mensaje).data, 201 if result.created else 200)


class LecturaView(ChatView):
    def put(self, request, pk):
        serializer = LecturaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return ok(asdict(marcarLecturaConversacionService(pk, request.user, **serializer.validated_data)))


class HabilitarView(ChatView):
    def post(self, request, pk):
        if request.data:
            raise ChatError(400, 'invalid_payload', 'Esta acción no admite campos del cliente')
        _, actor = cargarConversacionVisible(pk, request.user)
        result, status = habilitarConversacionAnticipadamenteService(pk, actor, estricto=True)
        if status != 200:
            raise ChatError(status, 'enable_rejected', str(result))
        return ok(detalleConversacionService(pk, actor))


class AdjuntosView(ChatView):
    def post(self, request, pk):
        if set(request.data) != {'archivo'} or len(request.FILES.getlist('archivo')) != 1:
            raise ChatError(400, 'invalid_file', 'Se requiere un único archivo')
        adj = cargarAdjuntoConversacionService(pk, request.user, request.FILES['archivo'])
        return ok(AdjuntoSerializer(adj).data, 201)


class AdjuntoUrlView(ChatView):
    def get(self, request, pk, adjunto_id):
        return ok(obtenerUrlAdjuntoConversacionService(pk, adjunto_id, request.user))
