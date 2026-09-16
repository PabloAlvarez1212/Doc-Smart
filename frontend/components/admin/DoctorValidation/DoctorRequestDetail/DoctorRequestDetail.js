"use client";

import { FileText, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import Button from "../../../ui/Button/Button";
import Modal from "../../../ui/Modal/Modal";
import StatusBadge from "../StatusBadge/StatusBadge";
import styles from "./DoctorRequestDetail.module.css";

function DetailField({ label, value }) {
    return (
        <div className={styles.field}>
            <dt>{label}</dt>
            <dd>{value ?? "No disponible"}</dd>
        </div>
    );
}

export default function DoctorRequestDetail({
    request,
    open = false,
    onClose = () => {},
    onViewResume,
    onApprove,
    onReject,
    showRejectForm = false,
    rejectionReason = "",
    onRejectionReasonChange,
}) {
    if (!request) return null;

    const fullName = (request.nombre_completo ?? [request.nombre, request.apellido].filter(Boolean).join(" ")) || "No disponible";

    return (
        <Modal abierto={open} onCerrar={onClose} titulo="Revisión de solicitud" headerVariant="white" width="900px">
            <article className={styles.detail}>
                <header className={styles.summary}>
                    <span className={styles.avatar} aria-hidden="true"><UserRound size={24} /></span>
                    <div className={styles.identity}>
                        <span>Solicitud médica</span>
                        <h2>{fullName}</h2>
                        <p>{request.especialidad ?? "Especialidad no disponible"}</p>
                    </div>
                    <div className={styles.currentStatus}>
                        <small>Estado de validación</small>
                        <StatusBadge status={request.estado} />
                    </div>
                </header>

                <div className={styles.sections}>
                    <section className={styles.section} aria-labelledby="personal-information-title">
                        <div className={styles.sectionTitle}><UserRound size={18} /><h3 id="personal-information-title">Información personal</h3></div>
                        <dl className={styles.fieldsGrid}>
                            <DetailField label="Nombre completo" value={fullName} />
                            <DetailField label="Cédula" value={request.cedula} />
                            <DetailField label="Fecha de nacimiento (año/mes/dia)" value={request.fecha_nacimiento} />
                            <DetailField label="Teléfono" value={request.telefono} />
                            <DetailField label="Correo" value={request.correo} />
                        </dl>
                    </section>

                    <section className={styles.section} aria-labelledby="professional-information-title">
                        <div className={styles.sectionTitle}><Stethoscope size={18} /><h3 id="professional-information-title">Información profesional</h3></div>
                        <dl className={styles.fieldsGrid}>
                            <DetailField label="Especialidad" value={request.especialidad} />
                            <DetailField label="Dirección" value={request.direccion} />
                            <DetailField label="Ciudad" value={request.ciudad} />
                            <DetailField label="Departamento" value={request.departamento} />
                        </dl>
                    </section>

                    <section className={styles.section} aria-labelledby="documentation-title">
                        <div className={styles.sectionTitle}><FileText size={18} /><h3 id="documentation-title">Documentación</h3></div>
                        <div className={styles.documentCard}>
                            <span className={styles.documentIcon}><FileText size={22} /></span>
                            <div className={styles.documentCopy}>
                                <strong>Hoja de vida</strong>
                                <span>La vista del documento estará disponible al integrar el backend.</span>
                            </div>
                            <Button size="sm" variant="secundary" disabled={!onViewResume} onClick={() => onViewResume?.(request.id)}>
                                Ver hoja de vida
                            </Button>
                        </div>
                    </section>
                </div>

                {showRejectForm && (
                    <section className={styles.rejectPanel} aria-labelledby="rejection-reason-title">
                        <h3 id="rejection-reason-title">Motivo del rechazo</h3>
                        <label htmlFor="rejection-reason">Explica brevemente por qué la solicitud no puede aprobarse.</label>
                        <textarea id="rejection-reason" value={rejectionReason} onChange={(event) => onRejectionReasonChange?.(event.target.value)} rows={4} />
                    </section>
                )}

                <footer className={styles.actions}>
                    <Button size="sm" variant="danger" disabled={!onReject} onClick={() => onReject?.(request)}>
                        Rechazar solicitud
                    </Button>
                    <Button size="sm" disabled={!onApprove} onClick={() => onApprove?.(request.id)}>
                        <ShieldCheck size={17} /> Aprobar médico
                    </Button>
                </footer>
            </article>
        </Modal>
    );
}
