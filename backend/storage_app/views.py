from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from storage_app.models import Archivo
from storage_app.serializers import (
    ArchivoSerializer,
    SubirArchivoSerializer,
)
from storage_app.services import (
    guardar_archivo_usuario,
    generar_url_firmada,
    eliminar_archivo_usuario,
)


class ArchivoListaCrearView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        archivos = Archivo.objects.filter(
            usuario_id=request.user.id,
            activo=True,
        ).order_by("-fecha_subida")

        serializer = ArchivoSerializer(
            archivos,
            many=True,
        )

        return Response(
            {
                "ok": True,
                "archivos": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = SubirArchivoSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        archivo = serializer.validated_data["archivo"]

        categoria = serializer.validated_data.get(
            "categoria",
            "general",
        )

        referencia_id = serializer.validated_data.get(
            "referencia_id"
        )

        try:
            registro = guardar_archivo_usuario(
                archivo=archivo,
                usuario_id=request.user.id,
                categoria=categoria,
                referencia_id=referencia_id,
            )

        except Exception as error:
            return Response(
                {
                    "ok": False,
                    "mensaje": "No se pudo subir el archivo",
                    "detalle": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "ok": True,
                "mensaje": "Archivo subido correctamente",
                "archivo": ArchivoSerializer(
                    registro
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ArchivoDetalleView(APIView):
    permission_classes = [IsAuthenticated]

    def obtener_archivo(self, request, pk):
        try:
            return Archivo.objects.get(
                pk=pk,
                usuario_id=request.user.id,
                activo=True,
            )

        except Archivo.DoesNotExist:
            return None

    def get(self, request, pk):
        archivo = self.obtener_archivo(
            request,
            pk,
        )

        if not archivo:
            return Response(
                {
                    "ok": False,
                    "mensaje": "Archivo no encontrado",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "ok": True,
                "archivo": ArchivoSerializer(
                    archivo
                ).data,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, pk):
        archivo = self.obtener_archivo(
            request,
            pk,
        )

        if not archivo:
            return Response(
                {
                    "ok": False,
                    "mensaje": "Archivo no encontrado",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        eliminado = eliminar_archivo_usuario(
            archivo
        )

        if not eliminado:
            return Response(
                {
                    "ok": False,
                    "mensaje": "No se pudo eliminar el archivo",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "ok": True,
                "mensaje": "Archivo eliminado correctamente",
            },
            status=status.HTTP_200_OK,
        )


class ArchivoUrlView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            archivo = Archivo.objects.get(
                pk=pk,
                usuario_id=request.user.id,
                activo=True,
            )

        except Archivo.DoesNotExist:
            return Response(
                {
                    "ok": False,
                    "mensaje": "Archivo no encontrado",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        url = generar_url_firmada(
            archivo.storage_key,
            expiracion=600,
        )

        if not url:
            return Response(
                {
                    "ok": False,
                    "mensaje": "No se pudo generar la URL",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "ok": True,
                "url": url,
                "expira_en": 600,
            },
            status=status.HTTP_200_OK,
        )