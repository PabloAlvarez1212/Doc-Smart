"""Public counts contain no identifiers or clinical details; session is private."""
import logging
from django.utils import timezone
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from users.models import Usuario
from medicos.models import Medico
from citas.models import Cita
from utils import filtrarMedicosAprobados

logger = logging.getLogger(__name__)

class PublicMetricsThrottle(AnonRateThrottle):
    rate = '60/min'

class PublicMetricsView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [PublicMetricsThrottle]

    def get(self, request):
        try:
            approved = filtrarMedicosAprobados(Medico.objects.all())
            data = {
                'pacientes_registrados': Usuario.objects.filter(id_rol__nombre__iexact='paciente').count(),
                'medicos_aprobados': approved.count(),
                'citas_registradas': Cita.objects.count(),
                'actualizado_en': timezone.now().isoformat(),
            }
            return Response({'ok': True, 'data': data}, headers={'Cache-Control': 'public, max-age=60'})
        except Exception:
            logger.exception('Could not load public aggregate metrics')
            return Response({'ok': False, 'mensaje': 'No pudimos cargar las estadísticas.'}, status=503, headers={'Cache-Control': 'no-store'})

class SessionSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = request.user.id_rol.nombre.lower()
        home = {'paciente': '/patient/home', 'admin': '/admin/dashboard'}.get(role)
        if isinstance(request.user, Medico):
            home = '/doctor/home' if request.user.esta_aprobado else '/doctor/validacion'
        return Response({'ok': True, 'data': {'home': home}}, headers={'Cache-Control': 'no-store'})

