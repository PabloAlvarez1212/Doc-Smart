"use client";

import Image from "next/image";
import { Building2, MapPin, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import Modal from "../../../ui/Modal/Modal";
import RatingsPanel from "../../../ui/MedicalRatings/RatingsPanel/RatingsPanel";
import useCalificacionesMedico from "../../../hooks/useCalificacionesMedico";
import styles from "./DoctorProfileModal.module.css";

export default function DoctorProfileModal({ doctor, onClose }) {
    const abierto = Boolean(doctor);
    const { resumen, calificaciones, loading, error, retry } = useCalificacionesMedico(doctor?.id, {
        incluirResenas: true,
        activo: abierto,
    });
    const nombre = [doctor?.nombre, doctor?.apellido].filter(Boolean).join(" ") || "Profesional de DocSmart";
    const ubicacion = [doctor?.ciudad, doctor?.departamento].filter(Boolean).join(", ");

    return (
        <Modal headerVariant="white" abierto={abierto} onCerrar={onClose} titulo="Perfil del médico" text="Información profesional y valoración general." width="660px" icon={<UserRound size={23} aria-hidden="true" />}>
            <div className={styles.content}>
                <section className={styles.identity} aria-label={`Perfil de ${nombre}`}>
                    <Image src={doctor?.foto_perfil || "/images/foto_default.png"} alt={`Foto de perfil de ${nombre}`} width={82} height={82} />
                    <div>
                        <span><Stethoscope size={15} aria-hidden="true" />{doctor?.especialidad || "Especialidad no especificada"}</span>
                        <h3>{nombre}</h3>
                        {ubicacion && <p><MapPin size={15} aria-hidden="true" />{ubicacion}</p>}
                        {doctor?.direccion && <p><Building2 size={15} aria-hidden="true" />{doctor.direccion}</p>}
                    </div>
                </section>

                <RatingsPanel
                    resumen={resumen}
                    calificaciones={calificaciones}
                    loading={loading}
                    error={error}
                    onRetry={retry}
                    reviewsTitle="Opiniones de pacientes"
                    reviewsDescription="Experiencias que otros pacientes decidieron compartir."
                    emptyReviewsMessage="Este médico todavía no tiene opiniones públicas."
                />

                <p className={styles.privacyNote}>
                    <ShieldCheck size={17} aria-hidden="true" />
                    Solo se muestran opiniones que el paciente autorizó expresamente como públicas.
                </p>
            </div>
        </Modal>
    );
}
