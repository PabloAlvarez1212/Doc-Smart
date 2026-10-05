from datetime import timedelta
from unittest.mock import patch
from importlib import import_module, util
from .tests import ChatFixture
from .models import Conversacion


class Fase3Fixture(ChatFixture):
    def setUp(self):
        self.clock = patch('django.utils.timezone.now', return_value=self.now)
        self.clock.start()
        self.addCleanup(self.clock.stop)
        self.cita.fecha_programada = self.now + timedelta(hours=1)
        self.cita.save()
        self.conv = Conversacion.objects.create(cita=self.cita)
        self.patient, self.doctor = self.patients[0], self.doctors[1]

    def api(self, module, name):
        self.assertIsNotNone(util.find_spec('chat_citas.' + module), 'Falta módulo ' + module)
        mod = import_module('chat_citas.' + module)
        self.assertTrue(hasattr(mod, name), 'Falta ' + name)
        return getattr(mod, name)
