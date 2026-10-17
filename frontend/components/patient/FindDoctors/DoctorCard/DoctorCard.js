"use client";

import { useState } from "react";
import Modal from "../../../ui/Modal/Modal";
import Image from "next/image";
import {
    Building2,
    CalendarClock,
    CalendarPlus,
    MapPin,
    Navigation,
    Stethoscope
} from "lucide-react";

import Button from "../../../ui/Button/Button";
import styles from "./DoctorCard.module.css";

function formatearFecha(fecha) {
    if (!fecha) return "";

    return new Intl.DateTimeFormat("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long",
    }).format(new Date(`${fecha}T00:00:00`));
}

export default function DoctorCard({ doctor, onSchedule }) {

    const [mapaAbierto, setMapaAbierto] = useState(false);

    const tieneCoordenadas =
        doctor.latitud != null &&
        doctor.longitud != null &&
        String(doctor.latitud).trim() !== "" &&
        String(doctor.longitud).trim() !== "" &&
        Number.isFinite(Number(doctor.latitud)) &&
        Number.isFinite(Number(doctor.longitud)) &&
        Math.abs(Number(doctor.latitud)) <= 90 &&
        Math.abs(Number(doctor.longitud)) <= 180;

    const destino = tieneCoordenadas
        ? `${Number(doctor.latitud)},${Number(doctor.longitud)}`
        : "";

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const mapaUrl = apiKey && destino
        ? `https://www.google.com/maps/embed/v1/place?${new URLSearchParams({
            key: apiKey,
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

    const fullName =
        [doctor.nombre, doctor.apellido]
            .filter(Boolean)
            .join(" ") || "Médico";

    const location =
        [doctor.ciudad, doctor.departamento]
            .filter(Boolean)
            .join(", ");

    const proximaDisponibilidad =
        doctor.proxima_disponibilidad;

    const tieneDisponibilidad =
        Boolean(proximaDisponibilidad);

    return (
        <article className={styles.card}>

            <div className={styles.identity}>
                <div className={styles.photoFrame}>
                    <Image
                        src={
                            doctor.foto_perfil ||
                            "/images/foto_default.png"
                        }
                        alt={`Foto de perfil de ${fullName}`}
                        width={116}
                        height={116}
                        className={styles.photo}
                    />
                </div>

                <div className={styles.profile}>
                    <span className={styles.specialty}>
                        <Stethoscope size={14} />
                        {doctor.especialidad ||
                            "Especialidad no especificada"}
                    </span>

                    <h2>{fullName}</h2>

                    {location && (
                        <p className={styles.location}>
                            <MapPin size={16} />
                            {location}
                        </p>
                    )}

                    {doctor.direccion && (
                        tieneCoordenadas ? (
                            <button
                                type="button"
                                className={styles.addressLink}
                                onClick={() => setMapaAbierto(true)}
                                aria-haspopup="dialog"
                                aria-label={`Ver ubicación de ${fullName}`}
                            >
                                <Building2 size={16} aria-hidden="true" />

                                <span>
                                    {doctor.direccion}
                                    <small>Ver ubicación y cómo llegar</small>
                                </span>
                            </button>
                        ) : (
                            <p className={styles.address}>
                                <Building2 size={16} aria-hidden="true" />
                                {doctor.direccion}
                            </p>
                        )
                    )}
                </div>
            </div>

            <div className={styles.schedule}>
                <span
                    className={styles.scheduleIcon}
                    aria-hidden="true"
                >
                    <CalendarClock size={20} />
                </span>

                <div>
                    {tieneDisponibilidad ? (
                        <>
                            <strong>
                                Próxima disponibilidad
                            </strong>

                            <p>
                                {formatearFecha(
                                    proximaDisponibilidad.fecha
                                )}
                                {" · "}
                                {
                                    proximaDisponibilidad.hora_inicio
                                }
                                {" - "}
                                {
                                    proximaDisponibilidad.hora_fin
                                }
                            </p>
                        </>
                    ) : (
                        <>
                            <strong>
                                Sin disponibilidad próxima
                            </strong>

                            <p>
                                Este profesional no tiene horarios
                                disponibles por el momento.
                            </p>
                        </>
                    )}
                </div>
            </div>

            <div className={styles.actions}>
                <Button
                    className={styles.primaryAction}
                    disabled={!tieneDisponibilidad}
                    onClick={() => onSchedule?.(doctor)}
                >
                    <CalendarPlus size={18} />
                    Agendar cita
                </Button>

                <small className={styles.actionHint}>
                    {tieneDisponibilidad
                        ? "Ver horarios disponibles"
                        : "Sin horarios disponibles"}
                </small>
            </div>

            <Modal
                abierto={mapaAbierto}
                onCerrar={() => setMapaAbierto(false)}
                titulo="Ubicación del consultorio"
                text={fullName}
                width="760px"
                icon={<MapPin size={24} aria-hidden="true" />}
            >
                <div className={styles.mapContent}>
                    <p className={styles.mapAddress}>
                        <Building2 size={18} aria-hidden="true" />
                        {doctor.direccion}
                    </p>

                    {location && (
                        <p className={styles.mapLocation}>{location}</p>
                    )}

                    {mapaAbierto && mapaUrl ? (
                        <iframe
                            title={`Ubicación del consultorio de ${fullName}`}
                            src={mapaUrl}
                            className={styles.mapFrame}
                            loading="lazy"
                            allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                        />
                    ) : (
                        <p role="status">
                            El mapa no está disponible. Puedes consultar la
                            ubicación en Google Maps.
                        </p>
                    )}

                    {rutaUrl && (
                        <a
                            href={rutaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.directionsLink}
                        >
                            <Navigation size={18} aria-hidden="true" />
                            Cómo llegar
                        </a>
                    )}

                    <p className={styles.mapNote}>
                        Se abrirá Google Maps para elegir tu punto de salida
                        y medio de transporte.
                    </p>
                </div>
            </Modal>

        </article>
    );
}