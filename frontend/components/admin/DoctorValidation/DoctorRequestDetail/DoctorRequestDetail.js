"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { FileText, ScanFace, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import { obtenerIdentidadSolicitudService } from "@/app/services/adminServices";
import { EstadoFacial, MOTIVOS } from "../../PatientVerification/PatientVerificationTable";
import { describirSimilitud } from "../../PatientVerification/similitud";
import Button from "../../../ui/Button/Button";
import Modal from "../../../ui/Modal/Modal";
import StatusBadge from "../StatusBadge/StatusBadge";
import formatearFecha from "@/app/utils/fechaFormaterUtils";
import styles from "./DoctorRequestDetail.module.css";

function DetailField({ label, value }) {
    return (
        <div className={styles.field}>
            <dt>{label}</dt>
            <dd>{value ?? "No disponible"}</dd>
        </div>
    );
}

function IdentityImage({ title, src, empty }) {
    return (
        <figure className={styles.identityImage}>
            <div className={styles.identityFrame}>
                {src
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={src} alt={title} />
                    : <span>{empty}</span>}
            </div>
            <figcaption>{title}</figcaption>
        </figure>
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
    processing = false,
}) {
    const [identity, setIdentity] = useState(null);
    const [identityState, setIdentityState] = useState("idle");
    const requestId = request?.id;

    useEffect(() => {
        if (!open || requestId == null) return undefined;
        let cancelled = false;
        setIdentity(null);
        setIdentityState("loading");
        obtenerIdentidadSolicitudService(requestId)
            .then((response) => {
                if (cancelled) return;
                setIdentity(response.data?.disponible ? response.data : null);
                setIdentityState("ready");
            })
            .catch(() => !cancelled && setIdentityState("error"));
        return () => { cancelled = true; };
    }, [open, requestId]);

    if (!request) return null;

    const approve = async () => {
        if (identity?.pendiente) {
            const answer = await Swal.fire({
                icon: "warning",
                title: "La identidad no está confirmada",
                text: "El sistema no confirmó la identidad de este médico de forma automática. Al aprobar la solicitud confirmas que revisaste su selfie y su documento.",
                showCancelButton: true,
                confirmButtonText: "Revisé y aprobar",
                cancelButtonText: "Volver",
            });
            if (!answer.isConfirmed) return;
        }
        onApprove?.(request.id);
    };

    const fullName = (request.nombre_completo ?? [request.nombre, request.apellido].filter(Boolean).join(" ")) || "No disponible";
    const reviewDate = request.fecha_revision && !Number.isNaN(new Date(request.fecha_revision).getTime())
        ? formatearFecha(request.fecha_revision)
        : null;

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

                {request.estado === "rechazado" && (
                    <section className={styles.rejectionSummary} aria-labelledby="rejection-summary-title">
                        <h3 id="rejection-summary-title">Motivo del rechazo</h3>
                        <p className={styles.rejectionText}>{request.motivo_rechazo?.trim() || "No disponible"}</p>
                        <dl className={styles.rejectionMetadata}>
                            <dt>Revisada el</dt>
                            <dd>
                                {reviewDate ? (
                                    <time dateTime={request.fecha_revision}>{reviewDate.fecha}, {reviewDate.hora}</time>
                                ) : "No disponible"}
                            </dd>
                        </dl>
                    </section>
                )}

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

                    {identityState === "loading" && (
                        <p className={`${styles.section} ${styles.identity}`} role="status">Cargando verificación de identidad…</p>
                    )}
                    {identityState === "error" && (
                        <p className={`${styles.section} ${styles.identity}`} role="alert">No fue posible cargar la verificación de identidad.</p>
                    )}
                    {identity && (
                        <section className={`${styles.section} ${styles.identity}`} aria-labelledby="identity-title">
                            <div className={styles.sectionTitle}><ScanFace size={18} /><h3 id="identity-title">Verificación de identidad</h3></div>
                            {identity.pendiente && (
                                <p className={styles.identityNotice} role="status">
                                    La identidad de este médico aún no está confirmada. Revisa la selfie y los documentos antes de decidir:
                                    tu decisión sobre la solicitud también resuelve su verificación de identidad.
                                </p>
                            )}
                            <div className={styles.identityImages}>
                                <IdentityImage title="Fotografía del documento" src={identity.imagen_documento} empty="No hay imagen guardada" />
                                <IdentityImage title="Selfie tomada con la cámara" src={identity.imagen_selfie} empty="No tomó selfie" />
                                <IdentityImage title="Frente del documento" src={identity.documento_frente} empty="No disponible" />
                                <IdentityImage title="Reverso del documento" src={identity.documento_reverso} empty="No aplica o no disponible" />
                            </div>
                            <dl className={styles.fieldsGrid}>
                                <div className={styles.field}><dt>Estado de la verificación</dt><dd><EstadoFacial estado={identity.estado_facial} /></dd></div>
                                <DetailField label="Similitud calculada" value={describirSimilitud(identity.similitud, identity.umbrales)} />
                                <DetailField label="Motivo de la revisión" value={MOTIVOS[identity.motivo] ?? identity.motivo} />
                                <DetailField label="Intentos realizados" value={String(identity.intentos)} />
                            </dl>
                        </section>
                    )}

                    <section className={styles.section} aria-labelledby="documentation-title">
                        <div className={styles.sectionTitle}><FileText size={18} /><h3 id="documentation-title">Documentación</h3></div>
                        <div className={styles.documentCard}>
                            <span className={styles.documentIcon}><FileText size={22} /></span>
                            <div className={styles.documentCopy}>
                                <strong>Hoja de vida</strong>
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

                {request.estado === "pendiente" && (
                    <footer className={styles.actions}>
                        <Button size="sm" variant="danger" disabled={!onReject || processing} onClick={() => onReject?.(request)}>
                            Rechazar solicitud
                        </Button>
                        <Button size="sm" disabled={!onApprove || processing} loading={processing} onClick={approve}>
                            <ShieldCheck size={17} /> Aprobar médico
                        </Button>
                    </footer>
                )}
            </article>
        </Modal>
    );
}
