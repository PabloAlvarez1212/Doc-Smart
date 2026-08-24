"use client";

import { useState } from "react";
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!fecha) {
            return;
        }

        const fechaSeleccionada = fecha;

        setFecha("");
        onCerrar();

        await reprogramarCita(
            cita.id,
            fechaSeleccionada
        );
    };

    return (
        <Modal
            abierto={abierto}
            onCerrar={onCerrar}
            titulo="Reprogramar cita"
        >
            <form
                onSubmit={handleSubmit}
                className={styles.form}
            >

                <label>
                    Nueva fecha y hora
                </label>

                <input
                    type="datetime-local"
                    value={fecha}
                    onChange={(e) =>
                        setFecha(e.target.value)
                    }
                    required
                />

                <div className={styles.actions}>

                    <Button
                        type="button"
                        variant="danger"
                        onClick={onCerrar}
                    >
                        Cancelar
                    </Button>

                    <Button
                        type="submit"
                    >
                        Reprogramar
                    </Button>

                </div>

            </form>
        </Modal>
    );
}