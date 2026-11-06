"use client";

import {
    AlertCircle,
    CalendarClock,
    CheckCircle2,
    Eye,
    LoaderCircle,
    Star,
    Stethoscope,
    Trash2,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import Swal from "sweetalert2";
import Modal from "../../../ui/Modal/Modal";
import useCalificacion from "../useCalificacion";
import {
    formatCalificacionDate,
    getCalificacionPresentation,
    getInitialCalificacionValues,
    validateCalificacion,
} from "../calificacionPresentation";
import EstrellasCalificacion from "../EstrellasCalificacion/EstrellasCalificacion";
import {
    getCalificacionModalCopy,
    getReadOnlyComment,
} from "./calificacionModalModel";
import styles from "./CalificarMedicoModal.module.css";

export default function CalificarMedicoModal({
    abierto,
    cita,
    onCerrar,
    onExitComplete,
    onSuccess,
    onRefresh,
}) {
    const formId = useId();
    const ratingLabelId = useId();
    const commentHelpId = useId();
    const initialFocusRef = useRef(null);
    const [puntuacion, setPuntuacion] = useState(0);
    const [comentario, setComentario] = useState("");
    const [esPublica, setEsPublica] = useState(false);
    const [visibilidadGuardada, setVisibilidadGuardada] = useState(false);
    const [mensajeVisibilidad, setMensajeVisibilidad] = useState("");
    const [validationErrors, setValidationErrors] = useState({});
    const [forceReadOnly, setForceReadOnly] = useState(false);
    const {
        crearCalificacion,
        actualizarCalificacion,
        actualizarVisibilidad,
        eliminarCalificacion,
        enviando,
        error,
        actualizandoVisibilidad,
        errorVisibilidad,
        eliminando,
        errorEliminar,
        limpiarError,
        limpiarErrorVisibilidad,
        limpiarErrorEliminar,
    } = useCalificacion();

    const presentation = getCalificacionPresentation(cita);
    const mode = forceReadOnly ? "read" : (presentation?.mode || "read");
    const copy = getCalificacionModalCopy(mode);
    const isEditable = copy.editable;
    const medico = cita?.medico || "Profesional de DocSmart";
    const especialidad = cita?.especialidad || "Especialidad no disponible";

    useEffect(() => {
        if (!abierto) return;
        const initialValues = getInitialCalificacionValues(cita);
        setPuntuacion(initialValues.puntuacion);
        setComentario(initialValues.comentario);
        setEsPublica(initialValues.esPublica);
        setVisibilidadGuardada(initialValues.esPublica);
        setMensajeVisibilidad("");
        setValidationErrors({});
        setForceReadOnly(false);
        limpiarError();
        limpiarErrorVisibilidad();
        limpiarErrorEliminar();
    }, [abierto, cita?.id]);

    const cerrar = () => {
        if (!enviando && !actualizandoVisibilidad && !eliminando) onCerrar?.();
    };

    const handleExitComplete = () => {
        setPuntuacion(0);
        setComentario("");
        setEsPublica(false);
        setVisibilidadGuardada(false);
        setMensajeVisibilidad("");
        setValidationErrors({});
        setForceReadOnly(false);
        limpiarError();
        limpiarErrorVisibilidad();
        limpiarErrorEliminar();
        onExitComplete?.();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const validation = validateCalificacion({ puntuacion, comentario });
        setValidationErrors(validation.errors);
        limpiarError();
        if (!validation.valid || enviando) return;

        try {
            const payload = {
                puntuacion,
                comentario: comentario.trim(),
                ...(mode === "create" ? { esPublica } : {}),
            };
            const response = mode === "create"
                ? await crearCalificacion({ idCita: cita.id, ...payload })
                : await actualizarCalificacion({
                    idCalificacion: cita.calificacion.id,
                    ...payload,
                });

            if (response?.ignored) return;
            await onRefresh?.();
            await onSuccess?.(mode, response);
        } catch (requestError) {
            if (mode === "edit" && requestError?.response?.status === 403) {
                await onRefresh?.();
                const persistedValues = getInitialCalificacionValues(cita);
                setPuntuacion(persistedValues.puntuacion);
                setComentario(persistedValues.comentario);
                setForceReadOnly(true);
            }
        }
    };

    const handleVisibilitySave = async () => {
        if (!cita?.calificacion?.id || esPublica === visibilidadGuardada || actualizandoVisibilidad) return;
        limpiarErrorVisibilidad();
        setMensajeVisibilidad("");
        try {
            const response = await actualizarVisibilidad({
                idCalificacion: cita.calificacion.id,
                esPublica,
            });
            if (response?.ignored) return;
            setVisibilidadGuardada(esPublica);
            setMensajeVisibilidad(esPublica
                ? "Tu opinión ahora es pública."
                : "Tu opinión ahora es privada.");
            await onRefresh?.();
        } catch {
            // El hook expone un mensaje seguro y reutilizable.
        }
    };

    const handleEliminar = async () => {
        const idCalificacion = cita?.calificacion?.id;
        if (!idCalificacion || enviando || actualizandoVisibilidad || eliminando) return;

        const confirmacion = await Swal.fire({
            title: "¿Eliminar tu calificación?",
            text: "Esta acción no se puede deshacer. Podrás calificar la atención de nuevo.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
        });
        if (!confirmacion.isConfirmed) return;

        try {
            const response = await eliminarCalificacion({ idCalificacion });
            if (response?.ignored) return;
            await onRefresh?.();
            await onSuccess?.("delete", response);
        } catch {
            // El hook expone un mensaje con el error del servidor.
        }
    };

    const ocupado = enviando || actualizandoVisibilidad || eliminando;
    const deleteButton = mode !== "create" && cita?.calificacion?.id ? (
        <button
            type="button"
            className={styles.dangerButton}
            onClick={handleEliminar}
            disabled={ocupado}
            aria-label={`Eliminar mi calificación de la atención con ${medico}`}
        >
            {eliminando ? (
                <LoaderCircle className={styles.spinner} size={17} aria-hidden="true" />
            ) : (
                <Trash2 size={17} aria-hidden="true" />
            )}
            {eliminando ? "Eliminando..." : "Eliminar"}
        </button>
    ) : null;

    const footer = isEditable ? (
        <>
            {deleteButton}
            <button
                type="button"
                className={styles.secondaryButton}
                onClick={cerrar}
                disabled={ocupado}
            >
                Cancelar
            </button>
            <button
                type="submit"
                form={formId}
                className={styles.primaryButton}
                disabled={ocupado || puntuacion < 1 || comentario.length > 1000}
            >
                {enviando ? (
                    <>
                        <LoaderCircle className={styles.spinner} size={17} aria-hidden="true" />
                        Guardando...
                    </>
                ) : (
                    <>
                        <Star size={17} aria-hidden="true" />
                        {copy.submitLabel}
                    </>
                )}
            </button>
        </>
    ) : (
        <>
            {deleteButton}
            <button type="button" className={styles.primaryButton} onClick={cerrar} disabled={ocupado}>
                Cerrar
            </button>
        </>
    );

    return (
        <Modal
            abierto={abierto}
            onCerrar={cerrar}
            onExitComplete={handleExitComplete}
            titulo={copy.title}
            text={copy.description}
            headerVariant="white"
            width="570px"
            initialFocusRef={initialFocusRef}
            icon={<span className={styles.headerIcon} aria-hidden="true"><Star size={21} /></span>}
            footer={footer}
        >
            <div ref={initialFocusRef} className={styles.content} tabIndex={-1}>
                <section className={styles.professional} aria-label="Profesional calificado">
                    <span className={styles.professionalIcon} aria-hidden="true">
                        <Stethoscope size={20} />
                    </span>
                    <div>
                        <span>Atención con</span>
                        <strong>{medico}</strong>
                        <small>{especialidad}</small>
                    </div>
                </section>

                {isEditable ? (
                    <form id={formId} className={styles.form} onSubmit={handleSubmit} aria-busy={enviando}>
                        <div className={styles.ratingField}>
                            <div className={styles.fieldHeading}>
                                <label id={ratingLabelId}>¿Cómo calificarías tu atención?</label>
                                <span>Obligatorio</span>
                            </div>
                            <EstrellasCalificacion
                                value={puntuacion}
                                onChange={(value) => {
                                    setPuntuacion(value);
                                    setValidationErrors((current) => ({ ...current, puntuacion: undefined }));
                                }}
                                disabled={enviando}
                                name={`${formId}-puntuacion`}
                                labelledBy={ratingLabelId}
                            />
                            {validationErrors.puntuacion && (
                                <p className={styles.fieldError}>{validationErrors.puntuacion}</p>
                            )}
                        </div>

                        <div className={styles.commentField}>
                            <div className={styles.fieldHeading}>
                                <label htmlFor={`${formId}-comentario`}>Comentario</label>
                                <span>Opcional</span>
                            </div>
                            <textarea
                                id={`${formId}-comentario`}
                                value={comentario}
                                onChange={(event) => {
                                    setComentario(event.target.value);
                                    setValidationErrors((current) => ({ ...current, comentario: undefined }));
                                }}
                                maxLength={1000}
                                rows={5}
                                placeholder="Comparte aspectos de la atención que puedan ser útiles."
                                aria-describedby={commentHelpId}
                                aria-invalid={Boolean(validationErrors.comentario)}
                                disabled={enviando}
                            />
                            <div id={commentHelpId} className={styles.commentMeta}>
                                <span>No incluyas información médica sensible.</span>
                                <span className={styles.counter}>{comentario.length} / 1000</span>
                            </div>
                            {validationErrors.comentario && (
                                <p className={styles.fieldError}>{validationErrors.comentario}</p>
                            )}
                        </div>

                        {error && (
                            <div className={styles.feedback} role="alert">
                                <AlertCircle size={18} aria-hidden="true" />
                                <span>{error}</span>
                            </div>
                        )}
                    </form>
                ) : (
                    <section className={styles.readOnlyPanel} aria-label="Calificación registrada">
                        <div className={styles.readOnlyRating}>
                            <span>Tu puntuación</span>
                            <EstrellasCalificacion
                                value={puntuacion}
                                readOnly
                                name={`${formId}-puntuacion-registrada`}
                            />
                        </div>
                        <div className={styles.commentReview}>
                            <span>Tu comentario</span>
                            <p>{getReadOnlyComment(comentario)}</p>
                        </div>
                        <div className={styles.registrationDate}>
                            <CalendarClock size={17} aria-hidden="true" />
                            <span>Registrada el {formatCalificacionDate(cita?.calificacion?.fecha_creacion)}</span>
                        </div>
                        <p className={styles.closedNotice}>
                            El período permitido para editar esta calificación ha finalizado.
                        </p>
                        {error && (
                            <div className={styles.feedback} role="alert">
                                <AlertCircle size={18} aria-hidden="true" />
                                <span>{error}</span>
                            </div>
                        )}
                    </section>
                )}

                <section className={styles.visibilityPanel} aria-labelledby={`${formId}-visibility-title`}>
                    <span className={styles.visibilityIcon} aria-hidden="true"><Eye size={19} /></span>
                    <div className={styles.visibilityCopy}>
                        <strong id={`${formId}-visibility-title`}>Visibilidad de tu opinión</strong>
                        <p>Autoriza que tu puntuación y comentario aparezcan de forma anónima en el perfil público del médico.</p>
                        <label className={styles.visibilityChoice}>
                            <input
                                type="checkbox"
                                checked={esPublica}
                                onChange={(event) => {
                                    setEsPublica(event.target.checked);
                                    setMensajeVisibilidad("");
                                    limpiarErrorVisibilidad();
                                }}
                                disabled={enviando || actualizandoVisibilidad}
                            />
                            <span aria-hidden="true" />
                            <span>Publicar mi opinión de forma anónima</span>
                        </label>
                        {mode !== "create" && esPublica !== visibilidadGuardada && (
                            <p className={styles.visibilityPending}>Cambio pendiente de guardar.</p>
                        )}
                        {mode !== "create" && (
                            <button
                                type="button"
                                className={styles.visibilityButton}
                                onClick={handleVisibilitySave}
                                disabled={actualizandoVisibilidad || esPublica === visibilidadGuardada}
                            >
                                {actualizandoVisibilidad ? <LoaderCircle className={styles.spinner} size={16} aria-hidden="true" /> : null}
                                {actualizandoVisibilidad ? "Guardando..." : "Guardar visibilidad"}
                            </button>
                        )}
                        {mensajeVisibilidad && <p className={styles.visibilitySuccess} role="status"><CheckCircle2 size={16} aria-hidden="true" />{mensajeVisibilidad}</p>}
                        {errorVisibilidad && <p className={styles.visibilityError} role="alert"><AlertCircle size={16} aria-hidden="true" />{errorVisibilidad}</p>}
                    </div>
                </section>

                {errorEliminar && (
                    <div className={styles.feedback} role="alert">
                        <AlertCircle size={18} aria-hidden="true" />
                        <span>{errorEliminar}</span>
                    </div>
                )}
            </div>
        </Modal>
    );
}
