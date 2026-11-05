"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import Modal from "../../../ui/Modal/Modal";
import Image from "next/image";
import {
    BadgeCheck,
    Banknote,
    Building2,
    CalendarClock,
    CalendarPlus,
    MapPin,
    Navigation,
    Stethoscope,
    UserRound,
    Users,
} from "lucide-react";

import Button from "../../../ui/Button/Button";
import EstrellasCalificacion from "../../Calificaciones/EstrellasCalificacion/EstrellasCalificacion";
import { getDoctorRatingPresentation } from "./doctorCardPresentation";
import styles from "./DoctorCard.module.css";

function formatearFecha(fecha) {
    if (!fecha) return "";

    return new Intl.DateTimeFormat("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long",
    }).format(new Date(`${fecha}T00:00:00`));
}

export default function DoctorCard({ doctor, onSchedule, onViewProfile }) {
    const reduceMotion = useReducedMotion();

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

    const rating = getDoctorRatingPresentation(doctor);

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

                    <div
                        className={styles.rating}
                    >
                        {rating.hasRatings ? (
                            <>
                                <EstrellasCalificacion
                                    value={rating.averageValue}
                                    readOnly
                                    compact
                                    showDescription={false}
                                    ariaLabel={`Calificación ${rating.averageLabel} de 5, ${rating.opinionsLabel}`}
                                />
                                <span>({rating.opinionsLabel})</span>
                            </>
                        ) : (
                            <span>{rating.opinionsLabel}</span>
                        )}
                    </div>

                    <p className={styles.trust}>
                        {doctor.verificado && (
                            <span className={styles.verified}>
                                <BadgeCheck size={14} aria-hidden="true" />
                                Médico verificado
                            </span>
                        )}
                        <span className={styles.attended}>
                            <Users size={14} aria-hidden="true" />
                            {doctor.pacientes_atendidos ?? 0} {doctor.pacientes_atendidos === 1 ? "paciente atendido" : "pacientes atendidos"}
                        </span>
                    </p>

                    {(location || doctor.direccion) && (
                        tieneCoordenadas && doctor.direccion ? (
                            <button
                                type="button"
                                className={styles.place}
                                onClick={() => setMapaAbierto(true)}
                                aria-haspopup="dialog"
                                aria-label={`Ver ubicación de ${fullName}`}
                            >
                                <span className={styles.placeIcon} aria-hidden="true"><MapPin size={18} /></span>
                                <span className={styles.placeText}>
                                    <strong>{location || "Consultorio"}</strong>
                                    <span>{doctor.direccion}</span>
                                </span>
                                <span className={styles.placeCta}>
                                    Ver mapa
                                    <Navigation size={14} aria-hidden="true" />
                                </span>
                            </button>
                        ) : (
                            <div className={styles.place} data-static="true">
                                <span className={styles.placeIcon} aria-hidden="true"><MapPin size={18} /></span>
                                <span className={styles.placeText}>
                                    <strong>{location || "Consultorio"}</strong>
                                    {doctor.direccion && <span>{doctor.direccion}</span>}
                                </span>
                            </div>
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
                {doctor.valor_consulta != null && (
                    <div className={styles.priceBox}>
                        <span className={styles.priceIcon} aria-hidden="true"><Banknote size={18} /></span>
                        <div>
                            <small>Valor de la consulta</small>
                            <strong>{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(doctor.valor_consulta)}</strong>
                        </div>
                    </div>
                )}
                <motion.button initial="rest" whileHover="hover" whileFocus="hover" type="button" className={styles.profileAction} onClick={() => onViewProfile?.(doctor)}>
                    <motion.span aria-hidden="true" style={{ display: "inline-flex" }} variants={{ rest: { y: 0 }, hover: { y: reduceMotion ? 0 : -2 } }} transition={{ duration: .18, ease: "easeOut" }}><UserRound size={17} /></motion.span>
                    Ver perfil y valoración
                </motion.button>
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
