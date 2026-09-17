"use client";

import { Eye } from "lucide-react";
import DataTable from "../../../ui/DataTable/DataTable";
import Pagination from "../../../ui/Pagination/Pagination";
import StatusBadge from "../StatusBadge/StatusBadge";
import styles from "./DoctorRequestsTable.module.css";
import formatearFecha from "@/app/utils/fechaFormaterUtils";

function getDoctorName(request) {
    return [request.nombre, request.apellido]
        .filter(Boolean)
        .join(" ") || "No disponible";
}

export default function DoctorRequestsTable({
    solicitudesDoctores = [],
    loading = false,
    onViewRequest,
    paginaActual = 1,
    totalPaginas = 1,
    totalRegistros = 0,
    pageSize = 10,
    onCambiarPagina,
    hayFiltros = false,
    error,
    onReintentar,
}) {
    const columns = [
        {
            key: "medico",
            label: "Médico",
            render: (_, request) => (
                <strong className={styles.doctorName}>
                    {getDoctorName(request)}
                </strong>
            ),
        },
        {
            key: "cedula",
            label: "Cédula",
        },
        {
            key: "especialidad",
            label: "Especialidad",
        },
        {
            key: "departamento",
            label: "Departamento",
        },
        {
            key: "ciudad",
            label: "Ciudad",
        },
        {
            key: "fecha_solicitud",
            label: "Fecha de solicitud",
            render: (fecha) => formatearFecha(fecha).fecha
        },
        {
            key: "estado",
            label: "Estado",
            render: (status) => (
                <StatusBadge status={status} />
            ),
        },
        {
            key: "request_actions",
            label: "Acciones",
            render: (_, request) => (
                <div className={styles.actions}>
                    <button
                        type="button"
                        className={styles.actionButton}
                        disabled={!onViewRequest}
                        onClick={() => onViewRequest?.(request)}
                        aria-label={`Ver solicitud de ${getDoctorName(request)}`}
                        title="Ver solicitud"
                    >
                        <Eye size={16} aria-hidden="true" />
                        <span>Ver solicitud</span>
                    </button>
                </div>
            ),
        },
    ];

    return (
        <>
        <DataTable
            titulo="Solicitudes de médicos"
            columnas={columns}
            datos={solicitudesDoctores}
            cargando={loading}
            error={error}
            onReintentar={onReintentar}
            indiceInicial={(paginaActual - 1) * pageSize}
            textoConteo={`Mostrando ${totalRegistros === 0 ? 0 : (paginaActual - 1) * pageSize + 1}-${Math.min(paginaActual * pageSize, totalRegistros)} de ${totalRegistros} solicitudes`}
            mostrarEncabezado={false}
            mostrarBusqueda={false}
            mostrarBotonNuevo={false}
            mostrarAcciones={false}
            emptyTitle={hayFiltros ? "No hay resultados para los filtros actuales" : "No hay solicitudes médicas para revisar"}
            emptyDescription={hayFiltros ? "Prueba otros filtros o limpia la búsqueda." : "Cuando un médico complete su registro y envíe su hoja de vida, aparecerá aquí."}
        />
        {!error && <Pagination
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            onCambiarPagina={onCambiarPagina}
            cargando={loading}
            variant="admin"
        />}
        </>
    );
}
