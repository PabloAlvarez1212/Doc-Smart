"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import LocationModal from "../../../ui/LocationModal/LocationModal";
import Image from "next/image";
import {
    BadgeCheck,
    Banknote,
    Building2,
    CalendarClock,
    CalendarPlus,
    Heart,
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

const BURST = Array.from({ length: 8 }, (_, index) => index * 45);

export default function DoctorCard({ doctor, onSchedule, onViewProfile, onToggleFavorito, index = 0 }) {
    const reduceMotion = useReducedMotion();

    const [mapaAbierto, setMapaAbierto] = useState(false);
    const [latido, setLatido] = useState(0);

    const favorito = Boolean(doctor.es_favorito);

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

    const esHoy = tieneDisponibilidad && proximaDisponibilidad.fecha === new Date().toLocaleDateString("sv-SE");

    const rating = getDoctorRatingPresentation(doctor);

    const alternarFavorito = () => {
        setLatido((valor) => valor + 1);
        onToggleFavorito?.(doctor);
    };

    return (
        <motion.article
            className={styles.card}
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: .94, transition: { duration: .22 } }}
            transition={{ duration: reduceMotion ? 0 : .45, delay: reduceMotion ? 0 : Math.min(index, 8) * .05, ease: [.23, 1, .32, 1] }}
            layout={reduceMotion ? false : "position"}
        >

            <header className={styles.top}>
                <div className={styles.photoFrame}>
                    <Image
                        src={doctor.foto_perfil || "/images/foto_default.png"}
                        alt={`Foto de perfil de ${fullName}`}
                        width={84}
                        height={84}
                        className={styles.photo}
                    />
                    {doctor.verificado && (
                        <span className={styles.photoBadge} title="Médico verificado">
                            <BadgeCheck size={16} aria-hidden="true" />
                        </span>
                    )}
                </div>

                <div className={styles.profile}>
                    <span className={styles.specialty}>
                        <Stethoscope size={14} aria-hidden="true" />
                        {doctor.especialidad || "Especialidad no especificada"}
                    </span>

                    <h2>{fullName}</h2>

                    <div className={styles.rating}>
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
                </div>

                {onToggleFavorito && (
                    <button
                        type="button"
                        className={`${styles.heart} ${favorito ? styles.heartOn : ""}`}
                        onClick={alternarFavorito}
                        aria-pressed={favorito}
                        aria-label={favorito ? `Quitar a ${fullName} de favoritos` : `Guardar a ${fullName} en favoritos`}
                    >
                        <Heart size={20} aria-hidden="true" />
                        {favorito && latido > 0 && !reduceMotion && (
                            <span className={styles.burst} key={latido} aria-hidden="true">
                                {BURST.map((angulo) => <i key={angulo} style={{ "--a": `${angulo}deg` }} />)}
                            </span>
                        )}
                    </button>
                )}
            </header>

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

            <div className={styles.facts}>
                <div className={`${styles.slot} ${esHoy ? styles.slotToday : ""}`}>
                    <span className={styles.slotIcon} aria-hidden="true"><CalendarClock size={19} /></span>
                    <div>
                        {tieneDisponibilidad ? (
                            <>
                                <small>{esHoy ? "Disponible hoy" : "Próxima disponibilidad"}</small>
                                <strong>
                                    {formatearFecha(proximaDisponibilidad.fecha)}
                                </strong>
                                <span>
                                    {proximaDisponibilidad.hora_inicio} - {proximaDisponibilidad.hora_fin}
                                </span>
                            </>
                        ) : (
                            <>
                                <small>Sin disponibilidad</small>
                                <span>Sin horarios por el momento.</span>
                            </>
                        )}
                    </div>
                </div>

                {doctor.valor_consulta != null && (
                    <div className={styles.priceBox}>
                        <span className={styles.priceIcon} aria-hidden="true"><Banknote size={19} /></span>
                        <div>
                            <small>Valor de la consulta</small>
                            <strong>{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(doctor.valor_consulta)}</strong>
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.actions}>
                <Button
                    variant="secundary"
                    className={styles.profileAction}
                    onClick={() => onViewProfile?.(doctor)}
                >
                    <UserRound size={17} aria-hidden="true" />
                    Ver perfil
                </Button>
                <Button
                    className={styles.primaryAction}
                    disabled={!tieneDisponibilidad}
                    onClick={() => onSchedule?.(doctor)}
                >
                    <CalendarPlus size={18} aria-hidden="true" />
                    Agendar cita
                </Button>
            </div>

            <LocationModal
                abierto={mapaAbierto}
                onCerrar={() => setMapaAbierto(false)}
                nombre={fullName}
                direccion={doctor.direccion}
                ciudad={location}
                latitud={doctor.latitud}
                longitud={doctor.longitud}
            />

        </motion.article>
    );
}
