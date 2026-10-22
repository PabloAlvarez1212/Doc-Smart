import asyncio
from datetime import timedelta
from unittest.mock import patch

from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from django.test import TransactionTestCase, override_settings

from . import presence
from .models import ConexionPresencia, Conversacion
from .test_fase3_websocket import WebsocketTests


@override_settings(CHANNEL_LAYERS={'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}})
class PresenceTests(TransactionTestCase):
    setUp = WebsocketTests.setUp
    socket = WebsocketTests.socket

    async def snapshot(self, socket, kind, pk, online):
        async with asyncio.timeout(1):
            event = await socket.receive_json_from()
            while event['event'] == 'chat.presence.ping':
                await socket.send_json_to({'event': 'chat.presence.heartbeat', 'data': {}})
                event = await socket.receive_json_from()
        self.assertEqual(event, {'event': 'chat.presence', 'data': {
            'actor': {'tipo': kind, 'id': pk}, 'online': online}})

    def test_distinct_sessions_multitab_disconnect_and_reconnect(self):
        async def run():
            patient = self.socket(self.patient)
            doctor = self.socket(self.doctor)
            tab = self.socket(self.doctor)
            self.assertTrue((await patient.connect())[0])
            await self.snapshot(patient, 'medico', self.doctor.pk, False)
            self.assertTrue((await doctor.connect())[0])
            await self.snapshot(doctor, 'paciente', self.patient.pk, True)
            await self.snapshot(patient, 'medico', self.doctor.pk, True)
            self.assertTrue((await tab.connect())[0])
            await self.snapshot(tab, 'paciente', self.patient.pk, True)
            await doctor.disconnect()
            self.assertTrue(await patient.receive_nothing(timeout=0.1))
            await tab.disconnect()
            await self.snapshot(patient, 'medico', self.doctor.pk, False)
            replacement = self.socket(self.doctor)
            await replacement.connect()
            await self.snapshot(replacement, 'paciente', self.patient.pk, True)
            await self.snapshot(patient, 'medico', self.doctor.pk, True)
            await replacement.disconnect()
            await patient.disconnect()
        async_to_sync(run)()
        self.assertEqual(ConexionPresencia.objects.count(), 0)

    def test_expired_leases_are_offline_and_pruned(self):
        ConexionPresencia.objects.create(canal='lost-worker', tipo='medico', actor_id=self.doctor.pk,
            vence=self.now - timedelta(seconds=1))
        # A different role with the same PK must never mark the doctor online.
        ConexionPresencia.objects.create(canal='other-role', tipo='paciente', actor_id=self.doctor.pk,
            vence=self.now + timedelta(seconds=60))
        async def run():
            patient = self.socket(self.patient)
            await patient.connect()
            await self.snapshot(patient, 'medico', self.doctor.pk, False)
            self.assertFalse(await database_sync_to_async(ConexionPresencia.objects.filter(canal='lost-worker').exists)())
            await patient.disconnect()
        async_to_sync(run)()

    def test_poll_detects_worker_loss_without_broadcast(self):
        async def run():
            patient = self.socket(self.patient)
            await patient.connect()
            await self.snapshot(patient, 'medico', self.doctor.pk, False)
            await database_sync_to_async(ConexionPresencia.objects.create)(canal='lost-worker', tipo='medico',
                actor_id=self.doctor.pk, vence=self.now + timedelta(seconds=60))
            await self.snapshot(patient, 'medico', self.doctor.pk, True)
            await database_sync_to_async(ConexionPresencia.objects.filter(canal='lost-worker').update)(
                vence=self.now - timedelta(seconds=1))
            await self.snapshot(patient, 'medico', self.doctor.pk, False)
            await patient.disconnect()
        with patch.object(presence, 'POLL_SECONDS', 0.05):
            async_to_sync(run)()

    def test_unauthorized_socket_has_no_presence_or_lease(self):
        async def run():
            stranger = self.socket(self.patients[1])
            self.assertEqual(await stranger.connect(), (False, 4403))
            await stranger.disconnect()
        async_to_sync(run)()
        self.assertFalse(ConexionPresencia.objects.exists())

    def test_visible_closed_history_has_presence(self):
        Conversacion.objects.filter(pk=self.conv.pk).update(fecha_cierre=self.now)
        async def run():
            socket = self.socket(self.patient)
            self.assertTrue((await socket.connect())[0])
            await self.snapshot(socket, 'medico', self.doctor.pk, False)
            await socket.disconnect()
        async_to_sync(run)()

    def test_heartbeat_renews_own_lease_and_unanswered_ping_expires(self):
        async def run():
            patient = self.socket(self.patient)
            await patient.connect()
            await self.snapshot(patient, 'medico', self.doctor.pk, False)
            await database_sync_to_async(ConexionPresencia.objects.filter(tipo='paciente', actor_id=self.patient.pk).update)(
                vence=self.now + timedelta(seconds=1))
            await patient.send_json_to({'event': 'chat.presence.heartbeat', 'data': {}})
            # A queued application event acts as an ordering barrier for heartbeat handling.
            await patient.send_json_to({'event': 'invalid', 'data': {}})
            while (await patient.receive_json_from())['event'] != 'chat.error':
                pass
            lease = await database_sync_to_async(ConexionPresencia.objects.get)(tipo='paciente', actor_id=self.patient.pk)
            self.assertEqual(lease.vence, self.now + timedelta(seconds=60))
            await database_sync_to_async(ConexionPresencia.objects.filter(canal=lease.canal).update)(
                vence=self.now - timedelta(seconds=1))
            output = await patient.receive_output(timeout=1)
            while output['type'] == 'websocket.send':
                output = await patient.receive_output(timeout=1)
            self.assertEqual(output, {'type': 'websocket.close', 'code': 4408})
            await patient.disconnect()
        with patch.object(presence, 'POLL_SECONDS', 0.1):
            async_to_sync(run)()
