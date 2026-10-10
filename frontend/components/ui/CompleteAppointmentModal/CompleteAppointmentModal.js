"use client";

import {FileText,LoaderCircle,Trash2,UploadCloud,UserRound,} from "lucide-react";
import {useEffect,useId,useRef,useState,} from "react";
import {listarDocumentosSeguimientoCitaService,subirDocumentosSeguimientoCitaService} from "@/app/services/appointmentsServices";
import formatearFecha from "@/app/utils/fechaFormaterUtils";
import { obtenerPrimerError } from "@/app/utils/errrorUtils";
import Modal from "../Modal/Modal";
import DocumentosSeguimientoList from '../DocumentosSeguimientoList/DocumentosSeguimientoList';
import styles from "./CompleteAppointmentModal.module.css";


function normalizarDocumentos(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (
        Array.isArray(
            data?.documentos
        )
    ) {
        return data.documentos;
    }

    return [];
}


export default function CompleteAppointmentModal({
    abierto,
    onCerrar,
    onExitComplete,
    cita,
    completarCita,
}) {

    const inputId = useId(); 
    const submitLock = useRef(false);
    const [motivoConsulta, setMotivoConsulta] = useState('');
    const [diagnosticoGeneral, setDiagnosticoGeneral] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const soloDocumentos = cita?.estado?.toLowerCase() === 'completada';

    const inputRef = useRef(null);

    const [archivos,setArchivos] = useState([]);

    const [documentosExistentes,setDocumentosExistentes] = useState([]);

    const [cargandoDocumentos,setCargandoDocumentos] = useState(false);

    const [guardando,setGuardando] = useState(false);

    const [error,setError] = useState("");

    const citaId = cita?.id;


    useEffect(() => {

        if (
            !abierto ||
            !citaId
        ) {
            return;
        }

        let activo = true;

        setArchivos([]);
        setDocumentosExistentes([]);
        setError("");
        setCargandoDocumentos(true);

        listarDocumentosSeguimientoCitaService(
            citaId
        )
            .then((data) => {
                if (!activo) return;
                setDocumentosExistentes(
                    normalizarDocumentos(
                        data
                    )
                );

            })
            .catch((requestError) => {
                if (!activo) return;
                // No bloqueamos el modal.
                // El médico todavía puede subir documentos.
                setDocumentosExistentes([]);
                setError(obtenerPrimerError(requestError.response?.data?.errores) || requestError.response?.data?.mensaje || 'No se pudieron consultar los documentos.');

            })
            .finally(() => {
                if (activo) {
                    setCargandoDocumentos(
                        false
                    );
                }

            });


        return () => {
            activo = false;
        };

    }, [
        abierto,
        citaId,
    ]);


    const agregarArchivos = (
        event
    ) => {

        const nuevos =
            Array.from(
                event.target.files || []
            );


        setError("");


        setArchivos(
            (actuales) => {

                const combinados = [
                    ...actuales,
                    ...nuevos,
                ];


                const unicos =
                    combinados.filter(
                        (
                            archivo,
                            index,
                            array
                        ) => {

                            return (
                                array.findIndex(
                                    (item) =>
                                        item.name ===
                                            archivo.name &&
                                        item.size ===
                                            archivo.size &&
                                        item.lastModified ===
                                            archivo.lastModified
                                )
                                === index
                            );
                        }
                    );

                if (
                    unicos.length > 5
                ) {
                    setError(
                        "Puedes seleccionar máximo 5 archivos por carga."
                    );
                    return unicos.slice(
                        0,
                        5
                    );
                }

                return unicos;
            }
        );

        event.target.value = "";

    };

    const eliminarArchivo = (
        index
    ) => {

        setArchivos(
            (actuales) =>
                actuales.filter(
                    (_, posicion) =>
                        posicion !== index
                )
        );
    };

    const handleSubmit = async (
        event
    ) => {
        event.preventDefault();

        if (guardando || submitLock.current || cargandoDocumentos) return;
        if (!soloDocumentos && (!motivoConsulta.trim() || !diagnosticoGeneral.trim())) {
            setError('Motivo de consulta y diagnóstico son obligatorios.');
            return;
        }
        if (soloDocumentos && !archivos.length) return;

        const tieneDocumento =
            documentosExistentes.length > 0 ||
            archivos.length > 0;


        if (!tieneDocumento) {

            setError(
                "Debes adjuntar al menos un documento de seguimiento."
            );

            return;
        }

        submitLock.current = true;
        setGuardando(true);
        setError("");


        try {

            /*
             * Primero guardamos los nuevos documentos.
             */
            if (
                archivos.length > 0
            ) {

                const resultado =
                    await subirDocumentosSeguimientoCitaService(
                        citaId,
                        archivos
                    );


                const nuevos =
                    normalizarDocumentos(
                        resultado
                    );


                setDocumentosExistentes(
                    (actuales) => [
                        ...actuales,
                        ...nuevos,
                    ]
                );


                /*
                 * Ya quedaron persistidos.
                 *
                 * Si completar falla después,
                 * no deben volver a subirse
                 * en el siguiente intento.
                 */
                setArchivos([]);

            }


            /*
             * Después cerramos la consulta.
             */
            await completarCita(citaId, soloDocumentos ? null : {
                motivo_consulta: motivoConsulta.trim(),
                diagnostico_general: diagnosticoGeneral.trim(),
                observaciones: observaciones.trim(),
            });


            onCerrar();

        } catch (requestError) {

            const mensaje =
                obtenerPrimerError(
                    requestError
                        .response
                        ?.data
                        ?.errores
                )
                ||
                requestError
                    .response
                    ?.data
                    ?.mensaje
                ||
                "No fue posible completar la cita.";

            setError(
                mensaje
            );

        } finally {
            submitLock.current = false;

            setGuardando(false);
        }
    };

    const cerrar = () => {
        if (!guardando) {
            onCerrar();
        }
    };

    const limpiarAlSalir = () => {
        setMotivoConsulta('');
        setDiagnosticoGeneral('');
        setObservaciones('');
        setArchivos([]);
        setDocumentosExistentes([]);
        setError("");
        setGuardando(false);
        onExitComplete?.();
    };

    const fechaCita =
        cita?.fecha_programada
            ? formatearFecha(
                cita.fecha_programada
            )
            : null;

    const puedeCompletar =
        !guardando &&
        !cargandoDocumentos &&
        (soloDocumentos ? archivos.length > 0 : motivoConsulta.trim() && diagnosticoGeneral.trim()) &&
        (
            documentosExistentes.length > 0 ||
            archivos.length > 0
        );


    return (
        <Modal
            abierto={abierto}
            onCerrar={cerrar}
            onExitComplete={limpiarAlSalir}
            titulo={soloDocumentos ? 'Agregar documentos' : 'Cerrar consulta'}
            text={soloDocumentos ? 'Agrega documentación dentro del plazo de cierre.' : 'Registra el seguimiento antes de completar la cita.'}
            headerVariant="white"
            width="650px"
            icon={
                <span
                    className={
                        styles.headerIcon
                    }
                >
                    <FileText size={22} />
                </span>
            }
        >

            <form
                className={styles.form}
                onSubmit={handleSubmit}
                aria-busy={guardando}
            >
                <section
                    className={
                        styles.appointment
                    }
                >
                    <div>
                        <UserRound
                            size={19}
                        />
                        <span>
                            <small>
                                Paciente
                            </small>

                            <strong>
                                {
                                    cita?.paciente ||
                                    "Paciente"
                                }
                            </strong>
                        </span>
                    </div>

                    {fechaCita && (
                        <span
                            className={
                                styles.date
                            }
                        >
                            {fechaCita.fecha}
                            {" · "}
                            {fechaCita.hora}
                        </span>
                    )}

                </section>

                {!soloDocumentos && <section className={styles.clinicalFields}>
                    <label htmlFor={`${inputId}-motivo`}>Motivo de consulta *</label>
                    <textarea id={`${inputId}-motivo`} required maxLength={2000} value={motivoConsulta} onChange={e => setMotivoConsulta(e.target.value)} disabled={guardando} />
                    <label htmlFor={`${inputId}-diagnostico`}>Diagnóstico / resultado *</label>
                    <textarea id={`${inputId}-diagnostico`} required maxLength={5000} value={diagnosticoGeneral} onChange={e => setDiagnosticoGeneral(e.target.value)} disabled={guardando} />
                    <label htmlFor={`${inputId}-observaciones`}>Observaciones (opcional)</label>
                    <textarea id={`${inputId}-observaciones`} maxLength={10000} value={observaciones} onChange={e => setObservaciones(e.target.value)} disabled={guardando} />
                </section>}
                {cita?.fecha_limite_cierre && <p>Documentos hasta {new Date(cita.fecha_limite_cierre).toLocaleString('es-CO', {timeZone: 'America/Bogota'})}</p>}
                <DocumentosSeguimientoList citaId={citaId} documentos={documentosExistentes} />
                <section className={styles.documents}>
                    <div
                        className={
                            styles.sectionHeading
                        }
                    >
                        <div>
                            <h3>
                                Documentos de seguimiento
                            </h3>

                            <p>
                                Adjunta al menos un archivo
                                relacionado con lo realizado
                                durante la consulta.
                            </p>
                        </div>
                    </div>


                    {cargandoDocumentos ? (

                        <p
                            className={
                                styles.loading
                            }
                        >
                            <LoaderCircle
                                size={17}
                            />

                            Consultando documentos...
                        </p>

                    ) : documentosExistentes.length > 0 && (

                        <div
                            className={
                                styles.existing
                            }
                        >
                            <FileText
                                size={18}
                            />

                            <span>
                                Esta cita ya tiene{" "}
                                <strong>
                                    {
                                        documentosExistentes.length
                                    }
                                </strong>{" "}
                                {
                                    documentosExistentes.length === 1
                                        ? "documento registrado"
                                        : "documentos registrados"
                                }.
                            </span>
                        </div>

                    )}


                    <label
                        htmlFor={inputId}
                        className={
                            styles.dropzone
                        }
                    >

                        <UploadCloud
                            size={28}
                        />

                        <strong>
                            Seleccionar documentos
                        </strong>

                        <span>
                            PDF, Word o imágenes ·
                            máximo 5 archivos
                        </span>

                    </label>


                    <input
                        ref={inputRef}
                        id={inputId}
                        type="file"
                        multiple
                        hidden
                        disabled={guardando}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                        onChange={
                            agregarArchivos
                        }
                    />


                    {archivos.length > 0 && (

                        <div
                            className={
                                styles.fileList
                            }
                        >

                            {archivos.map(
                                (
                                    archivo,
                                    index
                                ) => (

                                    <div
                                        key={
                                            `${archivo.name}-${archivo.lastModified}`
                                        }
                                        className={
                                            styles.file
                                        }
                                    >

                                        <FileText
                                            size={17}
                                        />

                                        <span>
                                            <strong>
                                                {
                                                    archivo.name
                                                }
                                            </strong>

                                            <small>
                                                {
                                                    (
                                                        archivo.size /
                                                        1024 /
                                                        1024
                                                    ).toFixed(2)
                                                }{" "}
                                                MB
                                            </small>
                                        </span>

                                        <button
                                            type="button"
                                            aria-label={
                                                `Eliminar ${archivo.name}`
                                            }
                                            disabled={
                                                guardando
                                            }
                                            onClick={() =>
                                                eliminarArchivo(
                                                    index
                                                )
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
                    )}
                </section>


                <div
                    className={
                        styles.feedback
                    }
                    aria-live="polite"
                >

                    {error && (
                        <p role="alert">
                            {error}
                        </p>
                    )}

                </div>

                <div
                    className={
                        styles.actions
                    }
                >

                    <button
                        type="button"
                        className={
                            styles.cancelButton
                        }
                        disabled={guardando}
                        onClick={cerrar}
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        className={
                            styles.submitButton
                        }
                        disabled={
                            !puedeCompletar
                        }
                    >
                        {guardando ? (
                            <>
                                <LoaderCircle
                                    size={17}
                                    className={
                                        styles.spinner
                                    }
                                />

                                Cerrando consulta...
                            </>
                        ) : (
                            <>
                                <FileText
                                    size={17}
                                />
                                {soloDocumentos ? 'Guardar documentos' : 'Guardar y completar'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
