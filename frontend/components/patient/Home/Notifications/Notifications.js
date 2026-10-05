import { ArrowRight, Bell, Check, Inbox, RefreshCw } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import Link from "next/link";
import { renderIcono } from "@/app/utils/estadoDise/estadoDiseUtils";
import { formatearFechaRelativa } from "@/app/utils/fechaFormaterUtils";
import { getContentTransition } from "../patientHomeMotion";
import styles from "./Notifications.module.css";

export default function Notifications({ notifications = [], loading = false, error = null, onMarcarLeida, onRetry }) {
    const reduceMotion = useReducedMotion();
    const recentNotifications = Array.isArray(notifications) ? notifications.slice(0, 3) : [];

    return (
        <section className={styles.section} aria-labelledby="recent-notifications-title">
            <div className={styles.header}>
                <div>
                    <h2 id="recent-notifications-title">Últimas notificaciones</h2>
                    <p>Novedades importantes sobre tu atención.</p>
                </div>
                <Link href="/patient/notifications">Ver todas <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>

            {loading ? (
                <div className={styles.loading} role="status" aria-label="Cargando notificaciones"><span /><span /><span /></div>
            ) : error ? (
                <div className={styles.feedback} role="alert">
                    <RefreshCw size={23} aria-hidden="true" />
                    <div><strong>No pudimos cargar las notificaciones</strong><p>Inténtalo nuevamente en unos momentos.</p></div>
                    {onRetry && <button type="button" onClick={onRetry}>Reintentar</button>}
                </div>
            ) : recentNotifications.length ? (
                <m.div className={styles.list} layout={!reduceMotion}>
                    <AnimatePresence initial={false}>
                        {recentNotifications.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onRead={onMarcarLeida}
                                reduceMotion={reduceMotion}
                            />
                        ))}
                    </AnimatePresence>
                </m.div>
            ) : (
                <div className={styles.feedback}>
                    <Inbox size={24} aria-hidden="true" />
                    <div><strong>Todo está al día</strong><p>No tienes notificaciones recientes para revisar.</p></div>
                </div>
            )}
        </section>
    );
}

function NotificationItem({ notification, onRead, reduceMotion }) {
    const isUnread = !notification.leida;

    return (
        <m.article
            className={`${styles.item} ${isUnread ? styles.itemUnread : ""}`}
            layout={!reduceMotion}
            {...getContentTransition(reduceMotion)}
        >
            <span className={styles.itemIcon} aria-hidden="true">
                {renderIcono(notification.tipo, 20) || <Bell size={20} />}
            </span>
            <span className={styles.itemCopy}>
                <span>{notification.mensaje}</span>
                <small>{formatearFechaRelativa(notification.fecha)}</small>
            </span>
            {isUnread && (
                <button
                    className={styles.readButton}
                    type="button"
                    onClick={() => onRead?.(notification.id)}
                    aria-label={`Marcar como leída: ${notification.mensaje}`}
                >
                    <Check size={15} aria-hidden="true" />
                    <span>Marcar leída</span>
                </button>
            )}
        </m.article>
    );
}
