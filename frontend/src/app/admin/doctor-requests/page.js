"use client";

import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import DoctorRequestDetail from "../../../../components/admin/DoctorValidation/DoctorRequestDetail/DoctorRequestDetail";
import DoctorRequestsTable from "../../../../components/admin/DoctorValidation/DoctorRequestsTable/DoctorRequestsTable";
import RejectDoctorModal from "../../../../components/admin/DoctorValidation/RejectDoctorModal/RejectDoctorModal";
import ValidationFilters from "../../../../components/admin/DoctorValidation/ValidationFilters/ValidationFilters";
import ValidationSummary from "../../../../components/admin/DoctorValidation/ValidationSummary/ValidationSummary";
import AdminPageHeader from "../../../../components/admin/PageHeader/AdminPageHeader";
import styles from "./doctorRequests.module.css";
import useDoctorValidation from "../../../../components/admin/DoctorValidation/useDoctorValidation";

export default function DoctorRequestsPage() {
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const {
        estados,
        especialidades,
        departamentos,
        departamentoSeleccionado,
        setDepartamentoSeleccionado,
        ciudades,
        ciudadSeleccionada,
        setCiudadSeleccionada,
        especialidadSeleccionada,
        estadoSeleccionado,
        setEspecialidadSeleccionada,
        setEstadoSeleccionado,
        limpiarFiltros,
        busqueda,
        setBusqueda,
        solicitudesDoctores,
        metricas,
        verHojaVida,
        aprobarSolicitud,
        rechazarSolicitud,
    } = useDoctorValidation();

    const openRejectModal = (request) => {
        if (request?.estado !== "pendiente") return;

        setSelectedRequest(request);
        setIsRejectModalOpen(true);
    };

    const closeRejectModal = () => {
        setIsRejectModalOpen(false);
    };

    const handleRejectRequest = async ({ solicitudId, motivo }) => {
        if (solicitudId == null || !motivo.trim()) return false;

        const rechazado = await rechazarSolicitud({
            solicitudId,
            motivo,
        });

        if (!rechazado) return false;

        setIsRejectModalOpen(false);
        setSelectedRequest(null);

        return true;
    };

    return (
        <div className={styles.page}>
            <AdminPageHeader
                eyebrow="Validación médica"
                title="Solicitudes de médicos"
                description="Revisa la información profesional y la documentación enviada antes de habilitar el acceso de un médico al sistema."
            />

            <ValidationSummary metricas={metricas} />
            <ValidationFilters
                estados={estados}
                especialidades={especialidades}
                departamentos={departamentos}
                departamentoSeleccionado={departamentoSeleccionado}
                setDepartamentoSeleccionado={setDepartamentoSeleccionado}
                ciudades={ciudades}
                ciudadSeleccionada={ciudadSeleccionada}
                setCiudadSeleccionada={setCiudadSeleccionada}
                especialidadSelecionada={especialidadSeleccionada}
                setEspecialidadSeleccionada={setEspecialidadSeleccionada}
                estadoSeleccionado={estadoSeleccionado}
                setEstadoSeleccionado={setEstadoSeleccionado}
                limpiarFiltros={limpiarFiltros}
                busqueda={busqueda}
                setBusqueda={setBusqueda}
            />

            <section className={styles.requestsSection} aria-labelledby="requests-list-title">
                <div className={styles.sectionHeading}>
                    <div>
                        <span>Revisión profesional</span>
                        <h2 id="requests-list-title">Solicitudes recibidas</h2>
                    </div>
                    <p><LockKeyhole size={14} /> Documentación privada</p>
                </div>

                <DoctorRequestsTable
                    onViewRequest={setSelectedRequest}
                    solicitudesDoctores={solicitudesDoctores}
                />
            </section>

            <DoctorRequestDetail
                request={selectedRequest}
                open={Boolean(selectedRequest) && !isRejectModalOpen}
                onClose={() => setSelectedRequest(null)}
                onViewResume={verHojaVida}
                onApprove={aprobarSolicitud}
                onReject={openRejectModal}
            />

            <RejectDoctorModal
                request={selectedRequest}
                open={Boolean(selectedRequest) && isRejectModalOpen}
                onClose={closeRejectModal}
                onConfirm={handleRejectRequest}
            />
        </div>
    );
}
