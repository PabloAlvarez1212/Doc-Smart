"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Bell, Inbox, RefreshCw } from "lucide-react";
import { renderIcono } from "@/app/utils/estadoDise/estadoDiseUtils";
import NotificationContent from "./NotificationContent";
import RollingNumber from "../Motion/RollingNumber";
import styles from "./RecentNotifications.module.css";

const spring = { type: "spring", bounce: 0.25, visualDuration: 0.4 };
const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Tarjeta de notificaciones del inicio, compartida por paciente y médico.
export default function RecentNotifications({
    role,
    titleId,
    title,
    description,
    href,
    notifications = [],
    unread = 0,
    loading = false,
    error = null,
    withTitle = false,
    onRead,
    onRetry,
    children,
}) {
    const reduced = useReducedMotion();
    const [marcando, setMarcando] = useState({});
    const [fallo, setFallo] = useState(null);
    const [aviso, setAviso] = useState("");
    const recientes = Array.isArray(notifications) ? notifications.slice(0, 3) : [];
    const sinLeer = Math.max(0, Number(unread) || 0);

    async function marcarLeida(item) {
        if (marcando[item.id]) return;

        setMarcando((actual) => ({ ...actual, [item.id]: true }));
        setFallo(null);
        setAviso("Marcando notificación como leída.");

        // El check se alcanza a ver completo aunque la respuesta llegue antes.
        const [resultado] = await Promise.all([
            Promise.resolve(onRead?.(item.id)).catch(() => false),
            esperar(reduced ? 0 : 560),
        ]);

        if (resultado === false) {
            setFallo(item.id);
            setAviso("No se pudo marcar como leída. Puedes reintentar.");
        } else {
            setAviso("Notificación marcada como leída.");
        }

        setMarcando((actual) => {
            const siguiente = { ...actual };
            delete siguiente[item.id];
            return siguiente;
        });
    }

    return (
        <section className={`${styles.section} ${role === "doctor" ? styles.doctor : ""}`} aria-labelledby={titleId}>
            <div className={styles.header}>
                <div>
                    <div className={styles.title}>
                        <h2 id={titleId}>{title}</h2>
                        <AnimatePresence initial={false}>
                            {sinLeer > 0 && (
                                <motion.span
                                    className={styles.count}
                                    initial={{ opacity: 0, scale: 0.6 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.6 }}
                                    transition={spring}
                                >
                                    <RollingNumber value={sinLeer} /> sin leer
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                    <p>{description}</p>
                </div>
                <Link className={styles.more} href={href}>Ver todas <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>

            <p className={styles.srOnly} aria-live="polite">{aviso}</p>

            {loading ? (
                <div className={styles.loading} role="status" aria-label="Cargando notificaciones"><span /><span /><span /></div>
            ) : error ? (
                <div className={styles.feedback} role="alert">
                    <span className={styles.feedbackIcon} aria-hidden="true"><RefreshCw size={22} /></span>
                    <div><strong>No pudimos cargar las notificaciones</strong><p>{error}</p></div>
                    {onRetry && <button type="button" onClick={onRetry}>Reintentar</button>}
                </div>
            ) : recientes.length ? (
                <ul className={styles.list}>
                    <AnimatePresence initial={!reduced}>
                        {recientes.map((item, index) => {
                            const enCurso = Boolean(marcando[item.id]);
                            const pendiente = !item.leida && !enCurso;

                            return (
                                <motion.li
                                    key={item.id}
                                    layout={reduced ? false : "position"}
                                    className={`${styles.item} ${pendiente ? styles.unread : ""}`}
                                    initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, x: -16, transition: { duration: 0.18 } }}
                                    transition={{ ...spring, delay: index * 0.07 }}
                                >
                                    <span className={styles.icon} aria-hidden="true">
                                        {renderIcono(item.tipo, 19) || <Bell size={19} />}
                                    </span>

                                    <NotificationContent notification={item} role={role} markRead={onRead} withTitle={withTitle} />

                                    <span className={styles.slot}>
                                        <AnimatePresence initial={false}>
                                            {(!item.leida || enCurso) && (
                                                <motion.button
                                                    key="read"
                                                    type="button"
                                                    className={`${styles.read} ${enCurso ? styles.done : ""} ${fallo === item.id ? styles.shake : ""}`}
                                                    disabled={enCurso}
                                                    title="Marcar como leída"
                                                    aria-label={`Marcar como leída: ${item.mensaje}`}
                                                    onClick={() => marcarLeida(item)}
                                                    initial={{ opacity: 0, scale: 0.6 }}
                                                    animate={{ opacity: 1, scale: enCurso ? 1.12 : 1 }}
                                                    exit={{ opacity: 0, scale: 0.5 }}
                                                    whileHover={enCurso ? undefined : { scale: 1.08 }}
                                                    whileTap={{ scale: 0.88 }}
                                                    transition={spring}
                                                >
                                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                                                </motion.button>
                                            )}
                                        </AnimatePresence>
                                    </span>
                                </motion.li>
                            );
                        })}
                    </AnimatePresence>
                </ul>
            ) : (
                <div className={styles.feedback}>
                    <span className={`${styles.feedbackIcon} ${styles.float}`} aria-hidden="true"><Inbox size={22} /></span>
                    <div><strong>Todo está al día</strong><p>No tienes notificaciones recientes para revisar.</p></div>
                </div>
            )}

            {children}
        </section>
    );
}
