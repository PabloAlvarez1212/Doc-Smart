"use client";

import { motion, useReducedMotion } from "motion/react";
import { Search } from "lucide-react";
import CalendarioCitas from "./CalendarioCitas";
import RollingNumber from "../Motion/RollingNumber";
import styles from "./MisCitas.module.css";

const resorte = { type: "spring", bounce: 0.22, visualDuration: 0.36 };

export default function PanelFiltros({
    idBase,
    dias,
    fecha,
    onFecha,
    estados,
    estado,
    onEstado,
    busqueda,
    onBusqueda,
    placeholder,
    children,
}) {
    const reducido = useReducedMotion();

    return (
        <div className={styles.panel}>
            <section className={styles.bloque} aria-label="Calendario">
                <CalendarioCitas idBase={idBase} dias={dias} seleccion={fecha} onSeleccion={onFecha} />
            </section>

            <section className={styles.bloque} aria-labelledby={`${idBase}-estado-titulo`}>
                <h3 id={`${idBase}-estado-titulo`}>Estado</h3>
                <div className={styles.estados} role="group" aria-label="Filtrar por estado">
                    {estados.map((item) => {
                        const activo = estado === item.valor;
                        return (
                            <button
                                key={item.valor}
                                type="button"
                                className={styles.estado}
                                data-tono={item.tono}
                                aria-pressed={activo}
                                onClick={() => onEstado(item.valor)}
                            >
                                {activo && (
                                    <motion.span
                                        className={styles.estadoActivo}
                                        layoutId={`${idBase}-estado`}
                                        transition={reducido ? { duration: 0 } : resorte}
                                        aria-hidden="true"
                                    />
                                )}
                                <i aria-hidden="true" />
                                <span>{item.etiqueta}</span>
                                {item.conteo != null && <RollingNumber className={styles.estadoConteo} value={item.conteo} />}
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className={styles.bloque} aria-labelledby={`${idBase}-buscar-titulo`}>
                <h3 id={`${idBase}-buscar-titulo`}>Buscar</h3>
                <div className={styles.campos} role="search">
                    <label className={styles.campo}>
                        <Search size={17} aria-hidden="true" />
                        <input
                            type="search"
                            value={busqueda}
                            placeholder={placeholder}
                            aria-label={placeholder}
                            onChange={(event) => onBusqueda(event.target.value)}
                        />
                    </label>
                    {children}
                </div>
            </section>
        </div>
    );
}
