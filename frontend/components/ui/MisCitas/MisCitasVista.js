"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertCircle, CalendarSearch, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import PanelFiltros from "./PanelFiltros";
import Avisos from "./Avisos";
import RollingNumber from "../Motion/RollingNumber";
import styles from "./MisCitas.module.css";

const resorte = { type: "spring", bounce: 0.22, visualDuration: 0.38 };

export default function MisCitasVista({
    rol,
    descripcion,
    secciones,
    seccion,
    onSeccion,
    panel,
    filtrosActivos = [],
    onLimpiar,
    total,
    cargando,
    error,
    textoError,
    onReintentar,
    citas,
    renderCita,
    vacio,
    paginacion,
    children,
}) {
    const reducido = useReducedMotion();
    const [hojaAbierta, setHojaAbierta] = useState(false);

    useEffect(() => {
        if (!hojaAbierta) return;
        const cerrar = (event) => event.key === "Escape" && setHojaAbierta(false);
        window.addEventListener("keydown", cerrar);
        return () => window.removeEventListener("keydown", cerrar);
    }, [hojaAbierta]);

    const { extras, ...filtros } = panel;
    const actualizando = cargando && citas.length > 0;
    // El layout del paciente ya envuelve la página en <main> y le da altura de pantalla completa.
    const Raiz = rol === "patient" ? "div" : "main";

    return (
        <Raiz className={`${styles.pagina} ${styles[rol]}`} data-appointments-page="true">
            <header className={styles.encabezado}>
                <h1>Mis citas</h1>
                <p>{descripcion}</p>
            </header>
            {children}

            <div className={styles.disposicion}>
                <aside className={styles.lateral} aria-label="Filtros de citas">
                    <PanelFiltros idBase="lateral" {...filtros}>{extras}</PanelFiltros>
                </aside>

                <section className={styles.resultados} aria-labelledby="mis-citas-resultados" aria-busy={cargando}>
                    <h2 id="mis-citas-resultados" className={styles.oculto}>Resultados</h2>
                    <div className={styles.barra}>
                        <div className={styles.secciones} role="group" aria-label="Secciones de citas">
                            {secciones.map(({ valor, etiqueta, icono: Icono, conteo }) => {
                                const activa = seccion === valor;
                                return (
                                    <button key={valor} type="button" data-destino-citas={valor} aria-pressed={activa} onClick={() => onSeccion(valor)}>
                                        {activa && (
                                            <motion.span
                                                className={styles.seccionActiva}
                                                layoutId={`${rol}-seccion`}
                                                transition={reducido ? { duration: 0 } : resorte}
                                                aria-hidden="true"
                                            />
                                        )}
                                        <Icono size={17} aria-hidden="true" />
                                        <span>{etiqueta}</span>
                                        {conteo != null && <RollingNumber className={styles.seccionConteo} value={conteo} />}
                                    </button>
                                );
                            })}
                        </div>
                        <div className={styles.herramientas}>
                            <p className={styles.total} aria-live="polite">
                                {cargando && !citas.length ? "Consultando…" : <><RollingNumber value={total} /> {total === 1 ? "cita" : "citas"}</>}
                            </p>
                            {actualizando && <span className={styles.actualizando} role="status">Actualizando</span>}
                            <button type="button" className={styles.botonFiltros} onClick={() => setHojaAbierta(true)} aria-haspopup="dialog">
                                <SlidersHorizontal size={17} aria-hidden="true" />
                                <span>Filtros</span>
                                {filtrosActivos.length > 0 && <b>{filtrosActivos.length}</b>}
                            </button>
                        </div>
                    </div>

                    <AnimatePresence initial={false}>
                        {filtrosActivos.length > 0 && (
                            <motion.div
                                className={styles.activos}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={reducido ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <div>
                                    <AnimatePresence mode="popLayout" initial={false}>
                                        {filtrosActivos.map((filtro) => (
                                            <motion.button
                                                key={filtro.clave}
                                                type="button"
                                                layout={!reducido}
                                                className={styles.activo}
                                                onClick={filtro.quitar}
                                                aria-label={`Quitar filtro ${filtro.etiqueta}`}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                transition={reducido ? { duration: 0 } : resorte}
                                            >
                                                <span>{filtro.etiqueta}</span>
                                                <X size={14} aria-hidden="true" />
                                            </motion.button>
                                        ))}
                                    </AnimatePresence>
                                    <button type="button" className={styles.limpiar} onClick={onLimpiar}>Limpiar todo</button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {error ? (
                        <div className={styles.error} role="alert">
                            <span aria-hidden="true"><AlertCircle size={24} /></span>
                            <div>
                                <h3>{textoError}</h3>
                                <p>Revisa tu conexión e inténtalo nuevamente.</p>
                            </div>
                            <button type="button" onClick={onReintentar}><RefreshCw size={16} aria-hidden="true" /> Reintentar</button>
                        </div>
                    ) : cargando && !citas.length ? (
                        <div className={styles.esqueleto} role="status" aria-label="Cargando citas">
                            {[0, 1, 2, 3, 4, 5].map((item) => <span key={item} />)}
                        </div>
                    ) : (
                        <>
                            {!citas.length && (
                                <motion.div
                                    className={styles.vacio}
                                    initial={reducido ? false : { opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ ...resorte, delay: reducido ? 0 : 0.5 }}
                                >
                                    <span aria-hidden="true"><CalendarSearch size={26} /></span>
                                    <h3>{vacio.titulo}</h3>
                                    <p>{vacio.texto}</p>
                                    {vacio.accion}
                                </motion.div>
                            )}
                            {/* La rejilla sigue montada sin citas para que la última tarjeta termine su salida. */}
                            <div className={styles.rejilla} role="list" aria-label="Citas">
                                <AnimatePresence mode="popLayout">
                                    {citas.map((cita, indice) => renderCita(cita, indice))}
                                </AnimatePresence>
                            </div>
                        </>
                    )}

                    {!error && citas.length > 0 && <div className={styles.paginacion}>{paginacion}</div>}
                </section>
            </div>

            <AnimatePresence>
                {hojaAbierta && (
                    <motion.div
                        className={styles.hojaFondo}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: reducido ? 0 : 0.25 }}
                        onClick={(event) => event.target === event.currentTarget && setHojaAbierta(false)}
                    >
                        <motion.div
                            className={styles.hojaFiltros}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="hoja-filtros-titulo"
                            initial={reducido ? false : { y: "100%" }}
                            animate={{ y: 0 }}
                            exit={reducido ? { opacity: 0 } : { y: "100%" }}
                            transition={{ type: "spring", bounce: 0.12, visualDuration: 0.42 }}
                        >
                            <span className={styles.agarre} aria-hidden="true" />
                            <div className={styles.hojaCabeza}>
                                <h2 id="hoja-filtros-titulo">Filtros</h2>
                                <button type="button" onClick={() => setHojaAbierta(false)} aria-label="Cerrar filtros" autoFocus>
                                    <X size={18} aria-hidden="true" />
                                </button>
                            </div>
                            <PanelFiltros idBase="hoja" {...filtros}>{extras}</PanelFiltros>
                            <button type="button" className={styles.verResultados} onClick={() => setHojaAbierta(false)}>
                                Ver {total} {total === 1 ? "cita" : "citas"}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Avisos />
        </Raiz>
    );
}
