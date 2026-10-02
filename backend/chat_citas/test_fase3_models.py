from uuid import uuid4
from django.apps import apps
from django.db import IntegrityError, transaction
from django.utils import timezone
from .tests import ChatFixture
from .models import Conversacion


class MensajeModelTests(ChatFixture):
    def setUp(self):
        self.conv = Conversacion.objects.create(cita=self.cita)

    def mensaje(self, **overrides):
        model = apps.all_models['chat_citas'].get('mensaje')
        self.assertIsNotNone(model, 'Falta persistencia Mensaje')
        data = dict(conversacion=self.conv, tipo='paciente', contenido='hola',
                    emisor_usuario=self.patients[0], client_message_id=uuid4())
        data.update(overrides)
        return model.objects.create(**data)

    def test_emisor_y_uuid_constraints(self):
        for values in ({'emisor_usuario': None}, {'emisor_medico': self.doctors[1]},
                       {'client_message_id': None}, {'tipo': 'sistema'},
                       {'tipo': 'nota_previa'}, {'cupo_nota': 1}):
            with self.subTest(values=values):
                with self.assertRaises(IntegrityError), transaction.atomic():
                    self.mensaje(**values)

    def test_uuid_por_actor_y_conversacion(self):
        uid = uuid4()
        m = self.mensaje(client_message_id=uid)
        self.assertTrue(timezone.is_aware(m.fecha_creacion))
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.mensaje(client_message_id=uid)
        self.mensaje(tipo='medico', emisor_usuario=None, emisor_medico=self.doctors[1],
                     client_message_id=uid)
        from citas.models import Cita
        other = Cita.objects.create(id_usuario=self.patients[0], id_medico=self.doctors[1],
            id_estado=self.states['confirmada'], fecha_programada=self.now)
        other_conv = Conversacion.objects.create(cita=other)
        self.mensaje(conversacion=other_conv, client_message_id=uid)

    def test_nota_unica_y_varios_normales(self):
        self.mensaje(tipo='nota_previa', cupo_nota=1)
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.mensaje(tipo='nota_previa', cupo_nota=1)
        self.mensaje()
        self.mensaje()

    def test_sistema_sin_emisor_y_clave_unica(self):
        values = dict(tipo='sistema', emisor_usuario=None, client_message_id=None,
                      clave_evento='cancelada:1', metadata={'evento': 'cancelada'})
        self.mensaje(**values)
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.mensaje(**values)

    def test_cursores_y_archivo_protegidos(self):
        from django.db.models.deletion import ProtectedError
        m = self.mensaje()
        self.conv.ultimo_leido_paciente = m
        self.conv.save()
        with self.assertRaises(ProtectedError):
            m.delete()
        model = apps.all_models['chat_citas'].get('adjuntoconversacion')
        self.assertIsNotNone(model, 'Falta relación de adjuntos')
        from storage_app.models import Archivo
        archivo = Archivo.objects.first()
        model.objects.create(conversacion=self.conv, archivo=archivo, mensaje=m)
        with self.assertRaises(ProtectedError):
            archivo.delete()
