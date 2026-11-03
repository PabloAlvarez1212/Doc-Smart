"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import styles from "./MisCitas.module.css";

const VACIO = [];
const DURACION = 4200;
const oyentes = new Set();
let avisos = VACIO;
let siguiente = 0;

function emitir() {
    oyentes.forEach((avisar) => avisar());
}

export function quitarAviso(id) {
    avisos = avisos.filter((aviso) => aviso.id !== id);
    emitir();
}

export function avisar(texto, tono = "ok") {
    const id = ++siguiente;
    avisos = [...avisos, { id, texto, tono }].slice(-3);
    emitir();
    setTimeout(() => quitarAviso(id), DURACION);
}

function suscribir(avisar) {
    oyentes.add(avisar);
    return () => oyentes.delete(avisar);
}

export default function Avisos() {
    const lista = useSyncExternalStore(suscribir, () => avisos, () => VACIO);
    const reducido = useReducedMotion();

    return (
        <div className={styles.avisos} role="status" aria-live="polite">
            <AnimatePresence initial={false}>
                {lista.map((aviso) => {
                    const Icono = aviso.tono === "error" ? CircleAlert : CircleCheck;
                    return (
                        <motion.div
                            key={aviso.id}
                            layout={!reducido}
                            className={styles.aviso}
                            data-tono={aviso.tono}
                            initial={reducido ? false : { opacity: 0, y: 24, scale: 0.94, filter: "blur(4px)" }}
                            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
                            exit={{ opacity: 0, y: 12, scale: 0.96, transition: { duration: 0.18 } }}
                            transition={{ type: "spring", bounce: 0.3, visualDuration: 0.4 }}
                        >
                            <span className={styles.avisoIcono} aria-hidden="true"><Icono size={17} /></span>
                            <span>{aviso.texto}</span>
                            <button type="button" onClick={() => quitarAviso(aviso.id)} aria-label="Cerrar aviso">
                                <X size={15} aria-hidden="true" />
                            </button>
                            <i className={styles.avisoTiempo} style={{ animationDuration: `${DURACION}ms` }} aria-hidden="true" />
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
