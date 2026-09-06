"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { CalendarCheck2, CalendarX2, CheckCircle2, Clock3, Stethoscope } from "lucide-react";
import Button from "../../../ui/Button/Button";
import Modal from "../../../ui/Modal/Modal";
import {
    MOCK_MAX_DATE,
    MOCK_MIN_DATE,
    findNextAvailableDate,
    formatAppointmentDate,
    generateMockSlots,
} from "./appointmentMockUtils";
import styles from "./ScheduleAppointmentModal.module.css";

const INITIAL_FORM = { date: "", time: "", reason: "" };

export default function ScheduleAppointmentModal({ doctor, onClose }) {
    const [form, setForm] = useState(INITIAL_FORM);
    const [confirmation, setConfirmation] = useState(null);

    useEffect(() => {
        setForm(INITIAL_FORM);
        setConfirmation(null);
    }, [doctor?.id]);

    const slots = useMemo(
        () => generateMockSlots(doctor, form.date),
        [doctor, form.date]
    );
    const nextAvailableDate = useMemo(
        () => form.date && slots.length === 0
            ? findNextAvailableDate(doctor, form.date)
            : null,
        [doctor, form.date, slots.length]
    );
    const availableSlotCount = slots.filter((slot) => !slot.ocupado).length;
    const selectedSlotIsAvailable = slots.some(
        (slot) => slot.hora === form.time && !slot.ocupado
    );
    const dateIsValid = form.date >= MOCK_MIN_DATE && form.date <= MOCK_MAX_DATE;
    const canConfirm = Boolean(
        dateIsValid && selectedSlotIsAvailable && form.reason.trim()
    );

    const updateDate = (date) => {
        setForm((current) => ({ ...current, date, time: "" }));
    };

    const closeModal = () => {
        setForm(INITIAL_FORM);
        setConfirmation(null);
        onClose();
    };

    const submitMockAppointment = (event) => {
        event.preventDefault();
        if (!canConfirm) return;

        setConfirmation({
            date: form.date,
            time: form.time,
            reason: form.reason.trim(),
        });
    };

    return (
        <Modal
            abierto={Boolean(doctor)}
            onCerrar={closeModal}
            titulo={confirmation ? "Resumen de cita" : "Agendar cita"}
        >
            {doctor && (confirmation ? (
                <div className={styles.confirmation} role="status">
                    <span className={styles.confirmationIcon}><CheckCircle2 size={34} /></span>
                    <p className={styles.kicker}>Simulación completada</p>
                    <h3>Tu cita está lista para confirmar</h3>
                    <p className={styles.confirmationText}>
                        Este es un resumen visual. Ninguna cita fue creada o guardada.
                    </p>
                    <div className={styles.summaryCard}>
                        <strong>{doctor.nombre}</strong>
                        <span>{doctor.especialidad}</span>
                        <dl>
                            <div><dt>Fecha</dt><dd>{formatAppointmentDate(confirmation.date)}</dd></div>
                            <div><dt>Hora</dt><dd>{confirmation.time}</dd></div>
                            <div><dt>Motivo</dt><dd>{confirmation.reason}</dd></div>
                        </dl>
                    </div>
                    <div className={styles.confirmationActions}>
                        <Button variant="secundary" onClick={() => setConfirmation(null)}>Modificar datos</Button>
                        <Button onClick={closeModal}>Cerrar</Button>
                    </div>
                </div>
            ) : (
                <form className={styles.form} onSubmit={submitMockAppointment}>
                    <div className={styles.doctor}>
                        <Image
                            src={doctor.fotoPerfil}
                            width={64}
                            height={64}
                            alt={`Foto de perfil de ${doctor.nombre}`}
                        />
                        <div>
                            <span><Stethoscope size={14} />{doctor.especialidad}</span>
                            <strong>{doctor.nombre}</strong>
                            <small>{doctor.ciudad}, {doctor.departamento}</small>
                        </div>
                    </div>

                    <label className={styles.field}>
                        <span>Fecha de la cita</span>
                        <input
                            type="date"
                            min={MOCK_MIN_DATE}
                            max={MOCK_MAX_DATE}
                            value={form.date}
                            onChange={(event) => updateDate(event.target.value)}
                            required
                        />
                        <small>Selecciona una fecha entre el 5 de septiembre y el 4 de noviembre de 2026.</small>
                    </label>

                    <fieldset className={styles.slotFieldset}>
                        <legend>Horario</legend>
                        {!form.date ? (
                            <div className={styles.guidance}><CalendarCheck2 size={20} />Selecciona primero una fecha.</div>
                        ) : slots.length === 0 ? (
                            <div className={styles.noAvailability} role="status">
                                <CalendarX2 size={22} aria-hidden="true" />
                                <div>
                                    <strong>No hay disponibilidad para esta fecha.</strong>
                                    {nextAvailableDate && (
                                        <button type="button" onClick={() => updateDate(nextAvailableDate)}>
                                            Ver {formatAppointmentDate(nextAvailableDate)}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className={styles.slotLegend}>
                                    <span><i className={styles.availableDot} />Disponible</span>
                                    <span><i className={styles.occupiedDot} />Ocupado</span>
                                </div>
                                <div className={styles.slots}>
                                    {slots.map((slot) => (
                                        <button
                                            type="button"
                                            key={slot.hora}
                                            className={`${styles.slot} ${slot.ocupado ? styles.occupied : ""} ${form.time === slot.hora ? styles.selected : ""}`}
                                            disabled={slot.ocupado}
                                            aria-pressed={form.time === slot.hora}
                                            onClick={() => setForm((current) => ({ ...current, time: slot.hora }))}
                                        >
                                            <Clock3 size={14} aria-hidden="true" />
                                            {slot.hora}
                                            {slot.ocupado && <small>Ocupado</small>}
                                        </button>
                                    ))}
                                </div>
                                {availableSlotCount === 0 && <p className={styles.allOccupied}>Todos los horarios de esta fecha están ocupados.</p>}
                            </>
                        )}
                    </fieldset>

                    <label className={styles.field}>
                        <span>Motivo de consulta</span>
                        <textarea
                            rows={4}
                            maxLength={500}
                            value={form.reason}
                            placeholder="Ejemplo: dolor en el pecho desde hace varios días."
                            onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                            required
                        />
                        <small className={styles.characterCount}>{form.reason.length}/500</small>
                    </label>

                    <div className={styles.actions}>
                        <Button variant="secundary" className={styles.cancel} onClick={closeModal}>Cancelar</Button>
                        <Button type="submit" disabled={!canConfirm}>Confirmar cita</Button>
                    </div>
                </form>
            ))}
        </Modal>
    );
}
