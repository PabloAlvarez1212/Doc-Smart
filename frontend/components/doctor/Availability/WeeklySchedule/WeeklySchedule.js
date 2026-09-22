"use client";

import { useEffect, useState } from "react";
import {
    Clock3,
    Plus,
    Trash2,
    Save
} from "lucide-react";

import styles from "./WeeklySchedule.module.css";


const DIAS = [
    { id: 0, nombre: "Lunes" },
    { id: 1, nombre: "Martes" },
    { id: 2, nombre: "Miércoles" },
    { id: 3, nombre: "Jueves" },
    { id: 4, nombre: "Viernes" },
    { id: 5, nombre: "Sábado" },
    { id: 6, nombre: "Domingo" },
];


function crearSemana(disponibilidad) {

    return DIAS.map((dia) => {

        const bloques = disponibilidad
            .filter(
                bloque =>
                    bloque.dia_semana === dia.id
            )
            .map(bloque => ({
                hora_inicio:
                    bloque.hora_inicio.slice(0, 5),

                hora_fin:
                    bloque.hora_fin.slice(0, 5),

                activo:
                    bloque.activo
            }));

        return {
            ...dia,
            activo: bloques.length > 0,
            bloques
        };
    });
}


export default function WeeklySchedule({
    disponibilidad,
    duracionConsulta,
    saving,
    onSave
}) {

    const [semana, setSemana] =
        useState(() =>
            crearSemana(disponibilidad)
        );

    const [duracion, setDuracion] =
        useState(duracionConsulta);

    const [mensaje, setMensaje] =
        useState(null);


    useEffect(() => {
        setSemana(
            crearSemana(disponibilidad)
        );
    }, [disponibilidad]);


    useEffect(() => {
        setDuracion(duracionConsulta);
    }, [duracionConsulta]);


    const toggleDia = (diaId) => {

        setMensaje(null);

        setSemana(prev =>
            prev.map(dia => {

                if (dia.id !== diaId) {
                    return dia;
                }

                if (dia.activo) {
                    return {
                        ...dia,
                        activo: false,
                        bloques: []
                    };
                }

                return {
                    ...dia,
                    activo: true,
                    bloques: [
                        {
                            hora_inicio: "08:00",
                            hora_fin: "12:00",
                            activo: true
                        }
                    ]
                };
            })
        );
    };


    const agregarBloque = (diaId) => {

        setMensaje(null);

        setSemana(prev =>
            prev.map(dia => {

                if (dia.id !== diaId) {
                    return dia;
                }

                return {
                    ...dia,
                    bloques: [
                        ...dia.bloques,
                        {
                            hora_inicio: "14:00",
                            hora_fin: "18:00",
                            activo: true
                        }
                    ]
                };
            })
        );
    };


    const eliminarBloque = (
        diaId,
        indiceBloque
    ) => {

        setMensaje(null);

        setSemana(prev =>
            prev.map(dia => {

                if (dia.id !== diaId) {
                    return dia;
                }

                const bloques =
                    dia.bloques.filter(
                        (_, index) =>
                            index !== indiceBloque
                    );

                return {
                    ...dia,
                    activo: bloques.length > 0,
                    bloques
                };
            })
        );
    };


    const actualizarHora = (
        diaId,
        indiceBloque,
        campo,
        valor
    ) => {

        setMensaje(null);

        setSemana(prev =>
            prev.map(dia => {

                if (dia.id !== diaId) {
                    return dia;
                }

                const bloques =
                    dia.bloques.map(
                        (bloque, index) => {

                            if (
                                index !== indiceBloque
                            ) {
                                return bloque;
                            }

                            return {
                                ...bloque,
                                [campo]: valor
                            };
                        }
                    );

                return {
                    ...dia,
                    bloques
                };
            })
        );
    };


    const guardar = async () => {

        setMensaje(null);

        const bloques = semana.flatMap(
            dia => {

                if (!dia.activo) {
                    return [];
                }

                return dia.bloques.map(
                    bloque => ({
                        dia_semana: dia.id,
                        hora_inicio:
                            bloque.hora_inicio,
                        hora_fin:
                            bloque.hora_fin,
                        activo: true
                    })
                );
            }
        );

        const resultado = await onSave({
            duracion_consulta:
                Number(duracion),

            disponibilidad: bloques
        });

        setMensaje({
            tipo:
                resultado.ok
                    ? "success"
                    : "error",

            texto: resultado.mensaje
        });
    };


    return (
        <section className={styles.section}>

            <div className={styles.sectionHeader}>

                <div>
                    <span className={styles.label}>
                        Configuración
                    </span>

                    <h2>
                        Horario semanal
                    </h2>

                    <p>
                        Define tu horario habitual
                        de atención y la duración de
                        cada consulta.
                    </p>
                </div>

                <div className={styles.duration}>

                    <div className={styles.durationIcon}>
                        <Clock3 size={20} />
                    </div>

                    <label>
                        <span>
                            Duración de consulta
                        </span>

                        <select
                            value={duracion}
                            onChange={e =>
                                setDuracion(
                                    Number(
                                        e.target.value
                                    )
                                )
                            }
                        >
                            <option value={15}>
                                15 minutos
                            </option>

                            <option value={30}>
                                30 minutos
                            </option>

                            <option value={45}>
                                45 minutos
                            </option>

                            <option value={60}>
                                60 minutos
                            </option>

                            <option value={90}>
                                90 minutos
                            </option>

                            <option value={120}>
                                120 minutos
                            </option>
                        </select>
                    </label>

                </div>

            </div>


            <div className={styles.days}>

                {semana.map(dia => (

                    <article
                        key={dia.id}
                        className={`
                            ${styles.dayCard}
                            ${
                                dia.activo
                                    ? styles.dayActive
                                    : ""
                            }
                        `}
                    >

                        <div
                            className={
                                styles.dayHeader
                            }
                        >

                            <div>
                                <h3>
                                    {dia.nombre}
                                </h3>

                                <span
                                    className={
                                        dia.activo
                                            ? styles.statusActive
                                            : styles.statusInactive
                                    }
                                >
                                    <i />

                                    {dia.activo
                                        ? "Atiendo"
                                        : "No atiendo"}
                                </span>
                            </div>


                            <button
                                type="button"
                                className={`
                                    ${styles.switch}
                                    ${
                                        dia.activo
                                            ? styles.switchActive
                                            : ""
                                    }
                                `}
                                onClick={() =>
                                    toggleDia(dia.id)
                                }
                                aria-label={
                                    `Cambiar disponibilidad de ${dia.nombre}`
                                }
                                aria-pressed={
                                    dia.activo
                                }
                            >
                                <span />
                            </button>

                        </div>


                        {dia.activo && (

                            <div
                                className={
                                    styles.dayContent
                                }
                            >

                                <div
                                    className={
                                        styles.blocks
                                    }
                                >

                                    {dia.bloques.map(
                                        (
                                            bloque,
                                            index
                                        ) => (

                                            <div
                                                className={
                                                    styles.timeRow
                                                }
                                                key={index}
                                            >

                                                <div
                                                    className={
                                                        styles.timeField
                                                    }
                                                >
                                                    <span>
                                                        Desde
                                                    </span>

                                                    <input
                                                        type="time"
                                                        value={
                                                            bloque.hora_inicio
                                                        }
                                                        onChange={
                                                            e =>
                                                                actualizarHora(
                                                                    dia.id,
                                                                    index,
                                                                    "hora_inicio",
                                                                    e.target.value
                                                                )
                                                        }
                                                    />
                                                </div>


                                                <span
                                                    className={
                                                        styles.separator
                                                    }
                                                >
                                                    —
                                                </span>


                                                <div
                                                    className={
                                                        styles.timeField
                                                    }
                                                >
                                                    <span>
                                                        Hasta
                                                    </span>

                                                    <input
                                                        type="time"
                                                        value={
                                                            bloque.hora_fin
                                                        }
                                                        onChange={
                                                            e =>
                                                                actualizarHora(
                                                                    dia.id,
                                                                    index,
                                                                    "hora_fin",
                                                                    e.target.value
                                                                )
                                                        }
                                                    />
                                                </div>


                                                <button
                                                    type="button"
                                                    className={
                                                        styles.deleteButton
                                                    }
                                                    onClick={() =>
                                                        eliminarBloque(
                                                            dia.id,
                                                            index
                                                        )
                                                    }
                                                    aria-label={
                                                        "Eliminar horario"
                                                    }
                                                >
                                                    <Trash2
                                                        size={18}
                                                    />
                                                </button>

                                            </div>
                                        )
                                    )}

                                </div>


                                <button
                                    type="button"
                                    className={
                                        styles.addButton
                                    }
                                    onClick={() =>
                                        agregarBloque(
                                            dia.id
                                        )
                                    }
                                >
                                    <Plus size={17} />

                                    Añadir horario
                                </button>

                            </div>
                        )}

                    </article>
                ))}

            </div>


            <div className={styles.footer}>

                {mensaje && (
                    <p
                        className={
                            mensaje.tipo ===
                            "success"
                                ? styles.success
                                : styles.messageError
                        }
                    >
                        {mensaje.texto}
                    </p>
                )}


                <button
                    type="button"
                    className={
                        styles.saveButton
                    }
                    onClick={guardar}
                    disabled={saving}
                >
                    <Save size={18} />

                    {saving
                        ? "Guardando..."
                        : "Guardar cambios"}
                </button>

            </div>

        </section>
    );
}