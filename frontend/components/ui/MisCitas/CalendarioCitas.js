"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { claveDia } from "./citaFormato";
import styles from "./MisCitas.module.css";

const SEMANA = ["lu", "ma", "mi", "ju", "vi", "sá", "do"];
const nombreMes = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" });
const nombreDia = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", timeZone: "UTC" });
const resorte = { type: "spring", bounce: 0.25, visualDuration: 0.34 };

const variantes = {
    entra: (direccion) => ({ opacity: 0, x: direccion * 28 }),
    quieto: { opacity: 1, x: 0 },
    sale: (direccion) => ({ opacity: 0, x: direccion * -28 }),
};

export default function CalendarioCitas({ dias, seleccion = "", onSeleccion, idBase }) {
    const reducido = useReducedMotion();
    const hoy = claveDia(Date.now());
    const [mes, setMes] = useState({ valor: (seleccion || hoy).slice(0, 7), direccion: 0 });
    const [anio, numero] = mes.valor.split("-").map(Number);
    const primero = new Date(Date.UTC(anio, numero - 1, 1));
    const total = new Date(Date.UTC(anio, numero, 0)).getUTCDate();
    const desfase = (primero.getUTCDay() + 6) % 7;

    const mover = (paso) => {
        const destino = paso === 0 ? hoy.slice(0, 7) : new Date(Date.UTC(anio, numero - 1 + paso, 1)).toISOString().slice(0, 7);
        setMes({ valor: destino, direccion: paso || (destino > mes.valor ? 1 : -1) });
    };

    const celdas = Array.from({ length: total }, (_, indice) => {
        const dia = indice + 1;
        const clave = `${mes.valor}-${String(dia).padStart(2, "0")}`;
        return { dia, clave, citas: dias?.get(clave) || 0 };
    });

    return (
        <div className={styles.calendario}>
            <div className={styles.calendarioCabeza}>
                <b>{nombreMes.format(primero)}</b>
                <div>
                    {mes.valor !== hoy.slice(0, 7) && (
                        <button type="button" className={styles.calendarioHoy} onClick={() => mover(0)}>Hoy</button>
                    )}
                    <button type="button" onClick={() => mover(-1)} aria-label="Mes anterior"><ChevronLeft size={17} aria-hidden="true" /></button>
                    <button type="button" onClick={() => mover(1)} aria-label="Mes siguiente"><ChevronRight size={17} aria-hidden="true" /></button>
                </div>
            </div>
            <div className={styles.calendarioSemana} aria-hidden="true">
                {SEMANA.map((dia) => <span key={dia}>{dia}</span>)}
            </div>
            <div className={styles.calendarioMarco}>
                <AnimatePresence mode="popLayout" initial={false} custom={mes.direccion}>
                    <motion.div
                        key={mes.valor}
                        className={styles.calendarioDias}
                        custom={mes.direccion}
                        variants={reducido ? undefined : variantes}
                        initial="entra"
                        animate="quieto"
                        exit="sale"
                        transition={resorte}
                    >
                        {desfase > 0 && <span style={{ gridColumn: `span ${desfase}` }} aria-hidden="true" />}
                        {celdas.map(({ dia, clave, citas }) => {
                            const elegido = clave === seleccion;
                            return (
                                <button
                                    key={clave}
                                    type="button"
                                    className={styles.dia}
                                    data-hoy={clave === hoy || undefined}
                                    data-citas={citas > 0 || undefined}
                                    aria-pressed={elegido}
                                    aria-label={`${nombreDia.format(new Date(`${clave}T12:00:00Z`))}${citas ? `, ${citas} ${citas === 1 ? "cita" : "citas"}` : ""}`}
                                    onClick={() => onSeleccion(elegido ? "" : clave)}
                                >
                                    {elegido && (
                                        <motion.span
                                            className={styles.diaElegido}
                                            layoutId={`${idBase}-dia`}
                                            transition={reducido ? { duration: 0 } : resorte}
                                            aria-hidden="true"
                                        />
                                    )}
                                    <span>{dia}</span>
                                </button>
                            );
                        })}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
