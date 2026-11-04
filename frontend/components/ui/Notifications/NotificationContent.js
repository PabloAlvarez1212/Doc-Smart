'use client';
import useNotificationNavigation from './useNotificationNavigation';
import { formatearFechaRelativa } from '@/app/utils/fechaFormaterUtils';
import styles from './RecentNotifications.module.css';

export default function NotificationContent({notification,role,markRead,withTitle=true}) {
    const navigation = useNotificationNavigation(notification,role,markRead);
    const Content = navigation.canNavigate ? 'button' : 'div';
    return (
        <Content className={`${styles.copy} ${navigation.canNavigate ? styles.open : ''}`} onClick={navigation.canNavigate ? navigation.open : undefined} type={navigation.canNavigate ? 'button' : undefined} disabled={navigation.canNavigate ? navigation.opening : undefined} aria-busy={navigation.opening} aria-label={navigation.canNavigate ? `Abrir notificación: ${notification.titulo || notification.mensaje}` : undefined}>
            {withTitle && notification.titulo && <strong>{notification.titulo}</strong>}<span>{notification.mensaje}</span><small>{formatearFechaRelativa(notification.fecha)}</small>
        </Content>
    );
}
