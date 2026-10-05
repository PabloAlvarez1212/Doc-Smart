"use client";

import {
    Bell,
    CalendarCheck,
    CalendarClock,
    CalendarX,
    Check,
    CheckCheck,
    FileText,
    Inbox,
    MessageCircle,
    RefreshCw,
    Trash2,
} from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { useState } from "react";
import { filtrarNotificacionesPorFecha } from "@/app/utils/notificacionesUtils";
import { formatearFechaRelativa } from "@/app/utils/fechaFormaterUtils";
import Pagination from "../Pagination/Pagination";
import { getNotificationPresentation, getNotificationReadState } from "./notificationPresentation";
import styles from "./NotificationCenter.module.css";

const ICONS = {
    "calendar-check": CalendarCheck,
    "calendar-clock": CalendarClock,
    "calendar-x": CalendarX,
    message: MessageCircle,
    file: FileText,
    bell: Bell,
};

export default function NotificationCenter({
    notifications = [],
    unreadCount = 0,
    totalRecords = 0,
    loading = false,
    error = null,
    pagination,
    actions,
    compactTop = false,
}) {
    const reduceMotion = useReducedMotion();
    const [dateFilter, setDateFilter] = useState("todas");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const filteredNotifications = filtrarNotificacionesPorFecha(
        notifications,
        dateFilter,
        dateFrom,
        dateTo
    );
    const hasDateFilter = dateFilter !== "todas";

    return (
        <main className={`${styles.page} ${compactTop ? styles.compactTop : ""}`}>
            <header className={styles.header}>
                <div className={styles.heading}>
                    <h1>Notificaciones</h1>
                    <p>
                        {loading && !notifications.length
                            ? "Consultando tus notificaciones"
                            : unreadCount > 0
                            ? `${unreadCount} ${unreadCount === 1 ? "notificación nueva" : "notificaciones nuevas"} de ${totalRecords}`
                            : `${totalRecords} ${totalRecords === 1 ? "notificación" : "notificaciones"}. Todo está al día.`}
                    </p>
                </div>

                <div className={styles.globalActions}>
                    <button
                        type="button"
                        className={styles.readAllButton}
                        onClick={actions?.markAllRead}
                        disabled={unreadCount === 0}
                    >
                        <CheckCheck size={17} aria-hidden="true" />
                        Marcar todas como leídas
                    </button>
                    <button
                        type="button"
                        className={styles.deleteAllButton}
                        onClick={actions?.deleteAll}
                        disabled={!notifications.length}
                    >
                        <Trash2 size={16} aria-hidden="true" />
                        Eliminar todas
                    </button>
                </div>
            </header>

            <section className={styles.inbox} aria-labelledby="notifications-list-title" aria-busy={loading}>
                <div className={styles.toolbar}>
                    <div>
                        <h2 id="notifications-list-title">Actividad</h2>
                        <span aria-live="polite">
                            {loading && notifications.length ? "Actualizando notificaciones" : "Ordenadas de la más reciente a la más antigua"}
                        </span>
                    </div>
                    <label className={styles.filter}>
                        <span>Periodo</span>
                        <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                            <option value="todas">Todas</option>
                            <option value="hoy">Hoy</option>
                            <option value="7dias">Últimos 7 días</option>
                            <option value="30dias">Últimos 30 días</option>
                            <option value="rango">Rango personalizado</option>
                        </select>
                    </label>
                </div>

                {dateFilter === "rango" && (
                    <div className={styles.dateRange}>
                        <label>
                            <span>Desde</span>
                            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
                        </label>
                        <label>
                            <span>Hasta</span>
                            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
                        </label>
                    </div>
                )}

                {error ? (
                    <FeedbackState
                        icon={RefreshCw}
                        title="No pudimos cargar tus notificaciones"
                        description="Revisa tu conexión e inténtalo nuevamente."
                        actionLabel="Reintentar"
                        onAction={actions?.retry}
                        role="alert"
                    />
                ) : loading && !notifications.length ? (
                    <NotificationSkeleton />
                ) : filteredNotifications.length ? (
                    <div className={styles.list} role="list">
                        {filteredNotifications.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                markRead={actions?.markRead}
                                deleteNotification={actions?.deleteOne}
                                reduceMotion={reduceMotion}
                            />
                        ))}
                    </div>
                ) : (
                    <FeedbackState
                        icon={Inbox}
                        title={hasDateFilter ? "No hay coincidencias en esta página" : "Todo está al día"}
                        description={hasDateFilter
                            ? "Cambia el periodo o revisa otra página para consultar más notificaciones."
                            : "Las novedades importantes de DocSmart aparecerán aquí."}
                    />
                )}
            </section>

            {!error && notifications.length > 0 && (
                <Pagination
                    paginaActual={pagination?.currentPage ?? 1}
                    totalPaginas={pagination?.totalPages ?? 1}
                    totalRegistros={totalRecords}
                    onCambiarPagina={pagination?.onChange}
                    cargando={loading}
                    variant="appointments"
                />
            )}
        </main>
    );
}

function NotificationItem({ notification, markRead, deleteNotification, reduceMotion }) {
    const presentation = getNotificationPresentation(notification.tipo);
    const state = getNotificationReadState(notification.leida);
    const Icon = ICONS[presentation.icon] || Bell;

    return (
        <m.article
            className={`${styles.item} ${styles[state.key]}`}
            role="listitem"
            initial={reduceMotion ? false : { opacity: 1, transform: "translateY(-4px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{ duration: reduceMotion ? 0 : .16, ease: [0.23, 1, 0.32, 1] }}
        >
            <span className={`${styles.itemIcon} ${styles[presentation.tone]}`} aria-hidden="true">
                <Icon size={20} />
            </span>

            <div className={styles.content}>
                <div className={styles.titleRow}>
                    <h3>{notification.titulo || "Actualización de DocSmart"}</h3>
                    <span className={styles.readState}>{state.label}</span>
                </div>
                <p>{notification.mensaje}</p>
                <time dateTime={notification.fecha}>{formatearFechaRelativa(notification.fecha)}</time>
            </div>

            <div className={styles.itemActions}>
                {!notification.leida && (
                    <button type="button" className={styles.markReadButton} onClick={() => markRead?.(notification.id)}>
                        <Check size={15} aria-hidden="true" /> Marcar leída
                    </button>
                )}
                <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => deleteNotification?.(notification.id)}
                    aria-label={`Eliminar notificación: ${notification.titulo || notification.mensaje}`}
                >
                    <Trash2 size={16} aria-hidden="true" />
                    <span>Eliminar</span>
                </button>
            </div>
        </m.article>
    );
}

function NotificationSkeleton() {
    return (
        <div className={styles.skeleton} role="status" aria-label="Cargando notificaciones">
            {[0, 1, 2, 3].map((item) => <span key={item} />)}
        </div>
    );
}

function FeedbackState({ icon: Icon, title, description, actionLabel, onAction, role }) {
    return (
        <div className={styles.feedback} role={role}>
            <span aria-hidden="true"><Icon size={23} /></span>
            <div>
                <h3>{title}</h3>
                <p>{description}</p>
            </div>
            {actionLabel && onAction && <button type="button" onClick={onAction}>{actionLabel}</button>}
        </div>
    );
}
