"use client";

import Image from "next/image";
import { Award, BadgeCheck, Building2, CalendarCheck2, Mail, MapPin, Phone, ShieldCheck, Stethoscope, UserRound, Users } from "lucide-react";
import Modal from "../../../ui/Modal/Modal";
import RatingsPanel from "../../../ui/MedicalRatings/RatingsPanel/RatingsPanel";
import useCalificacionesMedico from "../../../hooks/useCalificacionesMedico";
import styles from "./DoctorProfileModal.module.css";

function mesYAnio(fecha) {
    if (!fecha) return "Sin fecha";
    const fechaValida = new Date(fecha);
    if (Number.isNaN(fechaValida.getTime())) return "Sin fecha";
    return new Intl.DateTimeFormat("es-CO", { month: "short", year: "numeric" }).format(fechaValida);
}

export default function DoctorProfileModal({ doctor, onClose }) {
    const abierto = Boolean(doctor);
    const { resumen, calificaciones, loading, error, retry } = useCalificacionesMedico(doctor?.id, {
        incluirResenas: true,
        activo: abierto,
    });
    const nombre = [doctor?.nombre, doctor?.apellido].filter(Boolean).join(" ") || "Profesional de DocSmart";
    const ubicacion = [doctor?.ciudad, doctor?.departamento].filter(Boolean).join(", ");
    const anios = doctor?.anios_experiencia;
    const atendidos = doctor?.pacientes_atendidos ?? 0;

    return (
        <Modal headerVariant="white" abierto={abierto} onCerrar={onClose} titulo="Perfil del médico" text="Información profesional y valoración general." width="680px" icon={<UserRound size={23} aria-hidden="true" />}>
            <div className={styles.content}>
                <section className={styles.identity} aria-label={`Perfil de ${nombre}`}>
                    <Image src={doctor?.foto_perfil || "/images/foto_default.png"} alt={`Foto de perfil de ${nombre}`} width={82} height={82} />
                    <div>
                        <span><Stethoscope size={15} aria-hidden="true" />{doctor?.especialidad || "Especialidad no especificada"}</span>
                        <h3>{nombre}</h3>
                        {doctor?.verificado && <strong className={styles.verified}><BadgeCheck size={15} aria-hidden="true" />Médico verificado por DocSmart</strong>}
                        {ubicacion && <p><MapPin size={15} aria-hidden="true" />{ubicacion}</p>}
                        {doctor?.direccion && <p><Building2 size={15} aria-hidden="true" />{doctor.direccion}</p>}
                    </div>
                </section>

                <dl className={styles.stats} aria-label="Datos del médico">
                    <div><span aria-hidden="true"><Award size={18} /></span><dt>Experiencia</dt><dd>{anios != null ? `${anios} ${anios === 1 ? "año" : "años"}` : "Sin registrar"}</dd></div>
                    <div><span aria-hidden="true"><Users size={18} /></span><dt>Pacientes atendidos</dt><dd>{atendidos}</dd></div>
                    <div><span aria-hidden="true"><CalendarCheck2 size={18} /></span><dt>Miembro desde</dt><dd className={styles.capital}>{mesYAnio(doctor?.miembro_desde)}</dd></div>
                </dl>

                <section className={styles.block} aria-labelledby="doctor-sobre">
                    <h4 id="doctor-sobre">Sobre el médico</h4>
                    {doctor?.presentacion
                        ? <p className={styles.about}>{doctor.presentacion}</p>
                        : <p className={styles.empty}>Este médico todavía no ha escrito su presentación.</p>}
                </section>

                <section className={styles.block} aria-labelledby="doctor-contacto">
                    <h4 id="doctor-contacto">Contacto</h4>
                    <ul className={styles.contact}>
                        <li>
                            <span aria-hidden="true"><Mail size={17} /></span>
                            <div><small>Correo</small>{doctor?.correo ? <a href={`mailto:${doctor.correo}`}>{doctor.correo}</a> : <em>Sin correo</em>}</div>
                        </li>
                        <li>
                            <span aria-hidden="true"><Phone size={17} /></span>
                            <div><small>Teléfono</small>{doctor?.telefono ? <a href={`tel:${doctor.telefono}`}>{doctor.telefono}</a> : <em>Sin teléfono</em>}</div>
                        </li>
                    </ul>
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
