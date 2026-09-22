"use client";

import styles from "./Exceptions.module.css";
import {
    CalendarDays,
    Clock,
    Pencil,
    Plus,
    Trash2
} from "lucide-react";


export default function Exceptions({
    excepciones = [],
    loading = false,
    onNueva,
    onEditar,
    onEliminar
}) {

    const excepcionesAgrupadas =
        Object.values(
            excepciones.reduce(
                (acumulador, excepcion) => {

                    const fecha = excepcion.fecha;

                    if (!acumulador[fecha]) {
                        acumulador[fecha] = {
                            fecha,
                            tipo: excepcion.tipo,
                            tipo_display:
                                excepcion.tipo_display,
                            motivo:
                                excepcion.motivo || "",
                            horarios: []
                        };
                    }

                    if (
                        excepcion.tipo ===
                        "HORARIO_ESPECIAL"
                    ) {
                        acumulador[
                            fecha
                        ].horarios.push({
                            id: excepcion.id,
                            hora_inicio:
                                excepcion.hora_inicio,
                            hora_fin:
                                excepcion.hora_fin
                        });
                    }

                    return acumulador;

                },
                {}
            )
        );


    const formatearFecha = (fecha) => {

        const [year, month, day] =
            fecha.split("-").map(Number);

        return new Intl.DateTimeFormat(
            "es-CO",
            {
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        ).format(
            new Date(year, month - 1, day)
        );
    };


    if (loading) {
        return (
            <section className={styles.container}>
                <p className={styles.loading}>
                    Cargando excepciones...
                </p>
            </section>
        );
    }


    return (
        <section className={styles.container}>

            <div className={styles.header}>
                <div>
                    <h2>
                        Excepciones de disponibilidad
                    </h2>

                    <p>
                        Configura días libres o
                        horarios especiales.
                    </p>
                </div>

                <button
                    type="button"
                    className={styles.addButton}
                    onClick={onNueva}
                >
                    <Plus size={18} />
                    Nueva excepción
                </button>
            </div>


            {excepcionesAgrupadas.length === 0 ? (

                <div className={styles.empty}>
                    <CalendarDays size={32} />

                    <h3>
                        No tienes excepciones
                    </h3>

                    <p>
                        Tu disponibilidad semanal se
                        aplicará normalmente.
                    </p>
                </div>

            ) : (

                <div className={styles.list}>

                    {excepcionesAgrupadas.map(
                        (excepcion) => (

                            <article
                                key={excepcion.fecha}
                                className={styles.card}
                            >

                                <div
                                    className={
                                        styles.cardContent
                                    }
                                >
                                    <div
                                        className={
                                            styles.dateIcon
                                        }
                                    >
                                        <CalendarDays
                                            size={21}
                                        />
                                    </div>

                                    <div
                                        className={
                                            styles.information
                                        }
                                    >
                                        <div
                                            className={
                                                styles.titleRow
                                            }
                                        >
                                            <h3>
                                                {formatearFecha(
                                                    excepcion.fecha
                                                )}
                                            </h3>

                                            <span
                                                className={
                                                    excepcion.tipo ===
                                                    "NO_DISPONIBLE"
                                                        ? styles.unavailable
                                                        : styles.special
                                                }
                                            >
                                                {
                                                    excepcion.tipo_display
                                                    ?? (
                                                        excepcion.tipo ===
                                                        "NO_DISPONIBLE"
                                                            ? "No disponible"
                                                            : "Horario especial"
                                                    )
                                                }
                                            </span>
                                        </div>

                                        {excepcion.tipo ===
                                        "HORARIO_ESPECIAL" ? (

                                            <div
                                                className={
                                                    styles.schedules
                                                }
                                            >
                                                {excepcion.horarios.map(
                                                    (horario) => (
                                                        <span
                                                            key={
                                                                horario.id
                                                            }
                                                        >
                                                            <Clock
                                                                size={15}
                                                            />

                                                            {
                                                                horario.hora_inicio
                                                            }
                                                            {" - "}
                                                            {
                                                                horario.hora_fin
                                                            }
                                                        </span>
                                                    )
                                                )}
                                            </div>

                                        ) : (
                                            <p
                                                className={
                                                    styles.description
                                                }
                                            >
                                                No atenderás
                                                pacientes este día.
                                            </p>
                                        )}

                                        {excepcion.motivo && (
                                            <p
                                                className={
                                                    styles.reason
                                                }
                                            >
                                                {excepcion.motivo}
                                            </p>
                                        )}
                                    </div>
                                </div>


                                <div
                                    className={
                                        styles.actions
                                    }
                                >
                                    <button
                                        type="button"
                                        title="Editar"
                                        onClick={() =>
                                            onEditar?.(
                                                excepcion
                                            )
                                        }
                                    >
                                        <Pencil size={18} />
                                    </button>

                                    <button
                                        type="button"
                                        title="Eliminar"
                                        onClick={() =>
                                            onEliminar?.(
                                                excepcion.fecha
                                            )
                                        }
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                            </article>
                        )
                    )}

                </div>
            )}

        </section>
    );
}