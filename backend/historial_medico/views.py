import logging

from django.utils.cache import patch_cache_control, patch_vary_headers
from rest_framework.exceptions import APIException
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.paginacion import PaginacionEstandar
from utils import IsMedico, IsPaciente
from historial_medico.services import (
    crearHistorialService,
    listarHistorialesPacienteService,
    listarHistorialesMedicoService,
    obtenerHistorialService,
    editarHistorialService
)
from historial_medico.serializers import (
    CrearHistorialSerializer,
    EditarHistorialSerializer,
    HistorialClinicoSerializer,
)


logger = logging.getLogger(__name__)


# ─── HELPERS ─────────────────────────────────────────────────────────────────

def respuesta_ok(data=None, mensaje=None, status=200):
    return Response({'ok': True, 'mensaje': mensaje, 'data': data}, status=status)

def respuesta_error(mensaje, errores=None, status=400):
    return Response({
        'ok': False,
        'mensaje': 'Error',
        'errores': errores or {'detalle': mensaje}  # ← mensaje siempre en errores
    }, status=status)

def respuesta_serializer_invalido(errors):
    return respuesta_error('Datos inválidos', errores=errors, status=400)


def registrar_error_seguro(operacion, error, request, historial_id=None):
    usuario = getattr(request, 'user', None)
    logger.error(
        'Error interno en historial operacion=%s tipo=%s actor_tipo=%s '
        'actor_id=%s historial_id=%s',
        operacion,
        type(error).__name__,
        type(usuario).__name__ if usuario is not None else 'desconocido',
        getattr(usuario, 'id', None),
        historial_id,
    )


class HistorialSeguroAPIView(APIView):
    """Evita que respuestas clínicas queden almacenadas en cachés intermedias."""

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        patch_cache_control(
            response,
            private=True,
            no_cache=True,
            no_store=True,
            must_revalidate=True,
        )
        patch_vary_headers(response, ('Authorization', 'Cookie'))
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        return response


class HistorialPaginadoMixin:
    pagination_class = PaginacionEstandar

    def paginar(self, request, queryset):
        paginator = self.pagination_class()
        pagina = paginator.paginate_queryset(queryset, request, view=self)
        datos = HistorialClinicoSerializer(pagina, many=True).data
        return paginator.get_paginated_response(datos).data



class HistorialListView(HistorialSeguroAPIView):
    permission_classes = [IsAuthenticated, IsMedico]

    def post(self, request):
        serializer = CrearHistorialSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)

        try:
            resultado, status_code = crearHistorialService(
                serializer.validated_data,
                request.user
            )

            if status_code != 201:
                return respuesta_error(resultado, status=status_code)

            return respuesta_ok(
                data=resultado,
                mensaje='Historial creado correctamente',
                status=201
            )

        except APIException:
            raise
        except Exception as error:
            registrar_error_seguro('crear', error, request)
            return respuesta_error('Error interno del servidor', status=500)


class HistorialPacienteView(HistorialPaginadoMixin, HistorialSeguroAPIView):
    permission_classes = [IsAuthenticated, IsPaciente]

    def get(self, request):
        try:
            resultado, status_code = listarHistorialesPacienteService(
                request.user,
                request.query_params.get('ordering'),
            )

            if status_code != 200:
                return respuesta_error(resultado, status=status_code)

            return respuesta_ok(data=self.paginar(request, resultado))

        except APIException:
            raise
        except Exception as error:
            registrar_error_seguro('listar_paciente', error, request)
            return respuesta_error('Error interno del servidor', status=500)


class HistorialMedicoView(HistorialPaginadoMixin, HistorialSeguroAPIView):
    permission_classes = [IsAuthenticated, IsMedico]

    def get(self, request):
        try:
            resultado, status_code = listarHistorialesMedicoService(
                request.user,
                request.query_params.get('ordering'),
            )

            if status_code != 200:
                return respuesta_error(resultado, status=status_code)

            return respuesta_ok(data=self.paginar(request, resultado))

        except APIException:
            raise
        except Exception as error:
            registrar_error_seguro('listar_medico', error, request)
            return respuesta_error('Error interno del servidor', status=500)


class HistorialDetailView(HistorialSeguroAPIView):
    permission_classes = [
        IsAuthenticated,
        IsPaciente | IsMedico,
    ]

    def get_permissions(self):
        permission_classes = self.permission_classes
        if self.request.method == 'PATCH':
            permission_classes = [IsAuthenticated, IsMedico]
        return [permission() for permission in permission_classes]

    def get(self, request, historial_id):
        try:
            resultado, status_code = obtenerHistorialService(
                historial_id,
                request.user
            )

            if status_code != 200:
                return respuesta_error(resultado, status=status_code)

            return respuesta_ok(data=resultado)

        except APIException:
            raise
        except Exception as error:
            registrar_error_seguro('obtener', error, request, historial_id)
            return respuesta_error('Error interno del servidor', status=500)

    def patch(self, request, historial_id):
        serializer = EditarHistorialSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_serializer_invalido(serializer.errors)

        try:
            resultado, status_code = editarHistorialService(
                historial_id,
                serializer.validated_data,
                request.user
            )

            if status_code != 200:
                return respuesta_error(resultado, status=status_code)

            return respuesta_ok(
                data=resultado,
                mensaje='Historial actualizado correctamente'
            )

        except APIException:
            raise
        except Exception as error:
            registrar_error_seguro('editar', error, request, historial_id)
            return respuesta_error('Error interno del servidor', status=500)

