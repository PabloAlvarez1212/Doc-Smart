"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Copy, MapPin, MapPinOff, Navigation } from "lucide-react";
import Modal from "../Modal/Modal";
import styles from "./LocationModal.module.css";

const valida = (latitud, longitud) =>
    [latitud, longitud].every((valor) => valor != null && String(valor).trim() !== "" && Number.isFinite(Number(valor))) &&
    Math.abs(Number(latitud)) <= 90 &&
    Math.abs(Number(longitud)) <= 180;

// Ventana con la ubicación del consultorio: tarjeta de dirección, mapa y acciones al pie.
export default function LocationModal({ abierto, onCerrar, nombre, direccion, ciudad, latitud, longitud }) {
    const reduced = useReducedMotion();
    const [copiado, setCopiado] = useState(false);
    const [cargado, setCargado] = useState(false);

    useEffect(() => {
        if (!abierto) {
            setCopiado(false);
            setCargado(false);
        }
    }, [abierto]);

    const conCoordenadas = valida(latitud, longitud);
    const destino = conCoordenadas ? `${Number(latitud)},${Number(longitud)}` : "";
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const mapaUrl = key && destino
        ? `https://www.google.com/maps/embed/v1/place?${new URLSearchParams({ key, q: destino, zoom: "17", language: "es" })}`
        : "";
    const rutaUrl = destino
        ? `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination: destino })}`
        : "";

    const copiar = async () => {
        const texto = [direccion, ciudad].filter(Boolean).join(", ");
        try {
            await navigator.clipboard.writeText(texto);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        } catch {
            setCopiado(false);
        }
    };

    return (
        <Modal
            abierto={abierto}
            onCerrar={onCerrar}
            titulo="Ubicación del consultorio"
            text={nombre}
            headerVariant="white"
            width="720px"
            icon={<MapPin size={22} aria-hidden="true" />}
            footer={<>
                <button type="button" className={styles.copy} onClick={copiar} aria-live="polite">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                            key={copiado ? "ok" : "copy"}
                            className={styles.copyIcon}
                            initial={reduced ? false : { scale: .5, opacity: 0, rotate: -30 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            exit={{ scale: .5, opacity: 0 }}
                            transition={{ duration: .18 }}
                        >
                            {copiado ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
                        </motion.span>
                    </AnimatePresence>
                    {copiado ? "Dirección copiada" : "Copiar dirección"}
                </button>
                {rutaUrl && (
                    <a className={styles.route} href={rutaUrl} target="_blank" rel="noopener noreferrer">
                        <Navigation size={18} aria-hidden="true" />
                        Cómo llegar
                    </a>
                )}
            </>}
        >
            <div className={styles.content}>
                <div className={styles.place}>
                    <span className={styles.placeIcon} aria-hidden="true"><MapPin size={20} /></span>
                    <div>
                        <small>{ciudad || "Consultorio"}</small>
                        <strong>{direccion}</strong>
                    </div>
                </div>

                {conCoordenadas && mapaUrl ? (
                    <div className={styles.frame}>
                        {!cargado && <span className={styles.skeleton} aria-hidden="true" />}
                        {abierto && (
                            <iframe
                                title={`Mapa del consultorio: ${direccion}`}
                                src={mapaUrl}
                                className={`${styles.map} ${cargado ? styles.mapReady : ""}`}
                                loading="lazy"
                                allowFullScreen
                                referrerPolicy="no-referrer-when-downgrade"
                                onLoad={() => setCargado(true)}
                            />
                        )}
                    </div>
                ) : (
                    <div className={styles.empty} role="status">
                        <span aria-hidden="true"><MapPinOff size={26} /></span>
                        <strong>{conCoordenadas ? "El mapa no está disponible" : "Ubicación exacta pendiente"}</strong>
                        <p>{conCoordenadas
                            ? "Puedes abrir la ruta en Google Maps con el botón «Cómo llegar»."
                            : "El médico todavía no ha confirmado el punto exacto de este consultorio."}</p>
                    </div>
                )}

                {rutaUrl && <p className={styles.note}>Google Maps abrirá la ruta para que elijas tu punto de salida y tu transporte.</p>}
            </div>
        </Modal>
    );
}
