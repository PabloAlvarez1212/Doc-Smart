# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
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
)
# ─── MÉDICOS ──────────────────────────────────────────────────────────────────

class MedicoListView(APIView):

    def get(self, request):

        try:

            resultado, status_code = listarMedicosService()

            return Response(
                resultado,
                status=status_code
            )

        except Exception as e:

            print(f'Error: {e}')

            return Response(
                {'error': 'Error interno del servidor'},
                status=500
            )


    def post(self, request):

        try:

            resultado, status_code = crearMedicoService(
                request.data
            )

            if status_code != 201:

                return Response(
                    {'error': resultado},
                    status=status_code
                )

            return Response(
                resultado,
                status=status_code
            )

        except Exception as e:

            print(f'Error: {e}')

            return Response(
                {'error': 'Error interno del servidor'},
                status=500
            )


class MedicoDetailView(APIView):
    
    def get(self, request, id_medico):

        try:

            resultado, status_code = obtenerMedicoService(
                id_medico
            )

            if status_code != 200:

                return Response(
                    {'error': resultado},
                    status=status_code
                )

            return Response(
                resultado,
                status=status_code
            )

        except Exception as e:

            print(f'Error: {e}')

            return Response(
                {'error': 'Error interno del servidor'},
                status=500
            )


    def put(self, request, id_medico):

        try:

            resultado, status_code = actualizarMedicoService(
                id_medico,
                request.data
            )

            if status_code != 200:

                return Response(
                    {'error': resultado},
                    status=status_code
                )

            return Response(
                resultado,
                status=status_code
            )

        except Exception as e:

            print(f'Error: {e}')

            return Response(
                {'error': 'Error interno del servidor'},
                status=500
            )


    def delete(self, request, id_medico):

        try:

            resultado, status_code = eliminarMedicoService(
                id_medico
            )

            if status_code != 200:

                return Response(
                    {'error': resultado},
                    status=status_code
                )

            return Response(
                {'mensaje': resultado},
                status=status_code
            )

        except Exception as e:

            print(f'Error: {e}')

            return Response(
                {'error': 'Error interno del servidor'},
                status=500
            )


# ─── ESPECIALIDADES ──────────────────────────────────────────────────────────

class EspecialidadListView(APIView):

    def get(self, request):

        try:

            resultado, status_code = listarEspecialidadesService()

            return Response(
                resultado,
                status=status_code
            )

        except Exception as e:

            print(f'Error: {e}')

            return Response(
                {'error': 'Error interno del servidor'},
                status=500
            )


    def post(self, request):

        try:

            resultado, status_code = crearEspecialidadService(
                request.data
            )

            if status_code != 201:

                return Response(
                    {'error': resultado},
                    status=status_code
                )

            return Response(
                resultado,
                status=status_code
            )

        except Exception as e:

            print(f'Error: {e}')

            return Response(
                {'error': 'Error interno del servidor'},
                status=500
            )


class EspecialidadDetailView(APIView):

    def get(self, request, id_especialidad):

        try:

            resultado, status_code = obtenerEspecialidadService(
                id_especialidad
            )

            if status_code != 200:

                return Response(
                    {'error': resultado},
                    status=status_code
                )

            return Response(
                resultado,
                status=status_code
            )

        except Exception as e:

            print(f'Error: {e}')

            return Response(
                {'error': 'Error interno del servidor'},
                status=500
            )


    def put(self, request, id_especialidad):

        try:

            resultado, status_code = editarEspecialidadService(
                id_especialidad,
                request.data
            )

            if status_code != 200:

                return Response(
                    {'error': resultado},
                    status=status_code
                )

            return Response(
                resultado,
                status=status_code
            )

        except Exception as e:

            print(f'Error: {e}')

            return Response(
                {'error': 'Error interno del servidor'},
                status=500
            )


    def delete(self, request, id_especialidad):

        try:

            resultado, status_code = eliminarEspecialidadService(
                id_especialidad
            )

            if status_code != 200:

                return Response(
                    {'error': resultado},
                    status=status_code
                )

            return Response(
                {'mensaje': resultado},
                status=status_code
            )

        except Exception as e:

            print(f'Error: {e}')

            return Response(
                {'error': 'Error interno del servidor'},
                status=500
            )