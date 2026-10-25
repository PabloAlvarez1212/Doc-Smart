'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { resolverDestinoNotificacionService } from '@/app/services/notificationsServices';
import { notificationDestination } from './notificationDestination.mjs';
import Swal from 'sweetalert2';
import styles from './NotificationNotice.module.css';
import { chatNotificationNotice, isChatNotification } from './chatNotificationNotice.mjs';

export default function useNotificationNavigation(notification, role, markRead) {
    const router = useRouter();
    const pending = useRef(false);
    const controller = useRef(null);
    const [opening,setOpening] = useState(false);
    const canNavigate = isChatNotification(notification);
    useEffect(() => {
        pending.current = false; setOpening(false);
        return () => controller.current?.abort();
    }, [notification?.id,role]);
    async function open() {
        if (!canNavigate || pending.current) return;
        pending.current = true; setOpening(true);
        const request = new AbortController();
        controller.current = request;
        try {
            const id = notification?.id;
            if (!Number.isSafeInteger(Number(id)) || Number(id) < 1) throw new Error('La notificación no es válida.');
            const response = await resolverDestinoNotificacionService(Number(id),request.signal);
            if (request.signal.aborted) return;
            if (response.data?.tipo !== 'conversacion') throw new Error('Destino de chat no válido.');
            const route = notificationDestination(response.data,role);
            if (!notification.leida && markRead) {
                const read = await markRead(notification.id);
                if (read === false) throw new Error('No pudimos marcar la notificación como leída. Inténtalo nuevamente.');
            }
            if (!request.signal.aborted) router.push(route);
        } catch (e) {
            if (request.signal.aborted) return;
            const notice = chatNotificationNotice(e);
            Swal.fire({toast:true,position:'bottom-end',icon:'info',title:notice.title,text:notice.text,
                showConfirmButton:false,showCloseButton:true,closeButtonAriaLabel:'Cerrar aviso',timer:6500,timerProgressBar:true,
                background:'var(--surface)',color:'var(--color-text)',customClass:{popup:styles.notice}});
        } finally {
            if (controller.current === request) {
                pending.current = false;
                if (!request.signal.aborted) setOpening(false);
            }
        }
    }
    return {open,opening,canNavigate};
}
