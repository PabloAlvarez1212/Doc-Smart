"use client";

import { useEffect, useState } from "react";
import { obtenerHorariosDisponiblesMedicoService } from "../../../../src/app/services/doctorServices";
import Modal from "../../../ui/Modal/Modal";
import Button from "../../../ui/Button/Button";
import styles from "./ReprogramAppointmets.module.css";

export default function ReprogramAppointment({
    abierto,
    onCerrar,
    cita,
    reprogramarCita,
}) {
    const [fecha, setFecha] = useState("");
    const [hora, setHora] = useState("");
    const [horarios, setHorarios] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");

    const medicoId = cita?.id_medico;
    const citaId = cita?.id;

    useEffect(() => {
        setFecha("");
        setHora("");
        setHorarios([]);
        setError("");
    }, [abierto, citaId]);

    useEffect(() => {
        let cancelado = false;

        setHora("");
        setHorarios([]);
        setError("");
        setCargando(false);

        if (!abierto || !fecha) return;

        if (!medicoId || !citaId) {
            setError("No se recibió el identificador del médico o de la cita.");
            return;
        }

        setCargando(true);

        obtenerHorariosDisponiblesMedicoService(medicoId, fecha, citaId)
            .then((respuesta) => {
                if (cancelado) return;

                const slots = respuesta?.data?.horarios;
                if (!Array.isArray(slots)) {
                    throw new Error("El servidor devolvió horarios inválidos.");
                }
                setHorarios(slots);
            })
            .catch((err) => {
                if (cancelado) return;

                const detalle = err.response?.data?.errores?.detalle;
                setError(
                    typeof detalle === "string"
                        ? detalle
                        : "No se pudieron consultar los horarios disponibles."
                );
            })
            .finally(() => {
                if (!cancelado) setCargando(false);
            });

        return () => {
            cancelado = true;
        };
    }, [abierto, fecha, medicoId, citaId]);

    const cerrar = () => {
        if (!guardando) onCerrar();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (
            cargando ||
            guardando ||
            !fecha ||
            !horarios.some((slot) => slot.hora_inicio === hora)
        ) {
            return;
        }

        setGuardando(true);
        setError("");

        try {
            // Hora local de Colombia, con zona horaria explícita.
            await reprogramarCita(
                citaId,
                `${fecha}T${hora}:00-05:00`
            );
            onCerrar();
        } catch (err) {
            const detalle = err.response?.data?.errores?.detalle;
            setError(
                typeof detalle === "string"
                    ? detalle
                    : "No se pudo reprogramar la cita. Intenta nuevamente."
            );
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal
            abierto={abierto}
            onCerrar={cerrar}
            titulo="Reprogramar cita"
        >
            <form onSubmit={handleSubmit} className={styles.form}>
                <label htmlFor="reprogramar-fecha">Nueva fecha</label>
                <input
                    id="reprogramar-fecha"
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    disabled={guardando}
                    required
                />

                <label htmlFor="reprogramar-hora">
                    Horario disponible — hora de Colombia
                </label>
                <select
                    id="reprogramar-hora"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    disabled={cargando || guardando || !horarios.length}
                    required
                >
                    <option value="">
                        {cargando ? "Consultando horarios..." : "Selecciona un horario"}
                    </option>
                    {horarios.map((slot) => (
                        <option key={slot.hora_inicio} value={slot.hora_inicio}>
                            {slot.hora_inicio} – {slot.hora_fin}
                        </option>
                    ))}
                </select>

                {fecha && !cargando && !error && !horarios.length && (
                    <p>No hay horarios disponibles para esta fecha.</p>
                )}

                {error && <p role="alert">{error}</p>}

                <div className={styles.actions}>
                    <Button
                        type="button"
                        variant="danger"
                        onClick={cerrar}
                        disabled={guardando}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={cargando || guardando || !hora}
                    >
                        {guardando ? "Reprogramando..." : "Reprogramar"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}