import {
    AlertTriangle,
    CalendarDays,
    Clock3,
    ClipboardList,
    FileDown,
    RefreshCw,
    Stethoscope,
    TicketCheck,
    UserRound,
} from "lucide-react";
import Button from "../../../ui/Button/Button";
import DocumentosSeguimientoList from '../../../ui/DocumentosSeguimientoList/DocumentosSeguimientoList';
import AppointmentCode from "../../../ui/AppointmentCode/AppointmentCode";
import styles from "./MedicalHistoryDetail.module.css";
import { formatMedicalHistoryDate, formatMedicalHistoryTime } from "../medicalHistoryFormatters";

export default function MedicalHistoryDetail({ record, loading, error, onRetry }) {
    if (loading) {
        return (
            <div className={styles.detailLoading} role="status" aria-live="polite">
                <span className={styles.spinner} aria-hidden="true" />
                <p>Cargando el registro clínico…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.detailError} role="alert">
                <AlertTriangle size={30} aria-hidden="true" />
                <h3>No pudimos abrir este registro</h3>
                <p>{error}</p>
                <Button onClick={onRetry}><RefreshCw size={18} /> Intentar nuevamente</Button>
            </div>
        );
    }

    return (
        <article className={styles.detail}>
            <section className={styles.section} aria-labelledby="history-attention-title">
                <SectionTitle id="history-attention-title" icon={TicketCheck} title="Identificación de la atención" />
                <AppointmentCode value={record.codigo_cita} contextId={record.id} />
                <div className={styles.dataGrid}>
                    <DetailItem icon={CalendarDays} label="Fecha de atención" value={formatMedicalHistoryDate(record.fecha_creacion)} />
                    <DetailItem icon={Clock3} label="Hora del registro" value={formatMedicalHistoryTime(record.fecha_creacion)} />
                </div>
            </section>

            <div className={styles.peopleGrid}>
                <section className={styles.section} aria-labelledby="history-patient-title">
                    <SectionTitle id="history-patient-title" icon={UserRound} title="Información del paciente" />
                    <div className={styles.person}>
                        <span aria-hidden="true"><UserRound size={21} /></span>
                        <div>
                            <small>Paciente</small>
                            <strong>{record.paciente || "Paciente no disponible"}</strong>
                        </div>
                    </div>
                </section>

                <section className={styles.section} aria-labelledby="history-doctor-title">
                    <SectionTitle id="history-doctor-title" icon={Stethoscope} title="Información del profesional" />
                    <div className={styles.person}>
                        <span aria-hidden="true"><Stethoscope size={21} /></span>
                        <div>
                            <small>Profesional responsable</small>
                            <strong>{record.medico || "Profesional no disponible"}</strong>
                            <p>{record.especialidad || "Especialidad no disponible"}</p>
                        </div>
                    </div>
                </section>
            </div>
            <DocumentosSeguimientoList citaId={record.cita_id} documentos={record.documentos || []} />
            <section className={styles.section} aria-labelledby="history-clinical-title">
                <SectionTitle id="history-clinical-title" icon={ClipboardList} title="Información clínica" />
                <dl className={styles.clinicalSections}>
                    <div><dt>Motivo de consulta</dt><dd>{record.motivo_consulta || "Sin motivo de consulta registrado."}</dd></div>
                    <div><dt>Diagnóstico general</dt><dd>{record.diagnostico_general || "Sin diagnóstico registrado."}</dd></div>
                    <div><dt>Observaciones</dt><dd>{record.observaciones || "Sin observaciones adicionales."}</dd></div>
                </dl>
            </section>
            <div className={styles.note}><ClipboardList size={19} aria-hidden="true" /><p>Registro clínico versionado. Estás viendo la versión {record.version_actual}.</p></div>
        </article>
    );
}

function SectionTitle({ id, icon: Icon, title }) {
    return (
        <h3 id={id} className={styles.sectionTitle}>
            <Icon size={18} aria-hidden="true" />
            {title}
        </h3>
    );
}

function DetailItem({ icon: Icon, label, value }) {
    return (
        <div className={styles.detailItem}>
            <span>{Icon && <Icon size={15} aria-hidden="true" />}{label}</span>
            <strong>{value}</strong>
        </div>
    );
}
