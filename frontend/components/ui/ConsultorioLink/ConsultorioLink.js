"use client";

import { useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import Modal from "../Modal/Modal";
import styles from "./ConsultorioLink.module.css";

export default function ConsultorioLink({
    direccion,
    latitud,
    longitud,
}) {
    const [abierto, setAbierto] = useState(false);

    if (!direccion) {
        return <span>Dirección pendiente de configurar</span>;
    }

    const tieneCoordenadas =
        [latitud, longitud].every(
            (valor) =>
                valor != null &&
                String(valor).trim() !== "" &&
                Number.isFinite(Number(valor))
        ) &&
        Math.abs(Number(latitud)) <= 90 &&
        Math.abs(Number(longitud)) <= 180;

    const destino = tieneCoordenadas
        ? `${Number(latitud)},${Number(longitud)}`
        : "";

    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const mapaUrl = key && destino
        ? `https://www.google.com/maps/embed/v1/place?${new URLSearchParams({
            key,
            q: destino,
            zoom: "17",
            language: "es",
        })}`
        : "";

    const rutaUrl = destino
        ? `https://www.google.com/maps/dir/?${new URLSearchParams({
            api: "1",
            destination: destino,
        })}`
        : "";

    return (
        <>
            <button
                type="button"
                className={styles.link}
                aria-haspopup="dialog"
                onClick={(event) => {
                    event.stopPropagation();
                    setAbierto(true);
                }}
            >
                {direccion}
                <span>Ver mapa y cómo llegar</span>
            </button>

            <Modal
                abierto={abierto}
                onCerrar={() => setAbierto(false)}
                titulo="Ubicación del consultorio"
                width="760px"
                icon={<MapPin size={24} aria-hidden="true" />}
            >
                <div className={styles.content}>
                    <p className={styles.address}>{direccion}</p>

                    {!tieneCoordenadas ? (
                        <p>
                            El médico todavía no ha confirmado la
                            ubicación exacta de este consultorio.
                        </p>
                    ) : (
                        <>
                            {abierto && mapaUrl ? (
                                <iframe
                                    className={styles.map}
                                    title={`Mapa del consultorio: ${direccion}`}
                                    src={mapaUrl}
                                    loading="lazy"
                                    allowFullScreen
                                    referrerPolicy="no-referrer-when-downgrade"
                                />
                            ) : (
                                <p>
                                    El mapa no está disponible.
                                    Puedes abrir la ruta en Google Maps.
                                </p>
                            )}

                            <a
                                className={styles.directions}
                                href={rutaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Navigation size={18} aria-hidden="true" />
                                Cómo llegar
                            </a>

                            <p className={styles.note}>
                                Google Maps abrirá la ruta para que
                                elijas tu punto de salida y transporte.
                            </p>
                        </>
                    )}
                </div>
            </Modal>
        </>
    );
}