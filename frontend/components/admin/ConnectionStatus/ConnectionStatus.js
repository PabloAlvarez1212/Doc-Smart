"use client";

import { useNotificationsContext } from "../../contex/NotificationsContext";
import styles from "./ConnectionStatus.module.css";

const ESTADOS = {
    conectado: { texto: "En vivo", clase: styles.connected },
    reconectando: { texto: "Reconectando…", clase: styles.reconnecting },
    desconectado: { texto: "Sin conexión", clase: styles.disconnected },
};

function formatearHora(marca) {
    return new Date(marca).toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

export default function ConnectionStatus() {
    const { estadoConexion, ultimaActualizacion } = useNotificationsContext();
    const estado = ESTADOS[estadoConexion] ?? ESTADOS.desconectado;

    return (
        <div className={styles.status}>
            <span role="status" aria-live="polite" className={`${styles.state} ${estado.clase}`}>
                <span className={styles.dot} aria-hidden="true" />
                {estado.texto}
            </span>
            {ultimaActualizacion && (
                <span className={styles.updated}>Actualizado {formatearHora(ultimaActualizacion)}</span>
            )}
        </div>
    );
}
