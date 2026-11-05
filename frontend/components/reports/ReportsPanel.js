"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
    listarCitasReportablesService,
    previsualizarSancionService,
    descargarEvidenciaReporteService,
} from "../../src/app/services/reportesServices";

import { obtenerPrimerError } from "../../src/app/utils/errrorUtils";
import styles from "./ReportsPanel.module.css";

const ESTADOS = {
    pendiente: "Pendiente",
    en_revision: "En revisión",
    resuelto: "Resuelto",
    descartado: "Descartado",
};

const MOTIVOS = {
    incumplimiento: "Incumplimiento de la cita",
    trato_inadecuado: "Trato inadecuado",
    conducta_profesional: "Conducta poco profesional",
    acoso: "Acoso o comportamiento inapropiado",
    seguridad: "Problema de seguridad",
    otro: "Otro motivo",
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
export default function ReportsPanel({rol,citaInicial = null,seccionInicial = "reportes",}) {
    const router = useRouter();
    const esAdmin = rol === "admin";
    const rutaBase = `/${rol === "medico" ? "doctor" : "patient"}/reports`;
    const seccionActiva = citaInicial ? "crear" : seccionInicial;
    const [reportes, setReportes] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [miSancion, setMiSancion] = useState(null);

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [filtro, setFiltro] = useState("todos");

    const [formulario, setFormulario] = useState({
        id_reportado: "",
        id_cita: "",
        otro_motivo: "",
        motivo: "",
        descripcion: "",
    });

    const [evidencia, setEvidencia] = useState(null);
    const archivoInput = useRef(null);
    const [citas, setCitas] = useState([]);
    const [cargandoCitas, setCargandoCitas] = useState(false);
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
            ...(campo === "id_reportado" ? { id_cita: "" } : {}),
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

    useEffect(() => {
        if (esAdmin || citaInicial || !formulario.id_reportado) {
            setCitas([]);
            setCargandoCitas(false);
            return;
        }
        let cancelado = false;
        setCitas([]);
        setCargandoCitas(true);
        listarCitasReportablesService(formulario.id_reportado)
            .then((lista) => { if (!cancelado) setCitas(lista ?? []); })
            .catch((err) => { if (!cancelado) setError(mensajeError(err)); })
            .finally(() => { if (!cancelado) setCargandoCitas(false); });
        return () => { cancelado = true; };
    }, [esAdmin, citaInicial, formulario.id_reportado]);

    const seleccionarEvidencia = (evento) => {
        const archivo = evento.target.files?.[0];
        if (!archivo) return;
        const extensiones = /\.(jpe?g|png|pdf)$/i;
        const tipos = ["image/jpeg", "image/png", "application/pdf"];
        if (!extensiones.test(archivo.name) || !tipos.includes(archivo.type) ||
            archivo.size === 0 || archivo.size > 10 * 1024 * 1024) {
            setError("Selecciona un JPG, JPEG, PNG o PDF válido, de hasta 10 MB.");
            evento.target.value = "";
            setEvidencia(null);
            return;
        }
        setError("");
        setEvidencia(archivo);
    };

    const descargarEvidencia = async (reporte) => {
        setGuardando(true);
        setError("");
        try {
            const archivo = await descargarEvidenciaReporteService(reporte.id);
            const url = URL.createObjectURL(archivo);
            const enlace = document.createElement("a");
            enlace.href = url;
            enlace.download = reporte.evidencia.nombre;
            document.body.appendChild(enlace);
            enlace.click();
            enlace.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
            setError(mensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    const crearReporte = async (evento) => {
        evento.preventDefault();

        if (citaInicial && !contextoCita) {
            setError("No se pudo verificar la cita seleccionada.");
            return;
        }

        if (guardando || cargandoContexto || cargandoCitas) return;

        if (
            !formulario.id_reportado ||
            !formulario.motivo.trim() ||
            !formulario.descripcion.trim() ||
            (formulario.motivo === "otro" && !formulario.otro_motivo?.trim())
        ) {
            setError("Completa todos los campos del reporte.");
            return;
        }

        setGuardando(true);
        setError("");

        try {
            const datos = new FormData();
            datos.append("id_reportado", formulario.id_reportado);
            datos.append("motivo", formulario.motivo);
            datos.append("descripcion", formulario.descripcion.trim());
            if (formulario.motivo === "otro") datos.append("otro_motivo", formulario.otro_motivo.trim());
            const cita = contextoCita?.id_cita || formulario.id_cita;
            if (cita) datos.append("id_cita", cita);
            if (evidencia) datos.append("evidencia", evidencia);
            await crearReporteService(datos);
            setFormulario({ id_reportado: "", id_cita: "", motivo: "", otro_motivo: "", descripcion: "" });
            setEvidencia(null);
            if (archivoInput.current) archivoInput.current.value = "";
            await Swal.fire({
                icon: "success",
                title: "Reporte enviado",
                text: "El administrador revisará tu reporte.",
            });

            await cargar();
            router.replace(rutaBase);

        } catch (err) {
            setError(mensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    const gestionar = async (reporte, accion) => {
        if (guardando) return;
        const valores = ediciones[reporte.id] ?? {};
        const observacion = (valores.observacion_admin ?? reporte.observacion_admin ?? "").trim();
        const datos = { accion, observacion_admin: observacion,
            observacion_reportante: (valores.observacion_reportante ?? reporte.observacion_reportante ?? "").trim() };
        if (accion === "sancionar") {
            datos.tipo = valores.tipo ?? "temporal";
            const dias = Number(valores.dias_suspension ?? 7);
            if (!observacion) {
                setError("Escribe el motivo de la sanción.");
                return;
            }
            if (datos.tipo === "temporal") {
                if (!Number.isInteger(dias) || dias < 1 || dias > 30) {
                    setError("Indica entre 1 y 30 días de suspensión.");
                    return;
                }
                datos.dias_suspension = dias;
            }
        }
        setGuardando(true);
        setError("");
        try {
            let detalle = "Se actualizará el estado del reporte.";
            if (accion === "sancionar") {
                const previa = await previsualizarSancionService(reporte.id, datos);
                datos.token_vista_previa = previa.token_vista_previa;
                detalle = [
                    `Persona: ${previa.nombre_sancionado}`,
                    previa.tipo === "indefinida" ? "Suspensión indefinida" : `Suspensión temporal: ${previa.dias_suspension} días`,
                    `Inicio: ${formatearFecha(previa.fecha_inicio)}`,
                    `Finalización: ${previa.fecha_fin ? formatearFecha(previa.fecha_fin) : "Sin fecha; requiere habilitación administrativa"}`,
                    `Citas que se cancelarán inmediatamente: ${previa.cantidad_citas}`,
                    ...previa.citas.map((cita) => `${cita.codigo_cita} · ${formatearFecha(cita.fecha_programada)}`),
                    "Las fechas y las citas se verificarán de nuevo al confirmar.",
                ].join("\n");
            }
            const confirmacion = await Swal.fire({
                title: accion === "sancionar" ? "¿Aplicar suspensión?" : accion === "descartar" ? "¿Descartar reporte?" : "¿Iniciar revisión?",
                text: detalle,
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Confirmar",
                cancelButtonText: "Volver",
            });
            if (!confirmacion.isConfirmed) return;
            await gestionarReporteService(reporte.id, datos);
            await cargar();
            await Swal.fire({ icon: "success", title: "Reporte actualizado", timer: 1800, showConfirmButton: false });
        } catch (err) {
            setError(err?.response?.status === 409
                ? `${mensajeError(err)} Vuelve a seleccionar Sancionar para revisar la vista previa actualizada.`
                : mensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    const anularSancion = async (sancionId) => {
        const confirmacion = await Swal.fire({
            title: "¿Habilitar usuario?",
            input: "textarea",
            inputLabel: "Motivo administrativo de la rehabilitación",
            inputAttributes: { maxlength: "2000" },
            inputValidator: (valor) => !valor.trim() ? "Escribe el motivo de la rehabilitación." : undefined,
            text: "La cuenta recuperará los permisos restringidos. Las citas canceladas no se restaurarán automáticamente.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Habilitar usuario",
            cancelButtonText: "Volver",
        });

        if (!confirmacion.isConfirmed) return;

        setGuardando(true);
        setError("");

        try {
            await anularSancionService(sancionId, confirmacion.value.trim());
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

    const titulo = esAdmin ? "Gestión de reportes" : "Reportes y seguridad";

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
                            : seccionActiva === "crear"
                                ? "Describe la situación que deseas reportar."
                                : "Consulta tus reportes y realiza su seguimiento."}
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
                            {miSancion.sancion?.fecha_fin
                                ? `La suspensión termina el ${formatearFecha(miSancion.sancion.fecha_fin)}.`
                                : "Suspensión indefinida, vigente hasta que administración la levante."}
                            {" "}Puedes consultar tu situación y presentar reportes de seguridad.
                        </p>
                        <p>
                            {miSancion.sancion?.motivo}
                        </p>
                    </div>
                </section>
            )}

            {!esAdmin && (
                <nav
                    aria-label="Secciones de reportes"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "12px",
                    }}
                >
                    <Link
                        href={rutaBase}
                        className={
                            seccionActiva === "reportes"
                                ? styles.primary
                                : styles.secondary
                        }
                        aria-current={
                            seccionActiva === "reportes"
                                ? "page"
                                : undefined
                        }
                        style={{ textDecoration: "none" }}
                    >
                        <ClipboardList size={18} />
                        Mis reportes
                    </Link>

                    <Link
                        href={`${rutaBase}?seccion=crear`}
                        className={
                            seccionActiva === "crear"
                                ? styles.primary
                                : styles.secondary
                        }
                        aria-current={
                            seccionActiva === "crear"
                                ? "page"
                                : undefined
                        }
                        style={{ textDecoration: "none" }}
                    >
                        <Flag size={18} />
                        Crear reporte
                    </Link>
                </nav>
            )}

            {!esAdmin && seccionActiva === "crear" && (
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
                                    Boolean(citaInicial)
                                }
                                required
                            >
                                <option value="">
                                    Selecciona una persona
                                </option>

                                {contextoCita && !usuarios.some((persona) => String(persona.id) === String(contextoCita.id_reportado)) && (
                                    <option value={contextoCita.id_reportado}>{contextoCita.nombre_reportado}</option>
                                )}
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

                        {!citaInicial && (
                            <label>
                                Cita relacionada (opcional)
                                <select value={formulario.id_cita ?? ""}
                                    onChange={(e) => actualizarFormulario("id_cita", e.target.value)}
                                    disabled={guardando || cargandoCitas || !formulario.id_reportado}>
                                    <option value="">{cargandoCitas ? "Cargando citas..." : "Sin cita específica"}</option>
                                    {citas.map((cita) => (
                                        <option key={cita.id} value={cita.id}>
                                            {cita.codigo_cita} · {formatearFecha(cita.fecha_programada)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}
                        <label>
                            Motivo
                            <select value={formulario.motivo}
                                onChange={(e) => actualizarFormulario("motivo", e.target.value)}
                                disabled={guardando} required>
                                <option value="">Selecciona un motivo</option>
                                {Object.entries(MOTIVOS).map(([valor, nombre]) => (
                                    <option key={valor} value={valor}>{nombre}</option>
                                ))}
                            </select>
                        </label>
                        {formulario.motivo === "otro" && (
                            <label>
                                Especifica el motivo
                                <input value={formulario.otro_motivo ?? ""} maxLength={150}
                                    onChange={(e) => actualizarFormulario("otro_motivo", e.target.value)}
                                    disabled={guardando} required />
                            </label>
                        )}

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
                                    guardando
                                }
                                required
                            />
                        </label>

                        <label className={styles.full}>
                            Evidencia (opcional, JPG, JPEG, PNG o PDF, hasta 10 MB)
                            <input ref={archivoInput} type="file" accept=".jpg,.jpeg,.png,.pdf"
                                disabled={guardando} onChange={seleccionarEvidencia} />
                            {evidencia && <span>{evidencia.name}</span>}
                        </label>
                        {evidencia && (
                            <button type="button" className={styles.secondary} disabled={guardando}
                                onClick={() => {
                                    setEvidencia(null);
                                    if (archivoInput.current) archivoInput.current.value = "";
                                }}>Retirar evidencia</button>
                        )}

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
                                    Boolean(citaInicial && !contextoCita) || cargandoCitas
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

            {!esAdmin && seccionActiva === "reportes" && miSancion?.historial?.length > 0 && (
                <section className={styles.panel}>
                    <h2>Mis sanciones</h2>
                    {miSancion.historial.map((sancion) => (
                        <article key={sancion.id} className={styles.sanction}>
                            <strong>{sancion.tipo === "indefinida" ? "Suspensión indefinida" : "Suspensión temporal"}</strong>
                            <p>{formatearFecha(sancion.fecha_inicio)} — {sancion.fecha_fin ? formatearFecha(sancion.fecha_fin) : "Sin fecha de finalización"}</p>
                            <p>{sancion.motivo}</p>
                            <p>{sancion.anulada_en ? `Levantada el ${formatearFecha(sancion.anulada_en)}` : sancion.esta_activa ? "Activa" : "Finalizada"}</p>
                        </article>
                    ))}
                </section>
            )}

            {(esAdmin || seccionActiva === "reportes") && (
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
                                    sancion?.esta_activa && !sancion.anulada_en &&
                                    (!sancion.fecha_fin || new Date(sancion.fecha_fin) > new Date());

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
                                                {reporte.reportante === "paciente" ? reporte.nombre_paciente : reporte.nombre_medico}
                                            </span>
                                        </div>

                                        <p>
                                            <strong>Persona reportada:</strong>{" "}
                                            {reportado || "Nombre no disponible"}
                                        </p>

                                        {reporte.codigo_cita && <p><strong>Cita relacionada:</strong> {reporte.codigo_cita}</p>}
                                        <h3>{reporte.motivo_display || MOTIVOS[reporte.motivo] || reporte.motivo}</h3>
                                        {reporte.otro_motivo && <p>{reporte.otro_motivo}</p>}
                                        {reporte.evidencia && (
                                            <button type="button" className={styles.secondary} disabled={guardando}
                                                onClick={() => descargarEvidencia(reporte)}>
                                                Descargar evidencia: {reporte.evidencia.nombre}
                                            </button>
                                        )}
                                        <p className={styles.description}>
                                            {reporte.descripcion}
                                        </p>

                                        {reporte.observacion_admin && (
                                            <p className={styles.observation}>
                                                <strong>Observación:</strong>{" "}
                                                {reporte.observacion_admin}
                                            </p>
                                        )}

                                        {esAdmin && reporte.observacion_reportante && (
                                            <p className={styles.observation}><strong>Observación para el reportante:</strong> {reporte.observacion_reportante}</p>
                                        )}
                                        {sancion && (
                                            <div className={styles.sanction}>
                                                <strong>
                                                    {sancion.tipo === "indefinida" ? "Suspensión indefinida" : "Suspensión temporal"}
                                                </strong>
                                                <p>
                                                    {formatearFecha(
                                                        sancion.fecha_inicio
                                                    )}{" "}
                                                    —{" "}
                                                    {sancion.fecha_fin ? formatearFecha(sancion.fecha_fin) : "Sin fecha de finalización"}
                                                </p>
                                                <p>
                                                    {sancion.anulada_en
                                                        ? "Anulada"
                                                        : sancionVigente
                                                            ? "Activa"
                                                            : "Finalizada"}
                                                </p>

                                                {sancion.anulada_en && (
                                                    <p>Habilitado el {formatearFecha(sancion.anulada_en)}.
                                                        {esAdmin && ` Motivo: ${sancion.motivo_anulacion || "Sin observación"}`}
                                                    </p>
                                                )}
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
                                                        Habilitar usuario
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {esAdmin && !cerrado && (
                                            <div className={styles.adminActions}>
                                                <label>
                                                    Nota administrativa / motivo de sanción (privado para el reportante)
                                                    <textarea
                                                        rows={3}
                                                        maxLength={2000}
                                                        disabled={guardando}
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
                                                    Observación para el reportante
                                                    <textarea rows={3} maxLength={2000} disabled={guardando}
                                                        value={ediciones[reporte.id]?.observacion_reportante ?? reporte.observacion_reportante ?? ""}
                                                        onChange={(e) => actualizarEdicion(reporte.id, "observacion_reportante", e.target.value)} />
                                                </label>
                                                <label>
                                                    Tipo de suspensión
                                                    <select value={ediciones[reporte.id]?.tipo ?? "temporal"}
                                                        disabled={guardando}
                                                        onChange={(e) => actualizarEdicion(reporte.id, "tipo", e.target.value)}>
                                                        <option value="temporal">Suspensión temporal</option>
                                                        <option value="indefinida">Suspensión indefinida</option>
                                                    </select>
                                                </label>
                                                {(ediciones[reporte.id]?.tipo ?? "temporal") === "temporal" && <label>
                                                    Días de suspensión (1 a 30)
                                                    <input
                                                        type="number"
                                                        disabled={guardando}
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
                                                </label>}

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
            )}
        </div>
    );
}
