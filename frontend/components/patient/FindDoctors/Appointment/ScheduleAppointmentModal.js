"use client";

import { obtenerPrimerError } from "@/app/utils/errrorUtils";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
    CalendarCheck2,
    CalendarDays,
    CalendarX2,
    CheckCircle2,
    Clock3,
    LoaderCircle,
    MapPin,
    MessageSquareText,
    Stethoscope,
} from "lucide-react";

import Button from "../../../ui/Button/Button";
import Modal from "../../../ui/Modal/Modal";
import { obtenerHorariosDisponiblesMedicoService } from "../../../../src/app/services/doctorServices";
import { registrarCitaService } from "../../../../src/app/services/appointmentsServices";
import { getBogotaDateInputValue } from "../../../ui/AppointmentCard/appointmentViewState";
import styles from "./ScheduleAppointmentModal.module.css";

const INITIAL_FORM = {
    date: "",
    time: "",
    reason: "",
};

const SLOT_SKELETONS = Array.from({ length: 8 }, (_, index) => index);

export default function ScheduleAppointmentModal({ doctor, onClose }) {
    const [form, setForm] = useState(INITIAL_FORM);
    const [confirmation, setConfirmation] = useState(null);
    const [slots, setSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [errorSlots, setErrorSlots] = useState("");
    const [guardandoCita, setGuardandoCita] = useState(false);
    const [errorCita, setErrorCita] = useState("");
    const dateInputRef = useRef(null);

    useEffect(() => {
        setForm(INITIAL_FORM);
        setConfirmation(null);
        setSlots([]);
        setErrorSlots("");
        setErrorCita("");
        setGuardandoCita(false);
    }, [doctor?.id]);

    const selectedSlotIsAvailable = slots.some(
        (slot) => slot.hora_inicio === form.time
    );

    const canConfirm = Boolean(
        form.date &&
        selectedSlotIsAvailable &&
        form.reason.trim()
    );

    const updateDate = async (date) => {
        setForm((current) => ({
            ...current,
            date,
            time: "",
        }));
        setSlots([]);
        setErrorSlots("");

        if (!date || !doctor?.id) return;

        try {
            setLoadingSlots(true);

            const response = await obtenerHorariosDisponiblesMedicoService(
                doctor.id,
                date
            );
            const data = response?.data ?? response;

            setSlots(data?.horarios ?? []);
        } catch {
            setSlots([]);
            setErrorSlots(
                "No fue posible cargar los horarios disponibles."
            );
        } finally {
            setLoadingSlots(false);
        }
    };

    const closeModal = () => {
        setForm(INITIAL_FORM);
        setConfirmation(null);
        onClose();
    };

    const submitAppointment = async (event) => {
        event.preventDefault();

        if (!canConfirm || guardandoCita) return;

        setErrorCita("");
        setGuardandoCita(true);

        try {
            const fechaProgramada = `${form.date}T${form.time}:00-05:00`;

            await registrarCitaService({
                id_medico: doctor.id,
                fecha_programada: fechaProgramada,
                motivo_consulta: form.reason.trim(),
            });

            setConfirmation({
                date: form.date,
                time: form.time,
                reason: form.reason.trim(),
            });
        } catch (error) {
            const responseData = error?.response?.data;
            const message =
                responseData?.mensaje ||
                responseData?.detail ||
                obtenerPrimerError(responseData) ||
                "No fue posible agendar la cita.";

            setErrorCita(message);

            if (form.date) {
                try {
                    const response =
                        await obtenerHorariosDisponiblesMedicoService(
                            doctor.id,
                            form.date
                        );
                    const data = response?.data ?? response;

                    setSlots(data?.horarios ?? []);
                } catch {
                    setSlots([]);
                }
            }
        } finally {
            setGuardandoCita(false);
        }
    };

    if (!doctor) {
        return (
            <Modal
                abierto={false}
                onCerrar={closeModal}
                titulo="Agendar cita"
            />
        );
    }

    const fullName =
        [doctor.nombre, doctor.apellido]
            .filter(Boolean)
            .join(" ") || "Médico";

    const location = [doctor.ciudad, doctor.departamento]
        .filter(Boolean)
        .join(", ");

    const fotoPerfil =
        doctor.foto_perfil ||
        doctor.fotoPerfil ||
        "/images/foto_default.png";

    const modalFooter = confirmation ? null : (
        <div className={styles.footerContent}>
            <p className={styles.footerStatus} aria-live="polite">
                {canConfirm
                    ? "Todo listo para confirmar"
                    : "Completa la fecha, el horario y el motivo"}
            </p>

            <div className={styles.footerActions}>
                <Button
                    variant="secundary"
                    className={styles.cancelButton}
                    type="button"
                    onClick={closeModal}
                >
                    Cancelar
                </Button>

                <Button
                    className={styles.confirmButton}
                    type="submit"
                    form="schedule-appointment-form"
                    disabled={!canConfirm || guardandoCita}
                >
                    {guardandoCita && (
                        <LoaderCircle
                            className={styles.loadingIcon}
                            size={17}
                            aria-hidden="true"
                        />
                    )}
                    {guardandoCita ? "Agendando..." : "Confirmar cita"}
                </Button>
            </div>
        </div>
    );

    return (
        <Modal
            abierto={Boolean(doctor)}
            headerVariant="white"
            onCerrar={closeModal}
            titulo={confirmation ? "Cita agendada" : "Agenda tu cita médica"}
            text={
                confirmation
                    ? "Revisa los datos de la cita que acabas de registrar."
                    : "Elige una fecha y un horario disponible para este profesional."
            }
            icon={
                confirmation
                    ? <CheckCircle2 size={25} aria-hidden="true" />
                    : <CalendarCheck2 size={25} aria-hidden="true" />
            }
            width="820px"
            footer={modalFooter}
            initialFocusRef={dateInputRef}
        >
            {confirmation ? (
                <div className={styles.confirmation} role="status">
                    <span className={styles.confirmationIcon} aria-hidden="true">
                        <CheckCircle2 size={32} />
                    </span>

                    <h3>Tu cita quedó registrada</h3>
                    <p className={styles.confirmationText}>
                        Puedes consultar su estado y seguimiento desde Mis citas.
                    </p>

                    <div className={styles.summaryCard}>
                        <div className={styles.summaryDoctor}>
                            <Image
                                src={fotoPerfil}
                                width={48}
                                height={48}
                                alt=""
                            />
                            <div>
                                <strong>{fullName}</strong>
                                <span>{doctor.especialidad}</span>
                            </div>
                        </div>

                        <dl>
                            <div>
                                <dt>Fecha</dt>
                                <dd>{confirmation.date}</dd>
                            </div>
                            <div>
                                <dt>Hora</dt>
                                <dd>{confirmation.time}</dd>
                            </div>
                            <div className={styles.summaryReason}>
                                <dt>Motivo</dt>
                                <dd>{confirmation.reason}</dd>
                            </div>
                        </dl>
                    </div>

                    <div className={styles.confirmationActions}>
                        <Button
                            variant="secundary"
                            className={styles.secondaryAction}
                            onClick={() => setConfirmation(null)}
                        >
                            Agendar otra cita
                        </Button>
                        <Button
                            className={styles.primaryAction}
                            onClick={closeModal}
                        >
                            Cerrar
                        </Button>
                    </div>
                </div>
            ) : (
                <form
                    id="schedule-appointment-form"
                    className={styles.form}
                    onSubmit={submitAppointment}
                >
                    <section className={styles.doctor} aria-label="Profesional seleccionado">
                        <div className={styles.doctorPhoto}>
                            <Image
                                src={fotoPerfil}
                                width={68}
                                height={68}
                                alt={`Foto de perfil de ${fullName}`}
                            />
                        </div>

                        <div className={styles.doctorInfo}>
                            <span className={styles.doctorContext}>
                                Tu cita será con
                            </span>
                            <strong>{fullName}</strong>
                            <span className={styles.specialty}>
                                <Stethoscope size={14} aria-hidden="true" />
                                {doctor.especialidad || "Especialidad no especificada"}
                            </span>
                            {location && (
                                <small>
                                    <MapPin size={14} aria-hidden="true" />
                                    {location}
                                </small>
                            )}
                        </div>
                    </section>

                    <div className={styles.bookingLayout}>
                        <section className={styles.schedulePanel}>
                            <header className={styles.sectionHeading}>
                                <span aria-hidden="true">
                                    <CalendarDays size={19} />
                                </span>
                                <div>
                                    <h3>Fecha y horario</h3>
                                    <p>Consulta la disponibilidad real del médico.</p>
                                </div>
                            </header>

                            <label className={styles.field}>
                                <span>Fecha de la cita</span>
                                <input
                                    ref={dateInputRef}
                                    type="date"
                                    min={getBogotaDateInputValue()}
                                    value={form.date}
                                    onChange={(event) =>
                                        updateDate(event.target.value)
                                    }
                                    required
                                />
                                <small>
                                    Al elegir una fecha consultaremos los horarios disponibles.
                                </small>
                            </label>

                            <fieldset
                                className={styles.slotFieldset}
                                aria-live="polite"
                                aria-busy={loadingSlots}
                            >
                                <legend className={styles.visuallyHidden}>
                                    Horarios disponibles
                                </legend>
                                <div className={styles.slotHeading}>
                                    <span className={styles.slotTitle}>
                                        Horarios disponibles
                                    </span>
                                    {!loadingSlots && slots.length > 0 && (
                                        <span>
                                            {slots.length} {slots.length === 1 ? "opción" : "opciones"}
                                        </span>
                                    )}
                                </div>

                                {!form.date ? (
                                    <div className={styles.guidance}>
                                        <CalendarCheck2 size={21} aria-hidden="true" />
                                        <div>
                                            <strong>Elige una fecha</strong>
                                            <p>Los horarios aparecerán aquí.</p>
                                        </div>
                                    </div>
                                ) : loadingSlots ? (
                                    <div className={styles.slotSkeletons} role="status">
                                        <span className={styles.visuallyHidden}>
                                            Consultando horarios disponibles
                                        </span>
                                        {SLOT_SKELETONS.map((item) => (
                                            <i key={item} aria-hidden="true" />
                                        ))}
                                    </div>
                                ) : errorSlots ? (
                                    <div className={`${styles.availabilityState} ${styles.errorState}`} role="alert">
                                        <CalendarX2 size={22} aria-hidden="true" />
                                        <div>
                                            <strong>No pudimos consultar la disponibilidad</strong>
                                            <p>{errorSlots}</p>
                                            <button
                                                type="button"
                                                onClick={() => updateDate(form.date)}
                                            >
                                                Intentar nuevamente
                                            </button>
                                        </div>
                                    </div>
                                ) : slots.length === 0 ? (
                                    <div className={styles.availabilityState} role="status">
                                        <CalendarX2 size={22} aria-hidden="true" />
                                        <div>
                                            <strong>Sin horarios para esta fecha</strong>
                                            <p>Selecciona otro día para continuar.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={styles.slots}>
                                        {slots.map((slot) => {
                                            const selected = form.time === slot.hora_inicio;

                                            return (
                                                <button
                                                    type="button"
                                                    key={`${slot.hora_inicio}-${slot.hora_fin}`}
                                                    className={`${styles.slot} ${selected ? styles.selected : ""}`}
                                                    aria-pressed={selected}
                                                    onClick={() =>
                                                        setForm((current) => ({
                                                            ...current,
                                                            time: slot.hora_inicio,
                                                        }))
                                                    }
                                                >
                                                    {selected ? (
                                                        <CheckCircle2 size={15} aria-hidden="true" />
                                                    ) : (
                                                        <Clock3 size={15} aria-hidden="true" />
                                                    )}
                                                    {slot.hora_inicio}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </fieldset>
                        </section>

                        <section className={styles.detailsPanel}>
                            <header className={styles.sectionHeading}>
                                <span aria-hidden="true">
                                    <MessageSquareText size={19} />
                                </span>
                                <div>
                                    <h3>Motivo de consulta</h3>
                                    <p>Ayuda al médico a prepararse para la atención.</p>
                                </div>
                            </header>

                            <label className={styles.field}>
                                <span>Describe brevemente el motivo</span>
                                <textarea
                                    rows={5}
                                    maxLength={500}
                                    value={form.reason}
                                    placeholder="Ejemplo: dolor en el pecho desde hace varios días."
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            reason: event.target.value,
                                        }))
                                    }
                                    required
                                />
                                <small className={styles.characterCount}>
                                    {form.reason.length}/500
                                </small>
                            </label>

                            <aside className={styles.selectionSummary} aria-label="Resumen de selección">
                                <h3>Tu selección</h3>
                                <dl>
                                    <div>
                                        <dt>
                                            <CalendarDays size={16} aria-hidden="true" />
                                            Fecha
                                        </dt>
                                        <dd>{form.date || "Por seleccionar"}</dd>
                                    </div>
                                    <div>
                                        <dt>
                                            <Clock3 size={16} aria-hidden="true" />
                                            Hora
                                        </dt>
                                        <dd>{form.time || "Por seleccionar"}</dd>
                                    </div>
                                </dl>
                            </aside>
                        </section>
                    </div>

                    {errorCita && (
                        <div className={`${styles.availabilityState} ${styles.errorState}`} role="alert">
                            <CalendarX2 size={22} aria-hidden="true" />
                            <div>
                                <strong>No fue posible agendar la cita</strong>
                                <p>{errorCita}</p>
                            </div>
                        </div>
                    )}
                </form>
            )}
        </Modal>
    );
}
