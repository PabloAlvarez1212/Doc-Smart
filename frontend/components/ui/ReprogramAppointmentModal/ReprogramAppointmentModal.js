"use client";

import { CalendarClock, CalendarDays, Clock3, LoaderCircle, Stethoscope, UserRound } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { obtenerHorariosDisponiblesMedicoService } from "@/app/services/doctorServices";
import formatearFecha from "@/app/utils/fechaFormaterUtils";
import { obtenerPrimerError } from "@/app/utils/errrorUtils";
import {
    buildBogotaAppointmentDateTime,
    canSubmitReprogram,
    getBogotaDateInputValue,
} from "../AppointmentCard/appointmentViewState";
import Modal from "../Modal/Modal";
import styles from "./ReprogramAppointmentModal.module.css";

function extractSlots(response) {
    const slots = response?.data?.horarios;
    if (!Array.isArray(slots)) throw new Error("Formato de horarios inválido");
    return slots;
}

export default function ReprogramAppointmentModal({
    abierto,
    onCerrar,
    onExitComplete,
    cita,
    reprogramarCita,
    counterpart = "medico",
}) {
    const dateId = useId();
    const timeId = useId();
    const submitLock = useRef(false);
    const [fecha, setFecha] = useState("");
    const [hora, setHora] = useState("");
    const [horarios, setHorarios] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");

    const medicoId = cita?.id_medico;
    const citaId = cita?.id;

    useEffect(() => {
        if (!abierto) return;
        setFecha("");
        setHora("");
        setHorarios([]);
        setError("");
        setGuardando(false);
        submitLock.current = false;
    }, [abierto, citaId]);

    useEffect(() => {
        const controller = new AbortController();
        setHora("");
        setHorarios([]);
        setError("");

        if (!abierto || !fecha) {
            setCargando(false);
            return () => controller.abort();
        }

        if (!medicoId || !citaId) {
            setError("No fue posible identificar la cita seleccionada.");
            return () => controller.abort();
        }

        setCargando(true);
        obtenerHorariosDisponiblesMedicoService(medicoId, fecha, citaId, controller.signal)
            .then((response) => setHorarios(extractSlots(response)))
            .catch((requestError) => {
                if (requestError?.code === "ERR_CANCELED") return;
                setError(
                    obtenerPrimerError(requestError.response?.data?.errores) ||
                    "No se pudieron consultar los horarios disponibles."
                );
            })
            .finally(() => {
                if (!controller.signal.aborted) setCargando(false);
            });

        return () => controller.abort();
    }, [abierto, fecha, medicoId, citaId]);

    const cerrar = () => {
        if (!guardando) onCerrar();
    };

    const handleExitComplete = () => {
        setFecha("");
        setHora("");
        setHorarios([]);
        setError("");
        onExitComplete?.();
    };

    const refreshSlots = async () => {
        if (!medicoId || !fecha || !citaId) return;
        setCargando(true);
        try {
            const response = await obtenerHorariosDisponiblesMedicoService(
                medicoId,
                fecha,
                citaId
            );
            setHorarios(extractSlots(response));
        } catch {
            setHorarios([]);
        } finally {
            setCargando(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const canSubmit = canSubmitReprogram({ fecha, hora, horarios, cargando, guardando });
        if (!canSubmit || submitLock.current) return;

        submitLock.current = true;
        setGuardando(true);
        setError("");

        try {
            await reprogramarCita(
                citaId,
                buildBogotaAppointmentDateTime(fecha, hora)
            );
            onCerrar();
        } catch (requestError) {
            setHora("");
            setError(
                obtenerPrimerError(requestError.response?.data?.errores) ||
                "No se pudo reprogramar la cita. Revisa el horario e intenta nuevamente."
            );
            await refreshSlots();
        } finally {
            submitLock.current = false;
            setGuardando(false);
        }
    };

    const currentDate = cita?.fecha_programada
        ? formatearFecha(cita.fecha_programada)
        : null;
    const counterpartName = counterpart === "paciente" ? cita?.paciente : cita?.medico;
    const counterpartLabel = counterpart === "paciente" ? "Paciente" : "Profesional";
    const readyToSubmit = canSubmitReprogram({ fecha, hora, horarios, cargando, guardando });

    const timePlaceholder = !fecha
        ? "Selecciona una fecha primero"
        : cargando
            ? "Consultando horarios..."
            : horarios.length
                ? "Selecciona un horario"
                : "Sin horarios disponibles";

    return (
        <Modal
            abierto={abierto}
            onCerrar={cerrar}
            onExitComplete={handleExitComplete}
            titulo="Reprogramar cita"
            text="Elige una nueva fecha y un horario disponible."
            headerVariant="white"
            width="620px"
            icon={<span className={styles.headerIcon} aria-hidden="true"><CalendarClock size={22} /></span>}
        >
            <form className={styles.form} onSubmit={handleSubmit} aria-busy={guardando}>
                <section className={styles.currentAppointment} aria-label="Cita actual">
                    <div className={styles.currentHeading}>
                        <span>Actualmente</span>
                        <strong>{currentDate ? `${currentDate.fecha} · ${currentDate.hora}` : "Fecha no disponible"}</strong>
                    </div>
                    <div className={styles.currentMeta}>
                        <span>
                            {counterpart === "paciente"
                                ? <UserRound size={17} aria-hidden="true" />
                                : <Stethoscope size={17} aria-hidden="true" />}
                            <span><small>{counterpartLabel}</small>{counterpartName || "No disponible"}</span>
                        </span>
                        {cita?.especialidad && (
                            <span className={styles.specialty}>{cita.especialidad}</span>
                        )}
                    </div>
                </section>

                <div className={styles.fields}>
                    <div className={styles.field}>
                        <label htmlFor={dateId}>
                            <CalendarDays size={17} aria-hidden="true" /> Nueva fecha
                        </label>
                        <input
                            id={dateId}
                            type="date"
                            min={getBogotaDateInputValue()}
                            value={fecha}
                            onChange={(event) => setFecha(event.target.value)}
                            disabled={guardando}
                            required
                        />
                    </div>

                    <div className={styles.field}>
                        <label htmlFor={timeId}>
                            <Clock3 size={17} aria-hidden="true" /> Horario disponible
                        </label>
                        <select
                            id={timeId}
                            value={hora}
                            onChange={(event) => setHora(event.target.value)}
                            disabled={cargando || guardando || !horarios.length}
                            required
                        >
                            <option value="">{timePlaceholder}</option>
                            {horarios.map((slot) => (
                                <option key={slot.hora_inicio} value={slot.hora_inicio}>
                                    {slot.hora_inicio} – {slot.hora_fin}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className={styles.feedback} aria-live="polite">
                    {cargando && (
                        <p className={styles.loadingFeedback} role="status">
                            <LoaderCircle size={15} aria-hidden="true" /> Consultando disponibilidad
                        </p>
                    )}
                    {fecha && !cargando && !error && !horarios.length && (
                        <p>No hay horarios disponibles para esta fecha.</p>
                    )}
                    {!cargando && !error && horarios.length > 0 && (
                        <p className={styles.availableFeedback}>
                            {horarios.length} {horarios.length === 1 ? "horario disponible" : "horarios disponibles"}
                        </p>
                    )}
                    {error && <p className={styles.error} role="alert">{error}</p>}
                </div>

                <div className={styles.actions}>
                    <button type="button" className={styles.cancelButton} onClick={cerrar} disabled={guardando}>
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={!readyToSubmit}
                        aria-busy={guardando}
                    >
                        <CalendarClock size={17} aria-hidden="true" />
                        {guardando ? "Reprogramando..." : "Reprogramar cita"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
