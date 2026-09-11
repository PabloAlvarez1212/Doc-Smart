"use client";

import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import DoctorRequestDetail from "../../../../components/admin/DoctorValidation/DoctorRequestDetail/DoctorRequestDetail";
import DoctorRequestsTable from "../../../../components/admin/DoctorValidation/DoctorRequestsTable/DoctorRequestsTable";
import ValidationFilters from "../../../../components/admin/DoctorValidation/ValidationFilters/ValidationFilters";
import ValidationSummary from "../../../../components/admin/DoctorValidation/ValidationSummary/ValidationSummary";
import { MOCK_DOCTOR_REQUESTS } from "../../../../components/admin/DoctorValidation/mockDoctorRequests";
import AdminPageHeader from "../../../../components/admin/PageHeader/AdminPageHeader";
import styles from "./doctorRequests.module.css";

export default function DoctorRequestsPage() {
    const [selectedRequest, setSelectedRequest] = useState(null);

    return (
        <div className={styles.page}>
            <AdminPageHeader
                eyebrow="Validación médica"
                title="Solicitudes de médicos"
                description="Revisa la información profesional y la documentación enviada antes de habilitar el acceso de un médico al sistema."
            />

            <ValidationSummary requests={MOCK_DOCTOR_REQUESTS} />
            <ValidationFilters />

            <section className={styles.requestsSection} aria-labelledby="requests-list-title">
                <div className={styles.sectionHeading}>
                    <div>
                        <span>Revisión profesional</span>
                        <h2 id="requests-list-title">Solicitudes recibidas</h2>
                    </div>
                    <p><LockKeyhole size={14} /> Documentación privada</p>
                </div>

                <DoctorRequestsTable
                    requests={MOCK_DOCTOR_REQUESTS}
                    onViewRequest={setSelectedRequest}
                />
            </section>

            <DoctorRequestDetail
                request={selectedRequest}
                open={Boolean(selectedRequest)}
                onClose={() => setSelectedRequest(null)}
            />
        </div>
    );
}
