"use client";

import { useState } from "react";
import { MapPin, Navigation, ArrowUpRight } from "lucide-react";
import LocationModal from "../LocationModal/LocationModal";
import styles from "./ConsultorioLink.module.css";

export default function ConsultorioLink({
    direccion,
    latitud,
    longitud,
    compact = false,
    ciudad,
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
                className={`${styles.link} ${compact ? styles.compact : ''}`}
                aria-haspopup="dialog"
                aria-label={compact ? `Ver mapa y cómo llegar: ${ciudad || ''}, ${direccion}` : undefined}
                onClick={(event) => {
                    event.stopPropagation();
                    setAbierto(true);
                }}
            >
                {compact ? <><strong>{ciudad || 'Consultorio'}</strong><span className={styles.compactAddress}>{direccion}<ArrowUpRight size={14} aria-hidden="true" /></span></> : <>{direccion}<span>Ver mapa y cómo llegar</span></>}
            </button>

            <LocationModal
                abierto={abierto}
                onCerrar={() => setAbierto(false)}
                direccion={direccion}
                ciudad={ciudad}
                latitud={latitud}
                longitud={longitud}
            />
        </>
    );
}
