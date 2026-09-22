"use client";

import {
    useEffect,
    useState
} from "react";

import {
    Clock,
    Plus,
    Trash2,
    X
} from "lucide-react";

import styles from "./ExceptionModal.module.css";


const ESTADO_INICIAL = {
    fecha: "",
    tipo: "NO_DISPONIBLE",
    motivo: "",
    horarios: []
};


export default function ExceptionModal({
    open,
    excepcion,
    saving = false,
    onClose,
    onGuardar
}) {

    const [formulario, setFormulario] =
        useState(ESTADO_INICIAL);

    const esEdicion = Boolean(excepcion);


    useEffect(() => {

        if (!open) {
            return;
        }

        if (excepcion) {

            setFormulario({
                fecha: excepcion.fecha,
                tipo: excepcion.tipo,
                motivo: excepcion.motivo ?? "",
                horarios:
                    excepcion.horarios?.map(
                        (horario) => ({
                            hora_inicio:
                                horario.hora_inicio,
                            hora_fin:
                                horario.hora_fin
                        })
                    ) ?? []
            });

            return;
        }

        setFormulario(ESTADO_INICIAL);

    }, [open, excepcion]);


    const actualizarCampo =
        (campo, valor) => {

            setFormulario(
                (anterior) => ({
                    ...anterior,
                    [campo]: valor
                })
            );
        };


    const cambiarTipo = (tipo) => {

        setFormulario(
            (anterior) => ({
                ...anterior,
                tipo,
                horarios:
                    tipo === "HORARIO_ESPECIAL"
                        ? (
                            anterior.horarios.length
                                ? anterior.horarios
                                : [
                                    {
                                        hora_inicio: "08:00",
                                        hora_fin: "12:00"
                                    }
                                ]
                        )
                        : []
            })
        );
    };


    const agregarHorario = () => {

        setFormulario(
            (anterior) => ({
                ...anterior,
                horarios: [
                    ...anterior.horarios,
                    {
                        hora_inicio: "08:00",
                        hora_fin: "12:00"
                    }
                ]
            })
        );
    };


    const actualizarHorario = (
        indice,
        campo,
        valor
    ) => {

        setFormulario(
            (anterior) => ({
                ...anterior,

                horarios:
                    anterior.horarios.map(
                        (horario, posicion) => {

                            if (
                                posicion !== indice
                            ) {
                                return horario;
                            }

                            return {
                                ...horario,
                                [campo]: valor
                            };
                        }
                    )
            })
        );
    };


    const eliminarHorario = (indice) => {

        setFormulario(
            (anterior) => ({
                ...anterior,

                horarios:
                    anterior.horarios.filter(
                        (_, posicion) =>
                            posicion !== indice
                    )
            })
        );
    };


    const enviarFormulario =
        async (event) => {

            event.preventDefault();

            if (!formulario.fecha) {
                return;
            }

            if (
                formulario.tipo ===
                    "HORARIO_ESPECIAL"
                &&
                formulario.horarios.length === 0
            ) {
                return;
            }

            await onGuardar?.(
                formulario,
                esEdicion
            );
        };


    if (!open) {
        return null;
    }


    return (
        <div className={styles.overlay}>

            <div className={styles.modal}>

                <div className={styles.header}>
                    <div>
                        <h2>
                            {esEdicion
                                ? "Editar excepción"
                                : "Nueva excepción"}
                        </h2>

                        <p>
                            Modifica tu disponibilidad
                            para una fecha específica.
                        </p>
                    </div>

                    <button
                        type="button"
                        className={styles.closeButton}
                        onClick={onClose}
                        disabled={saving}
                    >
                        <X size={21} />
                    </button>
                </div>


                <form
                    onSubmit={enviarFormulario}
                    className={styles.form}
                >

                    <div className={styles.field}>
                        <label htmlFor="fecha">
                            Fecha
                        </label>

                        <input
                            id="fecha"
                            type="date"
                            value={formulario.fecha}
                            disabled={
                                saving || esEdicion
                            }
                            onChange={(event) =>
                                actualizarCampo(
                                    "fecha",
                                    event.target.value
                                )
                            }
                            required
                        />
                    </div>


                    <div className={styles.field}>
                        <label>
                            Tipo de excepción
                        </label>

                        <div
                            className={
                                styles.typeOptions
                            }
                        >
                            <button
                                type="button"
                                className={
                                    formulario.tipo ===
                                    "NO_DISPONIBLE"
                                        ? styles.typeActive
                                        : styles.typeButton
                                }
                                onClick={() =>
                                    cambiarTipo(
                                        "NO_DISPONIBLE"
                                    )
                                }
                                disabled={saving}
                            >
                                No disponible
                            </button>

                            <button
                                type="button"
                                className={
                                    formulario.tipo ===
                                    "HORARIO_ESPECIAL"
                                        ? styles.typeActive
                                        : styles.typeButton
                                }
                                onClick={() =>
                                    cambiarTipo(
                                        "HORARIO_ESPECIAL"
                                    )
                                }
                                disabled={saving}
                            >
                                Horario especial
                            </button>
                        </div>
                    </div>


                    {formulario.tipo ===
                        "HORARIO_ESPECIAL" && (

                        <div className={styles.field}>

                            <div
                                className={
                                    styles.scheduleHeader
                                }
                            >
                                <label>
                                    Horarios
                                </label>

                                <button
                                    type="button"
                                    onClick={
                                        agregarHorario
                                    }
                                    className={
                                        styles.addSchedule
                                    }
                                    disabled={saving}
                                >
                                    <Plus size={16} />
                                    Agregar
                                </button>
                            </div>


                            <div
                                className={
                                    styles.scheduleList
                                }
                            >
                                {formulario.horarios.map(
                                    (
                                        horario,
                                        indice
                                    ) => (

                                        <div
                                            key={indice}
                                            className={
                                                styles.schedule
                                            }
                                        >
                                            <Clock
                                                size={18}
                                            />

                                            <input
                                                type="time"
                                                value={
                                                    horario.hora_inicio
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    actualizarHorario(
                                                        indice,
                                                        "hora_inicio",
                                                        event.target.value
                                                    )
                                                }
                                                disabled={
                                                    saving
                                                }
                                                required
                                            />

                                            <span>
                                                hasta
                                            </span>

                                            <input
                                                type="time"
                                                value={
                                                    horario.hora_fin
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    actualizarHorario(
                                                        indice,
                                                        "hora_fin",
                                                        event.target.value
                                                    )
                                                }
                                                disabled={
                                                    saving
                                                }
                                                required
                                            />

                                            <button
                                                type="button"
                                                className={
                                                    styles.removeSchedule
                                                }
                                                onClick={() =>
                                                    eliminarHorario(
                                                        indice
                                                    )
                                                }
                                                disabled={
                                                    saving
                                                }
                                            >
                                                <Trash2
                                                    size={17}
                                                />
                                            </button>
                                        </div>
                                    )
                                )}
                            </div>

                        </div>
                    )}


                    <div className={styles.field}>
                        <label htmlFor="motivo">
                            Motivo
                            <span> (opcional)</span>
                        </label>

                        <textarea
                            id="motivo"
                            rows={3}
                            maxLength={255}
                            value={formulario.motivo}
                            onChange={(event) =>
                                actualizarCampo(
                                    "motivo",
                                    event.target.value
                                )
                            }
                            placeholder={
                                "Ej: Día personal, congreso..."
                            }
                            disabled={saving}
                        />
                    </div>


                    <div className={styles.footer}>
                        <button
                            type="button"
                            className={
                                styles.cancelButton
                            }
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            className={
                                styles.saveButton
                            }
                            disabled={saving}
                        >
                            {saving
                                ? "Guardando..."
                                : esEdicion
                                    ? "Guardar cambios"
                                    : "Crear excepción"}
                        </button>
                    </div>

                </form>

            </div>
        </div>
    );
}