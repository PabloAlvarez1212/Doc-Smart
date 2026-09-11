"use client";

import { Eye, FileText } from "lucide-react";
import DataTable from "../../../ui/DataTable/DataTable";
import StatusBadge from "../StatusBadge/StatusBadge";
import styles from "./DoctorRequestsTable.module.css";

function getDoctorName(request) {
    if (request.nombre_completo) return request.nombre_completo;
    return [request.nombre, request.apellido].filter(Boolean).join(" ") || "No disponible";
}

export default function DoctorRequestsTable({ requests = [], loading = false, onViewRequest, onViewResume }) {
    const columns = [
        { key: "medico", label: "Médico", render: (_, request) => <strong className={styles.doctorName}>{getDoctorName(request)}</strong> },
        { key: "cedula", label: "Cédula" },
        { key: "especialidad", label: "Especialidad" },
        { key: "departamento", label: "Departamento" },
        { key: "ciudad", label: "Ciudad" },
        { key: "fecha_solicitud", label: "Fecha de solicitud" },
        { key: "estado_validacion", label: "Estado", render: (status) => <StatusBadge status={status} /> },
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
        <DataTable
            titulo="Solicitudes de médicos"
            columnas={columns}
            datos={requests}
            cargando={loading}
            mostrarEncabezado={false}
            mostrarBusqueda={false}
            mostrarBotonNuevo={false}
            mostrarAcciones={false}
            emptyTitle="No hay solicitudes médicas para revisar"
            emptyDescription="Cuando un médico complete su registro y envíe su hoja de vida, aparecerá aquí."
        />
    );
}
