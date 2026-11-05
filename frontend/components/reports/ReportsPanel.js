"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
    Flag,
    ShieldAlert,
    ClipboardList,
    Eye,
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
    obtenerAntecedentesReporteService,
} from "../../src/app/services/reportesServices";

import { obtenerPrimerError } from "../../src/app/utils/errrorUtils";
import AdminPageHeader from "../admin/PageHeader/AdminPageHeader";
import adminPageStyles from "../../src/app/admin/adminPages.module.css";
import Modal from "../ui/Modal/Modal";
import Pagination from "../ui/Pagination/Pagination";
import styles from "./ReportsPanel.module.css";

const ESTADOS = {
    pendiente: "Pendiente",
    en_revision: "En revisión",
    resuelto: "Resuelto",
    descartado: "Descartado",
};

const ESTADOS_ADMIN = {
    pendiente: "Pendientes",
    en_revision: "En revisión",
    descartado: "Descartados",
    advertido: "Advertidos",
    sancion_activa: "Sanciones activas",
    sancion_finalizada: "Sanciones finalizadas",
    sancion_levantada: "Sanciones levantadas",
    resuelto: "Resueltos sin decisión registrada",
    sancion_programada: "Sanciones programadas",
};
const GRUPOS_ADMIN = [
    { valor: "todos", etiqueta: "Todos" },
    { valor: "pendiente", etiqueta: "Pendientes", prioritario: true },
    { valor: "en_revision", etiqueta: "En revisión", prioritario: true },
    { valor: "sanciones", etiqueta: "Sanciones" },
    { valor: "historial", etiqueta: "Historial" },
];
const ESTADOS_SANCIONES = ["sancion_activa", "sancion_finalizada", "sancion_levantada", "sancion_programada"];
const ESTADOS_HISTORIAL = ["advertido", "descartado", "resuelto"];
const REPORTES_POR_PAGINA = 8;
const ERROR_RECARGA = "La operación se guardó, pero no fue posible actualizar los reportes. Se reintentará automáticamente.";
const AVISO_SINCRONIZACION = "Los datos están pendientes de actualización. Las acciones se habilitarán al completar la actualización automática.";

function coincideEstado(estado, filtro) {
    if (filtro === "todos") return true;
    if (filtro === "sanciones") return ESTADOS_SANCIONES.includes(estado);
    if (filtro === "historial") return ESTADOS_HISTORIAL.includes(estado);
    return estado === filtro;
}

const SITUACIONES = {
    ...ESTADOS, advertido: "Advertido", sancion_activa: "Sanción activa",
    sancion_finalizada: "Sanción finalizada", sancion_levantada: "Sanción levantada",
    sancion_programada: "Sanción programada",
};
const ACCIONES = { descartar: "Descartar", advertir: "Advertir", sancionar: "Sancionar" };
const CONFIRMACIONES = { descartar: "Confirmar descarte", advertir: "Confirmar advertencia", sancionar: "Ver vista previa" };

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
        obtenerPrimerError(typeof error?.response?.data === "object" ? error.response.data : null) ||
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
    const [actualizacionPendiente, setActualizacionPendiente] = useState(false);
    const [error, setError] = useState("");
    const [filtro, setFiltro] = useState("todos");
    const [pagina, setPagina] = useState(1);
    const [reporteSeleccionadoId, setReporteSeleccionadoId] = useState(null);
    const [detalleAbierto, setDetalleAbierto] = useState(false);
    const regresoDetalle = useRef(null);
    const encabezadoLista = useRef(null);
    const contenidoDetalle = useRef(null);

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
    const [antecedentes, setAntecedentes] = useState({});
    const cargaActual = useRef(0);
    const [contextoCita, setContextoCita] = useState(null);
    const [cargandoContexto, setCargandoContexto] = useState(
        Boolean(citaInicial)
    );

    const cargar = useCallback(async (silencioso = false) => {
        const carga = ++cargaActual.current;
        if (!silencioso) { setCargando(true); setError(""); }

        try {
            if (esAdmin) {
                const lista = await listarReportesService();
                if (carga !== cargaActual.current) return false;
                setReportes(lista ?? []);
            } else {
                const [lista, personas, sancion] = await Promise.all([
                    listarReportesService(),
                    listarUsuariosReportablesService(),
                    obtenerMiSancionService(),
                ]);

                if (carga !== cargaActual.current) return false;
                setReportes(lista ?? []);
                setUsuarios(personas ?? []);
                setMiSancion(sancion ?? null);
            }
            setActualizacionPendiente(false);
            setError((anterior) => anterior === ERROR_RECARGA ? "" : anterior);
            return true;
        } catch (err) {
            if (!silencioso && carga === cargaActual.current) setError(mensajeError(err));
            return false;
        } finally {
            if (carga === cargaActual.current) setCargando(false);
        }
    }, [esAdmin]);

    useEffect(() => {
        void cargar();
    }, [cargar]);

    useEffect(() => {
        const actualizar = () => {
            if (!guardando && document.visibilityState === "visible") void cargar(true);
        };
        const intervalo = window.setInterval(actualizar, 30000);
        window.addEventListener("focus", actualizar);
        document.addEventListener("visibilitychange", actualizar);
        return () => {
            window.clearInterval(intervalo);
            window.removeEventListener("focus", actualizar);
            document.removeEventListener("visibilitychange", actualizar);
        };
    }, [cargar, guardando]);

    const seleccionarAccion = (id, accion) => {
        setEdiciones((previas) => ({ ...previas, [id]: accion
            ? { accion, observacion_admin: "", observacion_reportante: "", tipo: "temporal", dias_suspension: 7 }
            : undefined }));
        setError("");
    };

    const consultarAntecedentes = async (reporte) => {
        if (antecedentes[reporte.id]?.abierto) {
            setAntecedentes((previos) => ({ ...previos, [reporte.id]: { ...previos[reporte.id], abierto: false } }));
            return;
        }
        setAntecedentes((previos) => ({ ...previos, [reporte.id]: { abierto: true, cargando: true } }));
        try {
            const lista = await obtenerAntecedentesReporteService(reporte.id);
            setAntecedentes((previos) => ({ ...previos, [reporte.id]: { abierto: true, lista } }));
        } catch (err) {
            setAntecedentes((previos) => ({ ...previos, [reporte.id]: undefined }));
            setError(mensajeError(err));
        }
    };

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

    const mostrarConfirmacion = async (opciones) => {
        const focoAnterior = document.activeElement;
        const resultado = await Swal.fire({
            ...(esAdmin ? {
                customClass: { popup: styles.confirmationPopup },
                keydownListenerCapture: true,
                returnFocus: false,
            } : {}),
            ...opciones,
        });
        if (esAdmin) {
            // Una decisión puede retirar el botón que abrió la confirmación.
            const destino = focoAnterior?.isConnected && !focoAnterior.disabled
                ? focoAnterior : contenidoDetalle.current;
            destino?.focus({ preventScroll: true });
        }
        return resultado;
    };

    const gestionar = async (reporte, accion) => {
        if (guardando || actualizacionPendiente) return;
        const valores = ediciones[reporte.id] ?? {};
        if (accion !== "revision" && reporte.estado !== "en_revision") {
            setError("Primero debes iniciar la revisión del reporte.");
            return;
        }
        const observacion = (valores.observacion_admin ?? "").trim();
        if (accion !== "revision" && !observacion) {
            setError("Escribe el motivo de la decisión administrativa.");
            return;
        }
        const datos = accion === "revision" ? { accion } : {
            accion, observacion_admin: observacion,
            observacion_reportante: (valores.observacion_reportante ?? "").trim(),
        };
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
            let detalle = accion === "advertir" ? "Se notificará al usuario reportado. Esta advertencia no suspende su cuenta ni cancela citas." : "Se actualizará el estado del reporte.";
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
            const confirmacion = await mostrarConfirmacion({
                title: accion === "sancionar" ? "¿Aplicar suspensión?" : accion === "descartar" ? "¿Descartar reporte?" : accion === "advertir" ? "¿Emitir advertencia formal?" : "¿Iniciar revisión?",
                text: detalle,
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Confirmar",
                cancelButtonText: "Volver",
            });
            if (!confirmacion.isConfirmed) return;
            const respuesta = await gestionarReporteService(reporte.id, datos);
            if (respuesta.data) {
                setReportes((anteriores) => anteriores.map((actual) => actual.id === reporte.id ? respuesta.data : actual));
            }
            seleccionarAccion(reporte.id, null);
            setAntecedentes({});
            setActualizacionPendiente(true);
            if (!await cargar()) {
                setError(ERROR_RECARGA);
                return;
            }
            await mostrarConfirmacion({ icon: "success", title: "Reporte actualizado", timer: 1800, showConfirmButton: false });
        } catch (err) {
            if (err?.response?.status === 409) {
                setActualizacionPendiente(true);
                await cargar(true);
            }
            setError(err?.response?.status === 409
                ? `${mensajeError(err)} Revisa el estado actual del reporte antes de volver a confirmar.`
                : mensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    const anularSancion = async (sancionId) => {
        if (guardando || actualizacionPendiente) return;
        const confirmacion = await mostrarConfirmacion({
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
            setAntecedentes({});
            setActualizacionPendiente(true);
            if (!await cargar()) {
                setError(ERROR_RECARGA);
                return;
            }

            await mostrarConfirmacion({
                icon: "success",
                title: "Suspensión levantada",
            });
        } catch (err) {
            if (err?.response?.status === 409) {
                setActualizacionPendiente(true);
                await cargar(true);
            }
            setError(mensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    const reportesVisibles = reportes.filter(
        (reporte) =>
            coincideEstado(esAdmin ? reporte.estado_administrativo : reporte.estado, filtro)
    );

    const conteos = Object.fromEntries(Object.keys(ESTADOS_ADMIN).map((estado) => [
        estado, reportes.filter((reporte) => reporte.estado_administrativo === estado).length,
    ]));
    const grupoActivo = ESTADOS_SANCIONES.includes(filtro) ? "sanciones"
        : ESTADOS_HISTORIAL.includes(filtro) ? "historial" : filtro;
    const totalPaginas = Math.max(1, Math.ceil(reportesVisibles.length / REPORTES_POR_PAGINA));
    const paginaActual = Math.min(pagina, totalPaginas);
    const reportesPagina = reportesVisibles.slice(
        (paginaActual - 1) * REPORTES_POR_PAGINA, paginaActual * REPORTES_POR_PAGINA
    );
    const reporteSeleccionado = reportes.find((reporte) => reporte.id === reporteSeleccionadoId);
    const cambiarFiltro = (valor) => { setFiltro(valor); setPagina(1); };
    const abrirDetalle = (reporte, evento) => {
        regresoDetalle.current = { elemento: evento.currentTarget, scroll: window.scrollY };
        setError("");
        setReporteSeleccionadoId(reporte.id);
        setDetalleAbierto(true);
    };
    const cerrarDetalle = () => {
        if (guardando || Swal.isVisible()) return;
        setDetalleAbierto(false);
    };
    const restaurarNavegacion = () => {
        const regreso = regresoDetalle.current;
        (regreso?.elemento?.isConnected ? regreso.elemento : encabezadoLista.current)?.focus({ preventScroll: true });
        if (regreso) window.scrollTo({ top: regreso.scroll, behavior: "instant" });
        seleccionarAccion(reporteSeleccionadoId, null);
        setReporteSeleccionadoId(null);
    };

    const renderDetalleReporte = (reporte) => {
        const sancion = reporte.sancion;
        const sancionVigente = sancion?.estado_vigencia === "sancion_activa";
        const situacion = esAdmin ? reporte.estado_administrativo : reporte.estado;
        const edicion = ediciones[reporte.id];

        const cerrado = [
            "resuelto",
            "descartado",
        ].includes(reporte.estado);

        const reportado =
            reporte.reportante === "paciente"
                ? reporte.nombre_medico
                : reporte.nombre_paciente;
        const informacion = (<>
            <div className={styles.cardTop}>
                <strong>
                    Reporte #{reporte.id}
                </strong>
                <span
                    className={esAdmin ? styles.adminStatus : styles.status}
                    data-status={situacion}
                >
                    {SITUACIONES[situacion] || situacion}
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
        </>);
        const historial = (<>
            {esAdmin && reporte.observacion_admin && (
                <p className={styles.observation}>
                    <strong>Motivo de la decisión administrativa:</strong>{" "}
                    {reporte.observacion_admin}
                </p>
            )}

            {/* Respuesta dirigida al reportante */}
            {reporte.observacion_reportante && (
                <p className={styles.observation}>
                    <strong>Respuesta al reportante:</strong>{" "}
                    {reporte.observacion_reportante}
                </p>
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
                        {SITUACIONES[sancion.estado_vigencia] || "Estado no disponible"}
                    </p>

                    <p>Aplicada por: {sancion.nombre_administrador || reporte.nombre_administrador || "No registrado"}</p>
                    <p>Motivo: {sancion.motivo}</p>
                    {sancion.anulada_en && (
                        <p>Habilitado el {formatearFecha(sancion.anulada_en)} por {sancion.nombre_rehabilitador || "administrador no registrado"}.
                            {esAdmin && ` Motivo: ${sancion.motivo_anulacion || "Sin observación"}`}
                        </p>
                    )}

                </div>
            )}

            {esAdmin && (
                <>
                    {reporte.fecha_revision && (
                        <p className={styles.meta}>Revisión o resolución: {formatearFecha(reporte.fecha_revision)} · {reporte.nombre_administrador || "Administrador no registrado"}</p>
                    )}
                    {reporte.decision === "advertir" && <p className={styles.sanction}>Advertencia formal emitida. No genera suspensión ni cancelación de citas.</p>}
                    <details className={styles.observation} open>
                        <summary tabIndex={0}>Cambios de estado y decisiones</summary>
                        {reporte.historial_administrativo?.length ? reporte.historial_administrativo.map((evento) => (
                            <div key={evento.id}>
                                <p><strong>{evento.accion_display}</strong> · {formatearFecha(evento.fecha)}</p>
                                <p>{evento.accion === "creacion" ? "Registrado por el reportante" : evento.nombre_administrador || "Administrador no registrado"}</p>
                                <p>{evento.estado_anterior ? `${ESTADOS[evento.estado_anterior]} → ` : ""}{ESTADOS[evento.estado_nuevo]}</p>
                                {evento.motivo && <p>Motivo: {evento.motivo}</p>}
                                {evento.respuesta_reportante && <p>Respuesta al reportante: {evento.respuesta_reportante}</p>}
                            </div>
                        )) : <p>No se guardaron transiciones históricas para este reporte. Se muestra únicamente la información disponible del caso.</p>}
                    </details>
                    <button type="button" className={styles.secondary}
                        disabled={guardando || antecedentes[reporte.id]?.cargando}
                        aria-expanded={Boolean(antecedentes[reporte.id]?.abierto)}
                        onClick={() => consultarAntecedentes(reporte)}>
                        {antecedentes[reporte.id]?.abierto ? "Ocultar antecedentes" : "Consultar antecedentes de la persona reportada"}
                    </button>
                    {antecedentes[reporte.id]?.abierto && (
                        <div className={styles.sanction}>
                            <strong>Otras advertencias y sanciones de {reportado}</strong>
                            {antecedentes[reporte.id].cargando ? <p>Cargando antecedentes...</p> :
                                antecedentes[reporte.id].lista?.length ? antecedentes[reporte.id].lista.map((anterior) => (
                                    <div key={anterior.id}>
                                        <p><strong>Reporte #{anterior.id}</strong> · {SITUACIONES[anterior.estado_administrativo]}</p>
                                        <p>{formatearFecha(anterior.fecha_revision || anterior.fecha_creacion)} · {anterior.nombre_administrador || "Administrador no registrado"}</p>
                                        <p>{anterior.observacion_admin || anterior.sancion?.motivo}</p>
                                        {anterior.sancion && <p>{formatearFecha(anterior.sancion.fecha_inicio)} — {anterior.sancion.fecha_fin ? formatearFecha(anterior.sancion.fecha_fin) : "Sin fecha de finalización"}</p>}
                                    </div>
                                )) : <p>No hay otras advertencias o sanciones registradas.</p>}
                        </div>
                    )}
                </>
            )}
        </>);
        const acciones = (<>
            {esAdmin && !cerrado && (
                <div className={styles.adminActions}>
                    <div className={styles.actionButtons}>
                        {reporte.estado === "pendiente" ? (
                            <button type="button" className={styles.primary} disabled={guardando || actualizacionPendiente}
                                onClick={() => gestionar(reporte, "revision")}>Revisar</button>
                        ) : reporte.estado === "en_revision" && Object.entries(ACCIONES).map(([accion, etiqueta]) => (
                            <button key={accion} type="button" disabled={guardando || actualizacionPendiente}
                                className={edicion?.accion === accion ? styles.primary : styles.secondary}
                                aria-pressed={edicion?.accion === accion}
                                onClick={() => seleccionarAccion(reporte.id, accion)}>{etiqueta}</button>
                        ))}
                    </div>
                    {reporte.estado === "en_revision" && edicion?.accion && (
                        <form className={styles.adminActions} onSubmit={(evento) => {
                            evento.preventDefault();
                            void gestionar(reporte, edicion.accion);
                        }}>
                            <strong>{ACCIONES[edicion.accion]} reporte #{reporte.id}</strong>
                            <label>
                                Motivo de la decisión administrativa
                                <textarea rows={3} maxLength={2000} required disabled={guardando || actualizacionPendiente}
                                    value={edicion.observacion_admin}
                                    onChange={(e) => actualizarEdicion(reporte.id, "observacion_admin", e.target.value)} />
                            </label>
                            {edicion.accion !== "descartar" && <p className={styles.muted}>Este motivo se comunicará a la persona reportada.</p>}
                            <label>
                                Respuesta al reportante (opcional)
                                <textarea rows={3} maxLength={2000} disabled={guardando || actualizacionPendiente}
                                    value={edicion.observacion_reportante}
                                    onChange={(e) => actualizarEdicion(reporte.id, "observacion_reportante", e.target.value)} />
                            </label>
                            {edicion.accion === "sancionar" && (
                                <>
                                    <label>Tipo de suspensión
                                        <select value={edicion.tipo} disabled={guardando || actualizacionPendiente}
                                            onChange={(e) => actualizarEdicion(reporte.id, "tipo", e.target.value)}>
                                            <option value="temporal">Suspensión temporal</option>
                                            <option value="indefinida">Suspensión indefinida</option>
                                        </select>
                                    </label>
                                    {edicion.tipo === "temporal" && <label>Días de suspensión (1 a 30)
                                        <input type="number" min="1" max="30" required disabled={guardando || actualizacionPendiente}
                                            value={edicion.dias_suspension}
                                            onChange={(e) => actualizarEdicion(reporte.id, "dias_suspension", e.target.value)} />
                                    </label>}
                                </>
                            )}
                            <div className={styles.actionButtons}>
                                <button type="button" className={styles.secondary} disabled={guardando || actualizacionPendiente}
                                    onClick={() => seleccionarAccion(reporte.id, null)}>Cancelar</button>
                                <button type="submit" className={styles.primary} disabled={guardando || actualizacionPendiente}>
                                    {CONFIRMACIONES[edicion.accion]}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}
            {esAdmin && sancionVigente && (
                <button type="button" className={styles.secondary} disabled={guardando || actualizacionPendiente}
                    onClick={() => anularSancion(sancion.id)}>
                    Habilitar usuario
                </button>
            )}
            {esAdmin && cerrado && !sancionVigente && (
                <p className={styles.muted}>Este reporte está cerrado. No hay acciones disponibles para su estado actual.</p>
            )}
        </>);
        if (!esAdmin) return (
            <article key={reporte.id} className={styles.reportCard}>
                {informacion}{historial}{acciones}
            </article>
        );
        return (
            <div className={styles.detailSections}>
                <section className={styles.detailSection} aria-labelledby="reporte-informacion">
                    <h3 id="reporte-informacion">Información del reporte</h3>
                    {informacion}
                </section>
                <section className={styles.detailSection} aria-labelledby="reporte-historial">
                    <h3 id="reporte-historial">Historial administrativo</h3>
                    {historial}
                </section>
                <section className={styles.detailSection} aria-labelledby="reporte-acciones" aria-busy={guardando}>
                    <h3 id="reporte-acciones">Acciones administrativas</h3>
                    {reporte.estado === "pendiente" && <p className={styles.muted}>Inicia la revisión para habilitar las decisiones de este reporte.</p>}
                    {acciones}
                </section>
            </div>
        );
    };

    const titulo = esAdmin ? "Gestión de reportes" : "Reportes y seguridad";

    return (
        <div className={`${styles.root} ${esAdmin ? adminPageStyles.page : ""}`} data-role={rol}>
            {esAdmin ? <AdminPageHeader eyebrow="Seguridad" title={titulo} description="Revisa los casos y administra las sanciones." /> : (
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

            </header>
            )}

            {(error || actualizacionPendiente) && !detalleAbierto && (
                <div className={styles.error} role="alert">
                    {error || AVISO_SINCRONIZACION}
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
                    className={styles.personalNav}
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

            {!esAdmin && seccionActiva === "reportes" && miSancion?.advertencias?.length > 0 && (
                <section className={`${styles.panel} ${styles.personalWarnings}`}>
                    <h2>Mis advertencias</h2>
                    {miSancion.advertencias.map((advertencia) => (
                        <article key={advertencia.id} className={styles.observation}>
                            <strong>Advertencia formal · {formatearFecha(advertencia.fecha_revision)}</strong>
                            <p>{advertencia.observacion_admin}</p>
                            <p>Esta advertencia no suspende tu cuenta ni cancela tus citas.</p>
                        </article>
                    ))}
                </section>
            )}

            {!esAdmin && seccionActiva === "reportes" && miSancion?.historial?.length > 0 && (
                <section className={`${styles.panel} ${styles.personalSanctions}`}>
                    <h2>Mis sanciones</h2>
                    {miSancion.historial.map((sancion) => (
                        <article key={sancion.id} className={styles.sanction}>
                            <strong>{sancion.tipo === "indefinida" ? "Suspensión indefinida" : "Suspensión temporal"}</strong>
                            <p>{formatearFecha(sancion.fecha_inicio)} — {sancion.fecha_fin ? formatearFecha(sancion.fecha_fin) : "Sin fecha de finalización"}</p>
                            <p>{sancion.motivo}</p>
                            <p>{SITUACIONES[sancion.estado_vigencia] || "Estado no disponible"}</p>
                        </article>
                    ))}
                </section>
            )}

            {!esAdmin && seccionActiva === "reportes" && (
                <section className={styles.panel}>
                    <div className={styles.toolbar}>
                        <div className={styles.sectionHeading}>
                            <ClipboardList size={20} />
                            <div>
                                <h2>
                                    Historial de reportes
                                </h2>
                                <p>
                                    {reportes.length} reportes

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
                            {reportesVisibles.map(renderDetalleReporte)}
                        </div>
                    )}
                </section>
            )}
            {esAdmin && (
                <section className={`${styles.panel} ${styles.adminPanel}`} aria-label="Reportes recibidos">
                    <div className={styles.toolbar}>
                        <div className={styles.sectionHeading}>
                            <ClipboardList size={20} aria-hidden="true" />
                            <div>
                                <h2 ref={encabezadoLista} tabIndex={-1}>Reportes recibidos</h2>
                                <p aria-live="polite">{reportes.length} reportes · {conteos.pendiente} pendientes · {conteos.en_revision} en revisión</p>
                            </div>
                        </div>
                    </div>
                    <nav className={styles.reportGroups} aria-label="Filtrar reportes por sección">
                        {GRUPOS_ADMIN.map((grupo) => (
                            <button key={grupo.valor} type="button"
                                className={styles.groupButton} data-priority={grupo.prioritario || undefined}
                                aria-pressed={grupoActivo === grupo.valor}
                                onClick={() => cambiarFiltro(grupo.valor)}>
                                {grupo.etiqueta}
                                <span className={styles.groupCount}>{reportes.filter((reporte) => coincideEstado(reporte.estado_administrativo, grupo.valor)).length}</span>
                            </button>
                        ))}
                    </nav>
                    <div className={styles.toolbar}>
                        <p className={styles.muted} role="status">
                            {cargando ? "Cargando reportes…" : `${reportesVisibles.length} reportes · ${ESTADOS_ADMIN[filtro] || GRUPOS_ADMIN.find((grupo) => grupo.valor === filtro)?.etiqueta}`}
                        </p>
                        <label className={styles.filter}>
                            Filtrar por estado
                            <select value={filtro} onChange={(evento) => cambiarFiltro(evento.target.value)}>
                                <option value="todos">Todos ({reportes.length})</option>
                                <option value="sanciones">Todas las sanciones ({ESTADOS_SANCIONES.reduce((total, estado) => total + conteos[estado], 0)})</option>
                                <option value="historial">Todo el historial ({ESTADOS_HISTORIAL.reduce((total, estado) => total + conteos[estado], 0)})</option>
                                {Object.entries(ESTADOS_ADMIN).map(([estado, etiqueta]) => (
                                    <option key={estado} value={estado}>{etiqueta} ({conteos[estado]})</option>
                                ))}
                            </select>
                        </label>
                    </div>
                    {!cargando && (reportesVisibles.length === 0 ? (
                        <div className={styles.empty}>
                            <ClipboardList size={34} aria-hidden="true" />
                            <h3>No hay reportes en esta categoría</h3>
                            <p>Los reportes de este estado aparecerán aquí.</p>
                        </div>
                    ) : (
                        <>
                            <div className={styles.compactList}>
                                {reportesPagina.map((reporte) => (
                                    <article key={reporte.id} className={styles.compactCard}>
                                        <div className={styles.cardTop}>
                                            <strong>Reporte #{reporte.id}</strong>
                                            <span className={styles.adminStatus} data-status={reporte.estado_administrativo}>
                                                {SITUACIONES[reporte.estado_administrativo] || reporte.estado_administrativo}
                                            </span>
                                        </div>
                                        <dl className={styles.cardPeople}>
                                            <div><dt>Persona reportada</dt><dd>{(reporte.reportante === "paciente" ? reporte.nombre_medico : reporte.nombre_paciente) || "Nombre no disponible"}</dd></div>
                                            <div><dt>Reportante</dt><dd>{(reporte.reportante === "paciente" ? reporte.nombre_paciente : reporte.nombre_medico) || "Nombre no disponible"}</dd></div>
                                        </dl>
                                        <p className={styles.cardReason}><span>Motivo</span>{reporte.motivo_display || MOTIVOS[reporte.motivo] || reporte.motivo}</p>
                                        <div className={styles.cardFooter}>
                                            <time dateTime={reporte.fecha_creacion}>{formatearFecha(reporte.fecha_creacion)}</time>
                                            <button type="button" className={styles.secondary}
                                                aria-label={`Ver detalle del reporte ${reporte.id}`}
                                                onClick={(evento) => abrirDetalle(reporte, evento)}>
                                                <Eye size={16} aria-hidden="true" />Ver detalle
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                            <Pagination paginaActual={paginaActual} totalPaginas={totalPaginas}
                                totalRegistros={reportesVisibles.length} variant="admin"
                                onCambiarPagina={setPagina} cargando={cargando} />
                        </>
                    ))}
                </section>
            )}
            {esAdmin && (
                <Modal abierto={detalleAbierto} onCerrar={cerrarDetalle} onExitComplete={restaurarNavegacion}
                    titulo={`Reporte #${reporteSeleccionadoId}`} text="Detalle y gestión administrativa"
                    width="880px" icon={<ClipboardList size={23} aria-hidden="true" />}
                    footer={<div className={styles.modalFooter}>
                        <span role="status">{guardando ? "Procesando la acción…" : ""}</span>
                        <button type="button" className={styles.secondary} disabled={guardando} onClick={cerrarDetalle}>Cerrar detalle</button>
                    </div>}>
                    <div ref={contenidoDetalle} tabIndex={-1} className={styles.adminModal}>
                        {(error || actualizacionPendiente) && <div className={styles.error} role="alert">{error || AVISO_SINCRONIZACION}</div>}
                        {reporteSeleccionado ? renderDetalleReporte(reporteSeleccionado)
                            : <p className={styles.muted}>El reporte ya no está disponible.</p>}
                    </div>
                </Modal>
            )}
        </div>
    );
}
