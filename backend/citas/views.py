from rest_framework.views import APIView
from rest_framework.response import Response
from citas.services import (
    listarCitasService,
    obtenerCitaService,
    crearCitaService,
    editarCitaService,
    eliminarCitaService,
    listarRecordatoriosService,
    crearRecordatorioService,
    eliminarRecordatorioService
)

# =========================
# 🔹 CITAS
# =========================

class CitaListView(APIView):

    def get(self, request):
        try:
            resultado, status_code = listarCitasService()
            return Response(resultado, status=status_code)
        except Exception as e:
            print(e)
            return Response({'error': 'Error interno del servidor'}, status=500)

    def post(self, request):
        try:
            resultado, status_code = crearCitaService(request.data)

            if status_code != 201:
                return Response({'error': resultado}, status=status_code)

            return Response(resultado, status=status_code)

        except Exception as e:
            print(e)
            return Response({'error': 'Error interno del servidor'}, status=500)


class CitaDetailView(APIView):

    def get(self, request, pk):
        try:
            resultado, status_code = obtenerCitaService(pk)

            if status_code != 200:
                return Response({'error': resultado}, status=status_code)

            return Response(resultado, status=status_code)

        except Exception as e:
            print(e)
            return Response({'error': 'Error interno del servidor'}, status=500)


    def put(self, request, pk):
        try:
            resultado, status_code = editarCitaService(pk, request.data)

            if status_code != 200:
                return Response({'error': resultado}, status=status_code)

            return Response(resultado, status=status_code)

        except Exception as e:
            print(e)
            return Response({'error': 'Error interno del servidor'}, status=500)


    def delete(self, request, pk):
        try:
            resultado, status_code = eliminarCitaService(pk)

            if status_code != 200:
                return Response({'error': resultado}, status=status_code)

            return Response({'mensaje': resultado}, status=status_code)

        except Exception as e:
            print(e)
            return Response({'error': 'Error interno del servidor'}, status=500)


# =========================
# 🔹 RECORDATORIOS
# =========================

class RecordatorioListView(APIView):

    def get(self, request):
        try:
            resultado, status_code = listarRecordatoriosService()
            return Response(resultado, status=status_code)
        except Exception as e:
            print(e)
            return Response({'error': 'Error interno del servidor'}, status=500)

    def post(self, request):
        try:
            resultado, status_code = crearRecordatorioService(request.data)

            if status_code != 201:
                return Response({'error': resultado}, status=status_code)

            return Response(resultado, status=status_code)

        except Exception as e:
            print(e)
            return Response({'error': 'Error interno del servidor'}, status=500)


class RecordatorioDetailView(APIView):

    def delete(self, request, pk):
        try:
            resultado, status_code = eliminarRecordatorioService(pk)

            if status_code != 200:
                return Response({'error': resultado}, status=status_code)

            return Response({'mensaje': resultado}, status=status_code)

        except Exception as e:
            print(e)
            return Response({'error': 'Error interno del servidor'}, status=500)