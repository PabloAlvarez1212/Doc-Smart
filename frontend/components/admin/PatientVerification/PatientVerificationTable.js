"use client";

import { Eye } from "lucide-react";
import DataTable from "../../ui/DataTable/DataTable";
import formatearFecha from "@/app/utils/fechaFormaterUtils";
import styles from "./PatientVerification.module.css";
import { formatearSimilitud } from "./similitud";

const ESTADOS = {
    posterior: { label: "Por confirmar", tone: "revision" },
    revision: { label: "En revisión", tone: "revision" },
    aprobado: { label: "Aprobada", tone: "aprobado" },
    rechazado: { label: "Rechazada", tone: "rechazado" },
    alternativa: { label: "Alternativa", tone: "alternativa" },
};

export const MOTIVOS = {
    similitud_intermedia: "Similitud intermedia",
    no_coincide: "El rostro no coincide",
    intentos_agotados: "Intentos agotados",
    rostro_documento_no_detectado: "Rostro del documento no detectado",
    camara_no_disponible: "Sin cámara disponible",
    accesibilidad: "Necesita otra alternativa",
    sin_consentimiento: "No aceptó el consentimiento",
    sin_variacion: "Fotogramas sin variación",
    rostros_inconsistentes: "Rostros inconsistentes",
    pocos_fotogramas: "Pocos fotogramas válidos",
    sin_foto_documento: "Documento sin fotografía",
    revision_manual: "Decisión manual",
    foto_documento_poco_nitida: "Foto del documento poco nítida",
    alineacion_documento_dudosa: "Rostro del documento girado o poco claro",
    captura_reutilizada: "Captura repetida",
};

export function EstadoFacial({ estado }) {
    const config = ESTADOS[estado] ?? { label: "Sin estado", tone: "alternativa" };
    return <span className={`${styles.badge} ${styles[config.tone]}`}>{config.label}</span>;
}

export default function PatientVerificationTable({ datos, cargando, error, onReintentar, onVer, hayFiltros }) {
    const columnas = [
        { key: "nombre", label: "Persona", render: (_, f) => <strong>{[f.nombre, f.apellido].filter(Boolean).join(" ")}</strong> },
        { key: "tipo_registro", label: "Registro", render: (v) => (v === "medico" ? "Médico" : "Paciente") },
        { key: "cedula", label: "Documento", render: (v, f) => `${f.tipo_documento} ${v}` },
        { key: "correo", label: "Correo de contacto", render: (v, f) => v || (f.estado_facial === "revision" ? "Pendiente" : "—") },
        { key: "motivo", label: "Motivo", render: (v) => MOTIVOS[v] ?? (v || "—") },
        { key: "similitud", label: "Similitud", render: (v) => formatearSimilitud(v) ?? "—" },
        { key: "fecha", label: "Fecha", render: (v) => { const f = formatearFecha(v); return `${f.fecha}, ${f.hora}`; } },
        { key: "estado_facial", label: "Estado", render: (v, f) => <EstadoFacial estado={f.revision_posterior === "pendiente" ? "posterior" : v} /> },
        {
            key: "acciones", label: "Acciones", render: (_, fila) => (
                <button type="button" className={styles.actionButton} onClick={() => onVer(fila)}
                    aria-label={`Ver verificación de ${fila.nombre} ${fila.apellido}`} title="Ver verificación">
                    <Eye size={16} aria-hidden="true" /><span>Ver verificación</span>
                </button>
            ),
        },
    ];
    return (
        <DataTable
            titulo="Verificación facial" columnas={columnas} datos={datos} cargando={cargando}
            error={error} onReintentar={onReintentar}
            textoConteo={`${datos.length} ${datos.length === 1 ? "verificación" : "verificaciones"}`}
            mostrarEncabezado={false} mostrarBusqueda={false} mostrarBotonNuevo={false} mostrarAcciones={false}
            emptyTitle={hayFiltros ? "No hay resultados para la búsqueda" : "No hay verificaciones en este estado"}
            emptyDescription={hayFiltros ? "Prueba con otro nombre o documento." : "Cuando una verificación facial requiera revisión manual, aparecerá aquí."}
        />
    );
}
