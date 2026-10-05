from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase
from django.utils import timezone

from chatbot.services.cita_service import CitaService
from chatbot.tools.citas import ReprogramarCitaTool
from chatbot.tools.medicos import BuscarMedicoTool
from unittest.mock import MagicMock


class DisponibilidadCitasTests(SimpleTestCase):
    @patch('chatbot.tools.medicos.MedicoService.buscar_medicos')
    @patch('chatbot.services.cita_service.CitaService.horario_disponible', return_value=False)
    def test_busqueda_filtra_fecha_sin_afirmar_disponibilidad(self, disponible, buscar):
        medico = SimpleNamespace(id=7, nombre='Ana', apellido='Pérez', telefono='',
                                 ciudad=None, id_especialidad=SimpleNamespace(nombre='General'))
        queryset = MagicMock()
        queryset.exists.return_value = True
        queryset.__iter__.return_value = iter([medico])
        buscar.return_value = queryset
        resultado = BuscarMedicoTool().execute(SimpleNamespace(id_usuario=object()), 'Busca Ana',
                                               {'nombre': 'Ana', 'fecha': '2030-10-06 14:00'})
        self.assertIn('No encontré', resultado)
        disponible.assert_called_once()

    def test_fecha_sin_hora_no_inventa_medianoche(self):
        self.assertIsNone(CitaService.normalizar_fecha('2030-10-06'))

    @patch('chatbot.services.cita_service.timezone.localdate')
    def test_manana_en_zona_local(self, hoy):
        hoy.return_value = datetime(2030, 10, 5).date()
        fecha = CitaService.normalizar_fecha('mañana a las 14:30')
        self.assertIsNotNone(fecha)
        self.assertEqual(timezone.localtime(fecha).strftime('%Y-%m-%d %H:%M'), '2030-10-06 14:30')

    @patch('chatbot.tools.citas.CitaService.medico_tiene_cita', return_value=False)
    @patch('chatbot.tools.citas.CitaService.horario_disponible', return_value=False)
    @patch('chatbot.tools.citas.CitaService.obtener_cita_usuario')
    def test_reprogramar_fuera_de_jornada_no_ofrece_confirmacion(self, obtener, disponible, ocupado):
        medico = SimpleNamespace(id=7)
        cita = SimpleNamespace(id=3, id_medico=medico, id_medico_id=7,
                               id_estado=SimpleNamespace(nombre='pendiente'))
        obtener.return_value = cita
        fecha = (timezone.now() + timedelta(days=2)).replace(second=0, microsecond=0)
        resultado = ReprogramarCitaTool().execute(SimpleNamespace(id_usuario=object()), 'reprograma',
                                                {'id_cita': 3, 'fecha': fecha.isoformat()})
        self.assertFalse(resultado['success'])
        self.assertFalse(resultado.get('requires_confirmation', False))
        disponible.assert_called_once_with(medico, fecha, excluir_cita_id=3)
