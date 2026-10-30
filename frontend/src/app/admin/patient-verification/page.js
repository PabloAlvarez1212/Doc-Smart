"use client";

import { LockKeyhole } from "lucide-react";
import AdminPageHeader from "../../../../components/admin/PageHeader/AdminPageHeader";
import PatientVerificationTable from "../../../../components/admin/PatientVerification/PatientVerificationTable";
import PatientVerificationDetail from "../../../../components/admin/PatientVerification/PatientVerificationDetail";
import usePatientVerification, { FILTROS } from "../../../../components/admin/PatientVerification/usePatientVerification";
import verificationStyles from "../../../../components/admin/PatientVerification/PatientVerification.module.css";
import styles from "../doctor-requests/doctorRequests.module.css";

export default function PatientVerificationPage() {
    const {
        estado, setEstado, busqueda, setBusqueda, resultados, conteos, cargando, error, recargar,
        detalle, abrir, cerrar, resolver, procesando,
    } = usePatientVerification();

    return (
        <div className={styles.page}>
            <AdminPageHeader
                eyebrow="Validación de identidad"
                title="Verificación de pacientes"
                description="Compara la fotografía del documento con la selfie tomada durante el registro y revisa los documentos cargados cuando la verificación automática no es concluyente."
            />

            <section className={verificationStyles.summaryGrid} aria-label="Resumen de verificaciones">
                {FILTROS.map(({ key, label }) => (
                    <article className={verificationStyles.summaryItem} key={key}>
                        <small>{label}</small>
                        <strong>{conteos[key] ?? 0}</strong>
                    </article>
                ))}
            </section>

            <div className={verificationStyles.filters}>
                <div className={verificationStyles.tabs} role="group" aria-label="Filtrar por estado">
                    {FILTROS.map(({ key, label }) => (
                        <button key={key} type="button" className={verificationStyles.tab} aria-pressed={estado === key} onClick={() => setEstado(key)}>
                            {label}
                        </button>
                    ))}
                </div>
                <input
                    type="search" className={verificationStyles.search} value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre o documento" aria-label="Buscar por nombre o documento"
                />
            </div>

            <section className={styles.requestsSection} aria-labelledby="verification-list-title">
                <div className={styles.sectionHeading}>
                    <div>
                        <span>Revisión de identidad</span>
                        <h2 id="verification-list-title">Verificaciones faciales</h2>
                    </div>
                    <p><LockKeyhole size={14} /> Imágenes privadas</p>
                </div>
                <PatientVerificationTable
                    datos={resultados} cargando={cargando} error={error} onReintentar={recargar}
                    onVer={abrir} hayFiltros={Boolean(busqueda.trim())}
                />
            </section>

            <PatientVerificationDetail detalle={detalle} onClose={cerrar} onResolver={resolver} procesando={procesando} />
        </div>
    );
}
