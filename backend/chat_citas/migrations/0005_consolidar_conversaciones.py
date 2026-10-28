from django.db import migrations


def consolidar(apps, schema_editor):
    alias = schema_editor.connection.alias
    Conversacion = apps.get_model('chat_citas', 'Conversacion')
    Mensaje = apps.get_model('chat_citas', 'Mensaje')
    Adjunto = apps.get_model('chat_citas', 'AdjuntoConversacion')
    Cita = apps.get_model('citas', 'Cita')
    Notificacion = apps.get_model('notificaciones', 'Notificacion')
    parejas = {}
    for conv in Conversacion.objects.using(alias).select_related('cita').order_by('pk').iterator():
        pareja = conv.cita.id_medico_id, conv.cita.id_usuario_id
        principal = parejas.setdefault(pareja, conv.pk)
        Cita.objects.using(alias).filter(pk=conv.cita_id).update(
            conversacion_chat_id=principal,
            fecha_chat_habilitacion=conv.fecha_habilitacion_anticipada,
            fecha_chat_cierre=conv.fecha_cierre,
        )
        # Sembrar las lecturas por origen ANTES de mezclar historiales.
        mensajes = Mensaje.objects.using(alias).filter(conversacion_id=conv.pk)
        mensajes.update(origen_id=conv.pk, cita_id=conv.cita_id)
        mensajes.filter(pk__lte=conv.ultimo_leido_paciente_id or 0).update(leido_paciente=True)
        mensajes.filter(pk__lte=conv.ultimo_leido_medico_id or 0).update(leido_medico=True)
        mensajes.filter(emisor_usuario__isnull=False).update(leido_paciente=True)
        mensajes.filter(emisor_medico__isnull=False).update(leido_medico=True)
        if principal == conv.pk:
            Conversacion.objects.using(alias).filter(pk=conv.pk).update(medico_id=pareja[0], paciente_id=pareja[1])
        else:
            mensajes.update(conversacion_id=principal)
            Adjunto.objects.using(alias).filter(conversacion_id=conv.pk).update(conversacion_id=principal)
            Notificacion.objects.using(alias).filter(conversacion_id=conv.pk).update(conversacion_id=principal)
            Conversacion.objects.using(alias).filter(pk=conv.pk).update(canonica_id=principal)


class Migration(migrations.Migration):
    atomic = True
    dependencies = [
        ('chat_citas', '0004_estadoparticipante_remove_mensaje_chat_uuid_usuario_and_more'),
        ('citas', '0018_cita_conversacion_chat_cita_fecha_chat_cierre_and_more'),
        ('notificaciones', '0003_notificacion_cita_notificacion_historial'),
    ]
    # Sin reversión ficticia: después de nuevas escrituras no puede repartirse
    # automáticamente el historial entre las conversaciones antiguas.
    operations = [migrations.RunPython(consolidar)]
