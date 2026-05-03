from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from medicos.services import (
    listarMedicosService,
    obtenerMedicoService,
    crearMedicoService,
    actualizarMedicoService,
    eliminarMedicoService,
    listarEspecialidadesService,
)

class MedicoListView(APIView):
    # GET → listar todos los médicos
    def get(self, request):
        try:
            resultado, status_code = listarMedicosService()
            return Response(resultado, status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return Response({'error': 'Error interno del servidor'}, status=500)

    # POST → crear médico
    def post(self, request):
        try:
            resultado, status_code = crearMedicoService(request.data)
            if status_code != 201:
                return Response({'error': resultado}, status=status_code)
            return Response(resultado, status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return Response({'error': 'Error interno del servidor'}, status=500)


class MedicoDetailView(APIView):
    # GET → obtener un médico por ID
    def get(self, request, id_medico):
        try:
            resultado, status_code = obtenerMedicoService(id_medico)
            if status_code != 200:
                return Response({'error': resultado}, status=status_code)
            return Response(resultado, status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return Response({'error': 'Error interno del servidor'}, status=500)

    # PUT → actualizar médico
    def put(self, request, id_medico):
        try:
            resultado, status_code = actualizarMedicoService(id_medico, request.data)
            if status_code != 200:
                return Response({'error': resultado}, status=status_code)
            return Response(resultado, status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return Response({'error': 'Error interno del servidor'}, status=500)

    # DELETE → eliminar médico
    def delete(self, request, id_medico):
        try:
            resultado, status_code = eliminarMedicoService(id_medico)
            if status_code != 200:
                return Response({'error': resultado}, status=status_code)
            return Response({'mensaje': resultado}, status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return Response({'error': 'Error interno del servidor'}, status=500)


class EspecialidadListView(APIView):
    # GET → listar todas las especialidades
    def get(self, request):
        try:
            resultado, status_code = listarEspecialidadesService()
            return Response(resultado, status=status_code)
        except Exception as e:
            print(f'Error: {e}')
            return Response({'error': 'Error interno del servidor'}, status=500)
# Create your views here.
