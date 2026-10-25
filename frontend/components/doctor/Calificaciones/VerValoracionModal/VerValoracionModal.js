"use client";

import { CalendarClock, MessageSquareText, Star } from "lucide-react";
import Modal from "../../../ui/Modal/Modal";
import EstrellasCalificacion from "../../../patient/Calificaciones/EstrellasCalificacion/EstrellasCalificacion";
import { formatCalificacionDate } from "../../../patient/Calificaciones/calificacionPresentation";
import styles from "./VerValoracionModal.module.css";

export default function VerValoracionModal({ cita, onClose }) {
    const calificacion = cita?.calificacion;
    const abierto = Boolean(cita && calificacion);

    return (
        <Modal headerVariant="white" abierto={abierto} onCerrar={onClose} titulo="Valoración de la atención" text="Opinión registrada por el paciente después de la consulta." width="550px" icon={<span className={styles.headerIcon} aria-hidden="true"><Star size={21} aria-hidden="true" /></span>}>
            <div className={styles.content}>
                <section className={styles.rating} aria-label="Puntuación recibida">
                    <span>Puntuación recibida</span>
                    <EstrellasCalificacion value={calificacion?.puntuacion} readOnly />
                </section>
                <section className={styles.comment} aria-labelledby="doctor-rating-comment-title">
                    <div><MessageSquareText size={18} aria-hidden="true" /><h3 id="doctor-rating-comment-title">Comentario</h3></div>
                    <p>{calificacion?.comentario?.trim() || "El paciente no dejó un comentario."}</p>
                </section>
                <p className={styles.date}>
                    <CalendarClock size={17} aria-hidden="true" />
                    Registrada el {formatCalificacionDate(calificacion?.fecha_creacion)}
                </p>
                <p className={styles.notice}>Esta valoración es de solo lectura y no puede modificarse desde el perfil médico.</p>
            </div>
        </Modal>
    );
}
