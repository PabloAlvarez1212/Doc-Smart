"use client";

import { useState } from "react";
import Input from "../../../ui/Input/Input";
import styles from "./Appointment.module.css"

const OPCIONES_ESPECIALIDAD = [
    { value: 'Cardiología', label: 'Cardiología' },
    { value: 'Dermatología', label: 'Dermatología' },
    { value: 'Pediatría', label: 'Pediatría' },
    { value: 'Odontología', label: 'Odontología' },
];

const OPCIONES_ESTADO = [
    { value: 'CONFIRMADA', label: 'Confirmada' },
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'COMPLETADA', label: 'Completada' },
    { value: 'CANCELADA', label: 'Cancelada' },
    { value: 'REPROGRAMADA', label: 'Reprogramada' },
];

export default function AppointmentsList() {
    //  Estados individuales para cada filtro
    const [doctor, setDoctor] = useState('');
    const [direccion, setDireccion] = useState('');
    const [especialidad, setEspecialidad] = useState('');
    const [fecha, setFecha] = useState('');
    const [estadoCita, setEstadoCita] = useState('');

    return (
        <div className={styles.containerMain}>
            <div className={styles.filtros}>
                <div className={styles.input}>
                    <Input
                        type="text"
                        placeholder="Buscar por doctor"
                        value={doctor}
                        onChange={(e) => setDoctor(e.target.value)}
                    />
                </div>
                <div className={styles.input}>
                    <Input
                        type="text"
                        placeholder="Buscar por direccion"
                        value={direccion}
                        onChange={(e) => setDireccion(e.target.value)}
                    />
                </div>
                <div className={styles.input}>
                    <Input
                        type="date"
                        value={fecha}
                        placeholder="Buscar por fecha"
                        onChange={(e) => setFecha(e.target.value)}
                    />
                </div>
                <div className={styles.input}>
                    <select
                        className={styles.select}
                        value={especialidad}
                        onChange={(e) => setEspecialidad(e.target.value)}
                    >
                        <option value="">Selecciona una especialidad...</option>
                        {OPCIONES_ESPECIALIDAD.map((opcion) => (
                            <option key={opcion.value} value={opcion.value}>
                                {opcion.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.input}>
                    <select
                        className={styles.select}
                        value={estadoCita}
                        onChange={(e) => setEstadoCita(e.target.value)}
                    >
                        <option value="">Buscar por estado...</option>
                        {OPCIONES_ESTADO.map((opcion) => (
                            <option key={opcion.value} value={opcion.value}>
                                {opcion.label}
                            </option>
                        ))}
                    </select>
                </div>

            </div>
        </div>
    );
}