"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
    Flag,
    RefreshCw,
    ShieldAlert,
    ClipboardList,
} from "lucide-react";

import {
    crearReporteService,
    listarReportesService,
    gestionarReporteService,
    anularSancionService,
    obtenerMiSancionService,
    listarUsuariosReportablesService,
    obtenerContextoReporteCitaService,
} from "../../src/app/services/reportesServices";

import { obtenerPrimerError } from "../../src/app/utils/errrorUtils";
import styles from "./ReportsPanel.module.css";

const ESTADOS = {
    pendiente: "Pendiente",
    en_revision: "En revisión",
    resuelto: "Resuelto",
    descartado: "Descartado",
};

function formatearFecha(fecha) {
    if (!fecha) return "Sin fecha";

    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) {
        return "Fecha no disponible";
    }

    return valor.toLocaleString("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function mensajeError(error) {
    return (
        obtenerPrimerError(error?.response?.data?.errores) ||
        error?.response?.data?.mensaje ||
        "No se pudo completar la operación."
    );
}

export default function ReportsPanel({ rol, citaInicial = null }) {
    const router = useRouter();
    const esAdmin = rol === "admin";
    const [reportes, setReportes] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [miSancion, setMiSancion] = useState(null);

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [filtro, setFiltro] = useState("todos");

    const [formulario, setFormulario] = useState({
        id_reportado: "",
        motivo: "",
        descripcion: "",
    });

    const [ediciones, setEdiciones] = useState({});
    const [contextoCita, setContextoCita] = useState(null);
    const [cargandoContexto, setCargandoContexto] = useState(
        Boolean(citaInicial)
    );

    const cargar = useCallback(async () => {
        setCargando(true);
        setError("");

        try {
            if (esAdmin) {
                const lista = await listarReportesService();
                setReportes(lista ?? []);
            } else {
                const [lista, personas, sancion] = await Promise.all([
                    listarReportesService(),
                    listarUsuariosReportablesService(),
                    obtenerMiSancionService(),
                ]);

                setReportes(lista ?? []);
                setUsuarios(personas ?? []);
                setMiSancion(sancion ?? null);
            }
        } catch (err) {
            setError(mensajeError(err));
        } finally {
            setCargando(false);
        }
    }, [esAdmin]);

    useEffect(() => {
        void cargar();
    }, [cargar]);

    const actualizarFormulario = (campo, valor) => {
        setFormulario((anterior) => ({
            ...anterior,
            [campo]: valor,
        }));
    };

    const actualizarEdicion = (id, campo, valor) => {
        setEdiciones((anterior) => ({
            ...anterior,
            [id]: {
                ...anterior[id],
                [campo]: valor,
            },
        }));
    };
    useEffect(() => {
        if (esAdmin || !citaInicial) {
            setContextoCita(null);
            setCargandoContexto(false);
            return;
        }

        let cancelado = false;

        setCargandoContexto(true);

        obtenerContextoReporteCitaService(citaInicial)
            .then((contexto) => {
                if (cancelado) return;

                setContextoCita(contexto);

                setFormulario((anterior) => ({
                    ...anterior,
                    id_reportado: String(contexto.id_reportado),
                }));
            })
            .catch((err) => {
                if (cancelado) return;

                setContextoCita(null);
                setError(mensajeError(err));
            })
            .finally(() => {
                if (!cancelado) {
                    setCargandoContexto(false);
                }
            });

        return () => {
            cancelado = true;
        };
    }, [citaInicial, esAdmin]);

    const crearReporte = async (evento) => {
        evento.preventDefault();

        if (citaInicial && !contextoCita) {
            setError("No se pudo verificar la cita seleccionada.");
            return;
        }

        if (miSancion?.suspendido) return;

        if (
            !formulario.id_reportado ||
            !formulario.motivo.trim() ||
            !formulario.descripcion.trim()
        ) {
            setError("Completa todos los campos del reporte.");
            return;
        }

        setGuardando(true);
        setError("");

        try {
            await crearReporteService({
                id_reportado: Number(formulario.id_reportado),
                motivo: formulario.motivo.trim(),
                descripcion: formulario.descripcion.trim(),
                ...(contextoCita
                    ? { id_cita: contextoCita.id_cita }
                    : {}),
            });

            setFormulario({
                id_reportado: "",
                motivo: "",
                descripcion: "",
            });
            await Swal.fire({
                icon: "success",
                title: "Reporte enviado",
                text: "El administrador revisará tu reporte.",
            });

            await cargar();
                if (citaInicial) {
                    router.replace(
                        `/${rol === "medico" ? "doctor" : "patient"}/reports`
                    );
                }

            } catch (err) {
                setError(mensajeError(err));
            } finally {
                setGuardando(false);
            }
        };

    const gestionar = async (reporte, accion) => {
        const valores = ediciones[reporte.id] ?? {};
        const observacion = (
            valores.observacion_admin ?? ""
        ).trim();

        const datos = {
            accion,
            observacion_admin: observacion,
        };

        if (accion === "sancionar") {
            const dias = Number(valores.dias_suspension ?? 7);

            if (!observacion) {
                setError("Escribe el motivo de la sanción.");
                return;
            }

            if (!Number.isInteger(dias) || dias < 1 || dias > 30) {
                setError("Indica entre 1 y 30 días de suspensión.");
                return;
            }

            datos.dias_suspension = dias;
        }

        const confirmacion = await Swal.fire({
            title: accion === "sancionar"
                ? "¿Aplicar suspensión?"
                : accion === "descartar"
                    ? "¿Descartar reporte?"
                    : "¿Iniciar revisión?",
            text: accion === "sancionar"
                ? "Las citas afectadas por la suspensión serán canceladas."
                : "Se actualizará el estado del reporte.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Confirmar",
            cancelButtonText: "Volver",
        });

        if (!confirmacion.isConfirmed) return;

        setGuardando(true);
        setError("");

        try {
            await gestionarReporteService(reporte.id, datos);

            await cargar();

            await Swal.fire({
                icon: "success",
                title: "Reporte actualizado",
                timer: 1800,
                showConfirmButton: false,
            });
        } catch (err) {
            setError(mensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    const anularSancion = async (sancionId) => {
        const confirmacion = await Swal.fire({
            title: "¿Levantar suspensión?",
            text: "La cuenta recuperará los permisos restringidos. Las citas canceladas no se restaurarán automáticamente.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Levantar suspensión",
            cancelButtonText: "Volver",
        });

        if (!confirmacion.isConfirmed) return;

        setGuardando(true);
        setError("");

        try {
            await anularSancionService(sancionId);
            await cargar();

            await Swal.fire({
                icon: "success",
                title: "Suspensión levantada",
            });
        } catch (err) {
            setError(mensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    const reportesVisibles = reportes.filter(
        (reporte) =>
            filtro === "todos" || reporte.estado === filtro
    );

    const pendientes = reportes.filter(
        (reporte) => reporte.estado === "pendiente"
    ).length;

    const titulo = esAdmin
        ? "Gestión de reportes"
        : "Mis reportes";

    return (
        <div className={styles.root} data-role={rol}>
            <header className={styles.hero}>
                <div className={styles.heroIcon}>
                    <ShieldAlert size={26} />
                </div>

                <div>
                    <span className={styles.eyebrow}>
                        Seguridad de DocSmart
                    </span>
                    <h1>{titulo}</h1>
                    <p>
                        {esAdmin
                            ? "Revisa los casos y administra las sanciones."
                            : "Comunica una situación y consulta su seguimiento."}
                    </p>
                </div>

                <button
                    type="button"
                    className={styles.secondary}
                    onClick={cargar}
                    disabled={cargando || guardando}
                >
                    <RefreshCw size={17} />
                    Actualizar
                </button>
            </header>

            {error && (
                <div className={styles.error} role="alert">
                    {error}
                </div>
            )}

            {!esAdmin && miSancion?.suspendido && (
                <section className={styles.warning}>
                    <ShieldAlert size={22} />
                    <div>
                        <strong>Tu cuenta está suspendida</strong>
                        <p>
                            La suspensión termina el{" "}
                            {formatearFecha(
                                miSancion.sancion?.fecha_fin
                            )}.
                        </p>
                        <p>
                            {miSancion.sancion?.motivo}
                        </p>
                    </div>
                </section>
            )}

            {!esAdmin && (
                <section className={styles.panel}>
                    <div className={styles.sectionHeading}>
                        <Flag size={20} />
                        <div>
                            <h2>Crear nuevo reporte</h2>
                            <p>
                                Solo puedes reportar personas con
                                las que has tenido una cita registrada.
                            </p>
                        </div>
                    </div>

                    <form
                        onSubmit={crearReporte}
                        className={styles.form}
                    >
                        {cargandoContexto && (
                            <div className={styles.full}>
                                <p className={styles.muted}>
                                    Verificando información de la cita...
                                </p>
                            </div>
                        )}

                        {contextoCita && (
                            <div className={`${styles.sanction} ${styles.full}`}>
                                <strong>
                                    Cita {contextoCita.codigo_cita}
                                </strong>

                                <p>
                                    Persona reportada:{" "}
                                    {contextoCita.nombre_reportado}
                                </p>
                            </div>
                        )}

                        <label>
                            Persona a reportar
                            <select
                                value={formulario.id_reportado}
                                onChange={(e) =>
                                    actualizarFormulario(
                                        "id_reportado",
                                        e.target.value
                                    )
                                }
                                disabled={
                                    guardando ||
                                    miSancion?.suspendido ||
                                    Boolean(citaInicial)
                                }
                                required
                            >
                                <option value="">
                                    Selecciona una persona
                                </option>

                                {usuarios.map((persona) => (
                                    <option
                                        key={persona.id}
                                        value={persona.id}
                                    >
                                        {persona.nombre}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label>
                            Motivo
                            <input
                                value={formulario.motivo}
                                onChange={(e) =>
                                    actualizarFormulario(
                                        "motivo",
                                        e.target.value
                                    )
                                }
                                placeholder="Describe brevemente el motivo"
                                maxLength={150}
                                disabled={
                                    guardando ||
                                    miSancion?.suspendido
                                }
                                required
                            />
                        </label>

                        <label className={styles.full}>
                            Descripción
                            <textarea
                                value={formulario.descripcion}
                                onChange={(e) =>
                                    actualizarFormulario(
                                        "descripcion",
                                        e.target.value
                                    )
                                }
                                placeholder="Explica lo sucedido de forma clara."
                                maxLength={2000}
                                rows={4}
                                disabled={
                                    guardando ||
                                    miSancion?.suspendido
                                }
                                required
                            />
                        </label>

                        <div className={styles.full}>
                            {usuarios.length === 0 && !cargando && (
                                <p className={styles.muted}>
                                    No hay personas disponibles para reportar.
                                </p>
                            )}

                            <button
                                className={styles.primary}
                                type="submit"
                                disabled={
                                    guardando ||
                                    cargando ||
                                    cargandoContexto ||
                                    (!contextoCita && usuarios.length === 0) ||
                                    Boolean(citaInicial && !contextoCita) ||
                                    miSancion?.suspendido
                                }
                            >
                                <Flag size={17} />
                                {guardando
                                    ? "Enviando..."
                                    : "Enviar reporte"}
                            </button>
                        </div>
                    </form>
                </section>
            )}

            <section className={styles.panel}>
                <div className={styles.toolbar}>
                    <div className={styles.sectionHeading}>
                        <ClipboardList size={20} />
                        <div>
                            <h2>
                                {esAdmin
                                    ? "Reportes recibidos"
                                    : "Historial de reportes"}
                            </h2>
                            <p>
                                {reportes.length} reportes
                                {esAdmin
                                    ? ` · ${pendientes} pendientes`
                                    : ""}
                            </p>
                        </div>
                    </div>

                    <label className={styles.filter}>
                        Estado
                        <select
                            value={filtro}
                            onChange={(e) =>
                                setFiltro(e.target.value)
                            }
                        >
                            <option value="todos">Todos</option>
                            {Object.entries(ESTADOS).map(
                                ([valor, etiqueta]) => (
                                    <option key={valor} value={valor}>
                                        {etiqueta}
                                    </option>
                                )
                            )}
                        </select>
                    </label>
                </div>

                {cargando ? (
                    <p className={styles.muted}>
                        Cargando reportes...
                    </p>
                ) : reportesVisibles.length === 0 ? (
                    <div className={styles.empty}>
                        <ClipboardList size={34} />
                        <h3>No hay reportes</h3>
                        <p>No se encontraron registros con este filtro.</p>
                    </div>
                ) : (
                    <div className={styles.list}>
                        {reportesVisibles.map((reporte) => {
                            const sancion = reporte.sancion;
                            const sancionVigente =
                                sancion &&
                                !sancion.anulada_en &&
                                new Date(sancion.fecha_inicio) <= new Date() &&
                                new Date(sancion.fecha_fin) > new Date();

                            const cerrado = [
                                "resuelto",
                                "descartado",
                            ].includes(reporte.estado);

                            const reportado =
                                reporte.reportante === "paciente"
                                    ? reporte.nombre_medico
                                    : reporte.nombre_paciente;

                            return (
                                <article
                                    key={reporte.id}
                                    className={styles.reportCard}
                                >
                                    <div className={styles.cardTop}>
                                        <strong>
                                            Reporte #{reporte.id}
                                        </strong>
                                        <span
                                            className={styles.status}
                                            data-status={reporte.estado}
                                        >
                                            {ESTADOS[reporte.estado] ||
                                                reporte.estado}
                                        </span>
                                    </div>

                                    <div className={styles.meta}>
                                        <span>
                                            {formatearFecha(
                                                reporte.fecha_creacion
                                            )}
                                        </span>
                                        <span>
                                            Reportado por:{" "}
                                            {reporte.reportante}
                                        </span>
                                    </div>

                                    {esAdmin && (
                                        <p>
                                            <strong>Persona reportada:</strong>{" "}
                                            {reportado ||
                                                (reporte.reportante === "paciente"
                                                    ? `Médico #${reporte.medico}`
                                                    : `Paciente #${reporte.paciente}`)}
                                        </p>
                                    )}

                                    <h3>{reporte.motivo}</h3>
                                    <p className={styles.description}>
                                        {reporte.descripcion}
                                    </p>

                                    {reporte.observacion_admin && (
                                        <p className={styles.observation}>
                                            <strong>Observación:</strong>{" "}
                                            {reporte.observacion_admin}
                                        </p>
                                    )}

                                    {sancion && (
                                        <div className={styles.sanction}>
                                            <strong>
                                                Sanción aplicada
                                            </strong>
                                            <p>
                                                {formatearFecha(
                                                    sancion.fecha_inicio
                                                )}{" "}
                                                —{" "}
                                                {formatearFecha(
                                                    sancion.fecha_fin
                                                )}
                                            </p>
                                            <p>
                                                {sancion.anulada_en
                                                    ? "Anulada"
                                                    : sancionVigente
                                                        ? "Activa"
                                                        : "Finalizada"}
                                            </p>

                                            {esAdmin && sancionVigente && (
                                                <button
                                                    type="button"
                                                    className={styles.secondary}
                                                    disabled={guardando}
                                                    onClick={() =>
                                                        anularSancion(
                                                            sancion.id
                                                        )
                                                    }
                                                >
                                                    Levantar suspensión
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {esAdmin && !cerrado && (
                                        <div className={styles.adminActions}>
                                            <label>
                                                Observación del administrador
                                                <textarea
                                                    rows={3}
                                                    maxLength={2000}
                                                    value={
                                                        ediciones[reporte.id]
                                                            ?.observacion_admin ??
                                                        reporte.observacion_admin ??
                                                        ""
                                                    }
                                                    onChange={(e) =>
                                                        actualizarEdicion(
                                                            reporte.id,
                                                            "observacion_admin",
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </label>

                                            <label>
                                                Días de suspensión (1 a 30)
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="30"
                                                    value={
                                                        ediciones[reporte.id]
                                                            ?.dias_suspension ?? 7
                                                    }
                                                    onChange={(e) =>
                                                        actualizarEdicion(
                                                            reporte.id,
                                                            "dias_suspension",
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </label>

                                            <div className={styles.actionButtons}>
                                                {reporte.estado === "pendiente" && (
                                                    <button
                                                        type="button"
                                                        className={styles.secondary}
                                                        disabled={guardando}
                                                        onClick={() =>
                                                            gestionar(
                                                                reporte,
                                                                "revision"
                                                            )
                                                        }
                                                    >
                                                        Revisar
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className={styles.secondary}
                                                    disabled={guardando}
                                                    onClick={() =>
                                                        gestionar(
                                                            reporte,
                                                            "descartar"
                                                        )
                                                    }
                                                >
                                                    Descartar
                                                </button>

                                                <button
                                                    type="button"
                                                    className={styles.primary}
                                                    disabled={guardando}
                                                    onClick={() =>
                                                        gestionar(
                                                            reporte,
                                                            "sancionar"
                                                        )
                                                    }
                                                >
                                                    Sancionar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
