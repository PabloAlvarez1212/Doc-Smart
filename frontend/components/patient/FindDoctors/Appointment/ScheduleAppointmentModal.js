"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
    CalendarCheck2,
    CalendarX2,
    CheckCircle2,
    Clock3,
    Stethoscope
} from "lucide-react";

import Button from "../../../ui/Button/Button";
import Modal from "../../../ui/Modal/Modal";

import {
    obtenerHorariosDisponiblesMedicoService
} from "../../../../src/app/services/doctorServices";

import {
    registrarCitaService
} from "../../../../src/app/services/appointmentsServices";

import styles from "./ScheduleAppointmentModal.module.css";

const INITIAL_FORM = {
    date: "",
    time: "",
    reason: ""
};

export default function ScheduleAppointmentModal({
    doctor,
    onClose
}) {

    const [form, setForm] = useState(INITIAL_FORM);
    const [confirmation, setConfirmation] = useState(null);

    const [slots, setSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [errorSlots, setErrorSlots] = useState("");

    const [guardandoCita, setGuardandoCita] = useState(false);
    const [errorCita, setErrorCita] = useState("");
    
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
            time: ""
        }));

        setSlots([]);
        setErrorSlots("");

        if (!date || !doctor?.id) {
            return;
        }

        try {
            setLoadingSlots(true);

            const response =
                await obtenerHorariosDisponiblesMedicoService(
                    doctor.id,
                    date
                );

            const data = response?.data ?? response;

            setSlots(data?.horarios ?? []);

        } catch (error) {
            console.error(
                "Error cargando horarios disponibles:",
                error
            );

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

        if (!canConfirm || guardandoCita) {
            return;
        }

        setErrorCita("");
        setGuardandoCita(true);

        try {
            const fechaProgramada =
                `${form.date}T${form.time}:00-05:00`;

            await registrarCitaService({
                id_medico: doctor.id,
                fecha_programada: fechaProgramada,
                motivo: form.reason.trim(),
            });

            setConfirmation({
                date: form.date,
                time: form.time,
                reason: form.reason.trim(),
            });

        } catch (error) {
            console.error(
                "Error registrando cita:",
                error
            );

            const mensaje =
                error?.response?.data?.mensaje ||
                error?.response?.data?.detail ||
                "No fue posible agendar la cita.";

            setErrorCita(mensaje);

            // Volvemos a consultar la disponibilidad porque
            // el horario pudo haber sido tomado por otro paciente.
            if (form.date) {
                try {
                    const response =
                        await obtenerHorariosDisponiblesMedicoService(
                            doctor.id,
                            form.date
                        );

                    const data =
                        response?.data ?? response;

                    setSlots(data?.horarios ?? []);

                } catch (refreshError) {
                    console.error(
                        "Error actualizando horarios:",
                        refreshError
                    );
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

    const fotoPerfil =
        doctor.foto_perfil ||
        doctor.fotoPerfil ||
        "/images/foto_default.png";

    return (
        <Modal
            abierto={Boolean(doctor)}
            onCerrar={closeModal}
            titulo={
                confirmation
                    ? "Resumen de cita"
                    : "Agendar cita"
            }
        >
            {confirmation ? (

                <div
                    className={styles.confirmation}
                    role="status"
                >
                    <span className={styles.confirmationIcon}>
                        <CheckCircle2 size={34} />
                    </span>

                    <p className={styles.kicker}>
                        Cita agendada
                    </p>

                    <h3>
                        Tu cita fue agendada correctamente
                    </h3>

                    <p className={styles.confirmationText}>
                        La cita fue registrada exitosamente.
                        Puedes consultarla en Mis citas.
                    </p>

                    <div className={styles.summaryCard}>
                        <strong>{fullName}</strong>

                        <span>
                            {doctor.especialidad}
                        </span>

                        <dl>
                            <div>
                                <dt>Fecha</dt>
                                <dd>
                                    {confirmation.date}
                                </dd>
                            </div>

                            <div>
                                <dt>Hora</dt>
                                <dd>
                                    {confirmation.time}
                                </dd>
                            </div>

                            <div>
                                <dt>Motivo</dt>
                                <dd>
                                    {confirmation.reason}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    <div
                        className={
                            styles.confirmationActions
                        }
                    >
                        <Button
                            variant="secundary"
                            onClick={() =>
                                setConfirmation(null)
                            }
                        >
                            Modificar datos
                        </Button>

                        <Button onClick={closeModal}>
                            Cerrar
                        </Button>
                    </div>
                </div>

            ) : (

                <form
                    className={styles.form}
                    onSubmit={submitAppointment}
                >

                    <div className={styles.doctor}>
                        <Image
                            src={fotoPerfil}
                            width={64}
                            height={64}
                            alt={`Foto de perfil de ${fullName}`}
                        />

                        <div>
                            <span>
                                <Stethoscope size={14} />
                                {doctor.especialidad}
                            </span>

                            <strong>
                                {fullName}
                            </strong>

                            <small>
                                {
                                    [
                                        doctor.ciudad,
                                        doctor.departamento
                                    ]
                                        .filter(Boolean)
                                        .join(", ")
                                }
                            </small>
                        </div>
                    </div>

                    <label className={styles.field}>
                        <span>Fecha de la cita</span>

                        <input
                            type="date"
                            value={form.date}
                            onChange={(event) =>
                                updateDate(event.target.value)
                            }
                            required
                        />

                        <small>
                            Selecciona una fecha para consultar los horarios
                            disponibles del médico.
                        </small>
                    </label>

                    <fieldset className={styles.slotFieldset}>
                        <legend>Horario</legend>

                        {!form.date ? (
                            <div className={styles.guidance}>
                                <CalendarCheck2 size={20} />
                                Selecciona primero una fecha.
                            </div>

                        ) : loadingSlots ? (
                            <div className={styles.guidance}>
                                <Clock3 size={20} />
                                Consultando horarios disponibles...
                            </div>

                        ) : errorSlots ? (
                            <div
                                className={styles.noAvailability}
                                role="alert"
                            >
                                <CalendarX2
                                    size={22}
                                    aria-hidden="true"
                                />

                                <div>
                                    <strong>
                                        No fue posible consultar la disponibilidad.
                                    </strong>

                                    <p>{errorSlots}</p>
                                </div>
                            </div>

                        ) : slots.length === 0 ? (
                            <div
                                className={styles.noAvailability}
                                role="status"
                            >
                                <CalendarX2
                                    size={22}
                                    aria-hidden="true"
                                />

                                <div>
                                    <strong>
                                        No hay horarios disponibles para esta fecha.
                                    </strong>
                                </div>
                            </div>

                        ) : (
                            <>
                                <div className={styles.slotLegend}>
                                    <span>
                                        <i className={styles.availableDot} />
                                        Disponible
                                    </span>
                                </div>

                                <div className={styles.slots}>
                                    {slots.map((slot) => (
                                        <button
                                            type="button"
                                            key={`${slot.hora_inicio}-${slot.hora_fin}`}
                                            className={`
                                                ${styles.slot}
                                                ${
                                                    form.time === slot.hora_inicio
                                                        ? styles.selected
                                                        : ""
                                                }
                                            `}
                                            aria-pressed={
                                                form.time === slot.hora_inicio
                                            }
                                            onClick={() =>
                                                setForm((current) => ({
                                                    ...current,
                                                    time: slot.hora_inicio
                                                }))
                                            }
                                        >
                                            <Clock3
                                                size={14}
                                                aria-hidden="true"
                                            />

                                            {slot.hora_inicio}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </fieldset>

                    <label className={styles.field}>
                        <span>
                            Motivo de consulta
                        </span>

                        <textarea
                            rows={4}
                            maxLength={500}
                            value={form.reason}
                            placeholder="Ejemplo: dolor en el pecho desde hace varios días."
                            onChange={(event) =>
                                setForm(
                                    (current) => ({
                                        ...current,
                                        reason:
                                            event.target.value
                                    })
                                )
                            }
                            required
                        />

                        <small
                            className={
                                styles.characterCount
                            }
                        >
                            {form.reason.length}/500
                        </small>
                    </label>

                    {errorCita && (
                        <div
                            className={styles.noAvailability}
                            role="alert"
                        >
                            <CalendarX2
                                size={22}
                                aria-hidden="true"
                            />

                            <div>
                                <strong>
                                    No fue posible agendar la cita.
                                </strong>

                                <p>{errorCita}</p>
                            </div>
                        </div>
                    )}


                    <div className={styles.actions}>
                        <Button
                            variant="secundary"
                            className={styles.cancel}
                            type="button"
                            onClick={closeModal}
                        >
                            Cancelar
                        </Button>

                        <Button
                            type="submit"
                            disabled={!canConfirm || guardandoCita}
                        >
                            {guardandoCita
                                ? "Agendando..."
                                : "Confirmar cita"}
                        </Button>
                    </div>

                </form>
            )}
        </Modal>
    );
}