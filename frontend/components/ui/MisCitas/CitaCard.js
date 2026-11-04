"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useAnimate, usePresence, useReducedMotion } from "motion/react";
import { FileText, MapPin, Star } from "lucide-react";
import seguirCursor from "../Motion/seguirCursor";
import { avisar } from "./Avisos";
import pedirMotivo from "./pedirMotivo";
import { ESTADOS, avanceEspera, cuentaRegresiva, estadoDe, fechaRelativa, partesFecha } from "./citaFormato";
import { olvidarSalida, registrarSalida, useEfectoCita, verSalida } from "./citaEfectos";
import styles from "./MisCitas.module.css";

const resorte = { type: "spring", bounce: 0.28, visualDuration: 0.42 };
const suave = [0.22, 1, 0.36, 1];
const lanzado = [0.55, 0, 0.3, 1];
const CHISPAS = Array.from({ length: 9 }, (_, indice) => (indice / 9) * Math.PI * 2);

// Bordes dentados de la rasgadura: las dos mitades comparten la misma línea de corte.
const DIENTES = Array.from({ length: 15 }, (_, indice) => `${indice % 2 ? 61 : 66}% ${(indice / 14) * 100}%`).join(", ");
const CORTE_IZQUIERDO = `polygon(0 0, ${DIENTES}, 0 100%)`;
const CORTE_DERECHO = `polygon(${DIENTES}, 100% 100%, 100% 0)`;

const iniciales = (nombre = "") => nombre.split(" ").filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase();

export default function CitaCard({
    ref,
    cita,
    rol,
    indice = 0,
    ahora,
    destacada = false,
    nueva = false,
    nombre,
    detalle,
    foto,
    ubicacion,
    enlaces,
    datos = [],
    principal,
    iconos = [],
    onCancelar,
}) {
    const id = cita.id;
    const estado = estadoDe(cita);
    const meta = ESTADOS[estado] || { etiqueta: cita.estado || "Sin estado", tono: "muted" };
    const fecha = partesFecha(cita.fecha_programada);
    const puntuacion = Number(cita.calificacion?.puntuacion) || 0;
    const reducido = useReducedMotion();
    const [scope, animate] = useAnimate();
    const [presente, quitar] = usePresence();
    const externo = useEfectoCita(id);

    // Compara con lo que se mostró antes para animar el cambio que llegó del servidor.
    const [previo, setPrevio] = useState({ estado, fecha: cita.fecha_programada, puntuacion, efecto: null, n: 0 });
    if (previo.estado !== estado || previo.fecha !== cita.fecha_programada || previo.puntuacion !== puntuacion) {
        let cambio = null;
        if (estado === "confirmada" && ["pendiente", "reprogramada"].includes(previo.estado)) cambio = "latido";
        else if (previo.fecha !== cita.fecha_programada) cambio = "girar";
        else if (puntuacion && puntuacion !== previo.puntuacion) cambio = "estrellas";
        setPrevio({ estado, fecha: cita.fecha_programada, puntuacion, efecto: cambio, n: previo.n + 1 });
    }
    const efecto = reducido ? null : previo.efecto;

    const [cancelando, setCancelando] = useState(false);
    const [boton, setBoton] = useState("quieto");
    const [salida, setSalida] = useState(null);
    if (!presente && !salida) setSalida(verSalida(id) || { tipo: "normal" });
    // Un filtro puede devolver la cita mientras todavía sale: vuelve a ser una tarjeta normal.
    if (presente && salida) setSalida(null);

    const sacudir = () => {
        if (!reducido && scope.current) animate(scope.current, { x: [0, -7, 7, -4, 3, 0] }, { duration: 0.42 });
    };

    useEffect(() => {
        if (efecto !== "latido" || !scope.current) return;
        animate(scope.current, { scale: [1, 1.035, 1, 1.018, 1] }, { duration: 0.95, delay: 0.55, ease: "easeInOut" });
    }, [efecto, previo.n, animate, scope]);

    useEffect(() => {
        if (previo.efecto === "latido" && rol === "patient") avisar(`${nombre} confirmó tu cita.`);
    }, [previo.efecto, previo.n, rol, nombre]);

    useEffect(() => {
        if (presente || !salida) return;
        olvidarSalida(id);
        const nodo = scope.current;
        const destino = document.querySelector('[data-destino-citas="historial"]');
        const llegar = () => destino?.animate(
            [{ transform: "scale(1)" }, { transform: "scale(1.14)" }, { transform: "scale(1)" }],
            { duration: 460, easing: "cubic-bezier(.34,1.56,.64,1)" },
        );
        const viaje = { x: salida.dx, y: salida.dy };

        const correr = async () => {
            if (!nodo || reducido) return;
            if (salida.tipo === "cancelar" && salida.visible) {
                await animate(nodo, { scale: 0.94, rotate: -2 }, { duration: 0.22, ease: suave });
                await animate(nodo, { ...viaje, scale: 0.12, rotate: -12, opacity: 0 }, { duration: 0.68, ease: lanzado });
                llegar();
            } else if (salida.tipo === "archivar" && salida.visible) {
                await animate(nodo, { rotateX: 64, scaleY: 0.62, y: -10, transformPerspective: 900 }, { duration: 0.34, ease: suave });
                await animate(nodo, { ...viaje, scale: 0.1, opacity: 0 }, { duration: 0.52, ease: lanzado });
                llegar();
            } else if (salida.tipo === "rasgar") {
                await Promise.all([
                    animate("[data-mitad='izquierda']", { x: -38, y: 84, rotate: -9, opacity: 0 }, { duration: 0.75, ease: [0.45, 0, 0.7, 1] }),
                    animate("[data-mitad='derecha']", { x: 46, y: 110, rotate: 15, opacity: 0 }, { duration: 0.75, delay: 0.06, ease: [0.45, 0, 0.7, 1] }),
                ]);
            } else if (salida.tipo === "ausente") {
                await animate("[data-avatar]", { scale: 0.3, opacity: 0, filter: "blur(6px)" }, { duration: 0.45, ease: suave });
                await animate(nodo, { x: [0, -8, 7, -4, 0] }, { duration: 0.4 });
                await animate(nodo, { y: 40, opacity: 0, filter: "blur(4px)" }, { duration: 0.4, ease: [0.4, 0, 1, 1] });
            } else {
                await animate(nodo, { opacity: 0, scale: 0.96 }, { duration: 0.18 });
            }
        };
        let vigente = true;
        correr().finally(() => vigente && quitar());
        return () => {
            vigente = false;
            if (!nodo || !nodo.isConnected) return;
            // Deshace una salida a medias para que la tarjeta no quede invisible.
            animate(nodo, { opacity: 1, x: 0, y: 0, scale: 1, scaleY: 1, rotate: 0, rotateX: 0, filter: "none" }, { duration: 0.2 });
            const avatar = nodo.querySelector("[data-avatar]");
            if (avatar) animate(avatar, { opacity: 1, scale: 1, filter: "none" }, { duration: 0.2 });
        };
    }, [presente, salida, id, animate, scope, quitar, reducido]);

    const ejecutar = async () => {
        const resultado = principal.onClick?.();
        if (typeof resultado?.then !== "function") return;
        setBoton("cargando");
        try {
            await resultado;
            setBoton("listo");
            setTimeout(() => setBoton("quieto"), 900);
        } catch {
            setBoton("quieto");
            sacudir();
        }
    };

    const cancelar = async () => {
        const texto = await pedirMotivo(rol);
        if (!texto) return;
        setCancelando(true);
        registrarSalida(id, rol === "doctor" ? "cancelar" : "rasgar");
        try {
            await onCancelar(texto);
        } catch {
            olvidarSalida(id);
            setCancelando(false);
            sacudir();
        }
    };

    const quien = (
        <div className={styles.quien}>
            <span className={styles.avatar} data-avatar>
                {foto ? <Image src={foto} alt="" width={44} height={44} /> : <span>{iniciales(nombre)}</span>}
            </span>
            <div>
                <b className={styles.nombre}>{nombre}</b>
                {detalle && <small>{detalle}</small>}
            </div>
        </div>
    );

    const lugar = ubicacion && (
        <div className={styles.lugar}>
            <MapPin size={16} aria-hidden="true" />
            <div>{ubicacion}</div>
        </div>
    );

    const valoracion = puntuacion > 0 && (
        <div className={styles.valoracion}>
            <span className={styles.estrellas} role="img" aria-label={`${puntuacion} de 5 estrellas`}>
                {[1, 2, 3, 4, 5].map((numero) => (
                    <motion.span
                        key={`${numero}-${previo.n}`}
                        data-llena={numero <= puntuacion || undefined}
                        initial={efecto === "estrellas" ? { scale: 0, rotate: -140 } : false}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ ...resorte, bounce: 0.5, delay: 0.1 + numero * 0.09 }}
                    >
                        <Star size={15} aria-hidden="true" />
                    </motion.span>
                ))}
                {efecto === "estrellas" && CHISPAS.map((angulo, numero) => (
                    <motion.i
                        key={`${numero}-${previo.n}`}
                        className={styles.chispa}
                        initial={{ x: 0, y: 0, scale: 1.2, opacity: 1 }}
                        animate={{ x: Math.cos(angulo) * 46, y: Math.sin(angulo) * 26, scale: 0, opacity: 0 }}
                        transition={{ duration: 0.85, delay: 0.55 + numero * 0.025, ease: suave }}
                        aria-hidden="true"
                    />
                ))}
            </span>
            <small>{rol === "doctor" ? "Calificación del paciente" : "Tu calificación"}</small>
        </div>
    );

    const cuenta = destacada && (
        <div className={styles.cuenta}>
            <svg className={styles.anillo} viewBox="0 0 120 120" aria-hidden="true">
                <circle cx="60" cy="60" r="52" />
                <motion.circle
                    cx="60"
                    cy="60"
                    r="52"
                    initial={reducido ? false : { pathLength: 0 }}
                    animate={{ pathLength: avanceEspera(cita.fecha_programada, ahora) }}
                    transition={{ duration: 1.4, ease: suave, delay: 0.3 }}
                />
            </svg>
            <div>
                <small>{rol === "doctor" ? "Tu próxima consulta" : "Tu próxima cita"} empieza en</small>
                <b>{cuentaRegresiva(cita.fecha_programada, ahora)}</b>
                <span>{fechaRelativa(cita.fecha_programada, ahora)} · {fecha.hora} {fecha.periodo}</span>
            </div>
        </div>
    );

    const detalles = datos.length > 0 && (
        <dl className={styles.datos}>
            {datos.map(({ etiqueta, valor }) => (
                <div key={etiqueta}><dt>{etiqueta}</dt><dd>{valor}</dd></div>
            ))}
        </dl>
    );

    const IconoPrincipal = principal?.icono;
    const cara = (
        <div className={styles.cara}>
            {efecto === "latido" && (
                <motion.svg
                    key={`latido-${previo.n}`}
                    className={styles.latido}
                    viewBox="0 0 300 40"
                    preserveAspectRatio="none"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ delay: 1.35, duration: 0.5 }}
                    aria-hidden="true"
                >
                    <motion.path
                        d="M0 22 H96 L106 22 L114 8 L124 36 L134 2 L144 30 L150 22 H300"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                    />
                </motion.svg>
            )}

            {externo?.tipo === "documentos" && !reducido && (
                <div key={externo.n} className={styles.papeles} aria-hidden="true">
                    {[0, 1, 2].map((numero) => (
                        <motion.span
                            key={numero}
                            initial={{ y: -70, x: (numero - 1) * 30, rotate: (numero - 1) * -24, opacity: 0 }}
                            animate={{ y: [-70, 0, 10], x: (numero - 1) * 8, rotate: 0, opacity: [0, 1, 0] }}
                            transition={{ duration: 1.15, delay: numero * 0.16, ease: suave }}
                        >
                            <FileText size={20} />
                        </motion.span>
                    ))}
                </div>
            )}

            <header className={styles.cabeza}>
                <div className={styles.hojaFecha} aria-hidden="true">
                    <AnimatePresence initial={false}>
                        <motion.div
                            key={cita.fecha_programada}
                            className={styles.hoja}
                            initial={reducido ? false : { opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                            exit={reducido ? { opacity: 0 } : { rotateX: 115, opacity: 0, transition: { duration: 0.6, ease: [0.5, 0, 0.75, 0] } }}
                            transition={{ ...resorte, delay: reducido ? 0 : 0.18 }}
                            style={{ transformPerspective: 380, transformOrigin: "50% 0%" }}
                        >
                            <span>{fecha.semana}</span>
                            <b>{fecha.dia}</b>
                            <span>{fecha.mes}</span>
                        </motion.div>
                    </AnimatePresence>
                </div>
                <div className={styles.cuando}>
                    <AnimatePresence mode="popLayout" initial={false}>
                        <motion.b
                            key={`${fecha.hora}${fecha.periodo}`}
                            initial={{ y: "80%", opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "-80%", opacity: 0 }}
                            transition={reducido ? { duration: 0 } : resorte}
                        >
                            {fecha.hora} {fecha.periodo}
                        </motion.b>
                    </AnimatePresence>
                    <small>{fechaRelativa(cita.fecha_programada, ahora)}</small>
                </div>
                <span className={styles.chip}>
                    <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                            key={estado}
                            initial={{ y: 16, opacity: 0, filter: "blur(3px)" }}
                            animate={{ y: 0, opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
                            exit={{ y: -16, opacity: 0 }}
                            transition={reducido ? { duration: 0 } : { ...resorte, delay: efecto === "latido" ? 0.6 : 0 }}
                        >
                            {meta.etiqueta}
                        </motion.span>
                    </AnimatePresence>
                </span>
            </header>

            {destacada ? (
                <div className={styles.destacadaCuerpo}>
                    <div className={styles.destacadaInfo}>{quien}{lugar}{detalles}{enlaces && <div className={styles.enlaces}>{enlaces}</div>}{valoracion}</div>
                    {cuenta}
                </div>
            ) : (
                <>{quien}{lugar}{enlaces && <div className={styles.enlaces}>{enlaces}</div>}{valoracion}</>
            )}

            <footer className={styles.acciones}>
                {principal && (
                    <AnimatePresence mode="popLayout" initial={false}>
                        <motion.button
                            key={principal.id}
                            type="button"
                            className={styles.principal}
                            data-tono={principal.tono}
                            data-estado={boton}
                            disabled={boton !== "quieto"}
                            aria-busy={boton === "cargando" || undefined}
                            onClick={ejecutar}
                            initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
                            exit={{ opacity: 0, y: -12, transition: { duration: 0.16 } }}
                            transition={reducido ? { duration: 0 } : resorte}
                        >
                            <span className={styles.principalTexto}>
                                {IconoPrincipal && <IconoPrincipal size={17} aria-hidden="true" />}
                                <span>{principal.etiqueta}</span>
                            </span>
                            <span className={styles.giro} aria-hidden="true" />
                            <svg className={styles.visto} viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                        </motion.button>
                    </AnimatePresence>
                )}
                {iconos.length > 0 && (
                    <div className={styles.iconos}>
                        {iconos.map(({ id: accion, etiqueta, icono: Icono, onClick }) => (
                            <button
                                key={accion}
                                type="button"
                                className={styles.icono}
                                data-accion={accion}
                                onClick={accion === "cancelar" ? cancelar : onClick}
                                aria-label={etiqueta}
                                title={etiqueta}
                                aria-haspopup={accion === "cancelar" ? "dialog" : undefined}
                            >
                                <Icono size={18} aria-hidden="true" />
                            </button>
                        ))}
                    </div>
                )}
            </footer>
        </div>
    );

    return (
        <motion.article
            ref={ref}
            role="listitem"
            data-cita={id}
            data-tono={meta.tono}
            data-cancelando={cancelando || undefined}
            data-efecto={efecto || undefined}
            data-rol={rol}
            className={`${styles.tarjeta} ${destacada ? styles.destacada : ""}`}
            layout={reducido ? false : "position"}
            initial={reducido ? false : nueva ? { opacity: 0, y: -56, scale: 0.85 } : { opacity: 0, y: 18, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
            transition={nueva ? { type: "spring", bounce: 0.45, visualDuration: 0.6 } : { ...resorte, delay: Math.min(indice, 8) * 0.05 }}
            onPointerMove={seguirCursor}
        >
            {/* AnimatePresence mide el article; las salidas y el latido mueven este marco interno. */}
            <div ref={scope} className={styles.marco}>
            {nueva && (
                <motion.span
                    className={styles.nueva}
                    initial={reducido ? false : { scale: 0, rotate: -12 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", bounce: 0.6, visualDuration: 0.45, delay: 0.35 }}
                >
                    Nueva
                </motion.span>
            )}
            {salida?.tipo === "rasgar" && !reducido ? (
                <div className={styles.mitades}>
                    <div data-mitad="izquierda" style={{ clipPath: CORTE_IZQUIERDO }}>{cara}</div>
                    <div data-mitad="derecha" style={{ clipPath: CORTE_DERECHO }} aria-hidden="true">{cara}</div>
                </div>
            ) : cara}
            </div>
        </motion.article>
    );
}
