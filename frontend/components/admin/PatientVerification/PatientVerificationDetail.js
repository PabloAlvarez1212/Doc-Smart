"use client";

import { FileText, ScanFace, ShieldCheck, UserRound } from "lucide-react";
import Button from "../../ui/Button/Button";
import Modal from "../../ui/Modal/Modal";
import formatearFecha from "@/app/utils/fechaFormaterUtils";
import { EstadoFacial, MOTIVOS } from "./PatientVerificationTable";
import { describirSimilitud } from "./similitud";
import styles from "./PatientVerification.module.css";

function Campo({ label, value }) {
    return <div className={styles.field}><dt>{label}</dt><dd>{value || "No disponible"}</dd></div>;
}

function Imagen({ titulo, src, vacio }) {
    return (
        <figure className={styles.imagen}>
            <div className={styles.marco}>
                {src
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={src} alt={titulo} />
                    : <span>{vacio}</span>}
            </div>
            <figcaption>{titulo}</figcaption>
        </figure>
    );
}

export default function PatientVerificationDetail({ detalle, onClose, onResolver, procesando }) {
    if (!detalle) return null;
    const nombre = [detalle.nombre, detalle.apellido].filter(Boolean).join(" ");
    const consentimiento = detalle.consentimiento_en ? formatearFecha(detalle.consentimiento_en) : null;
    const resoluble = detalle.estado_facial === "revision";
    const porConfirmar = detalle.revision_posterior === "pendiente";
    const registrado = detalle.registrado_en ? formatearFecha(detalle.registrado_en) : null;
    const esMedico = detalle.tipo_registro === "medico";

    return (
        <Modal abierto={Boolean(detalle)} onCerrar={onClose} titulo="Verificación de identidad" headerVariant="white" width="980px">
            <article className={styles.detail}>
                <header className={styles.summary}>
                    <span className={styles.avatar} aria-hidden="true"><UserRound size={24} /></span>
                    <div className={styles.identity}>
                        <span>{esMedico ? "Registro de médico" : "Registro de paciente"}</span>
                        <h2>{nombre}</h2>
                        <p>{detalle.tipo_documento} {detalle.cedula}</p>
                    </div>
                    <div className={styles.currentStatus}>
                        <small>Estado de la verificación</small>
                        <EstadoFacial estado={porConfirmar ? "posterior" : detalle.estado_facial} />
                    </div>
                </header>

                {detalle.acceso_bloqueado && (
                    <p className={styles.aviso} role="status">El acceso de esta persona está bloqueado.</p>
                )}
                {porConfirmar && (
                    <p className={styles.aviso} role="status">
                        El sistema aprobó esta identidad automáticamente y la persona ya usa su cuenta con normalidad.
                        Confirma que es legítima o bloquea su acceso si encuentras inconsistencias, por ejemplo una
                        selfie tomada con una fotografía o desde otro dispositivo.
                    </p>
                )}

                {detalle.cargando ? <p className={styles.cargando} role="status">Cargando imágenes…</p> : <>
                    <section className={styles.section} aria-labelledby="comparacion-titulo">
                        <div className={styles.sectionTitle}><ScanFace size={18} /><h3 id="comparacion-titulo">Comparación de rostro</h3></div>
                        <div className={styles.comparacion}>
                            <Imagen titulo="Fotografía del documento" src={detalle.imagen_documento} vacio="No hay imagen guardada" />
                            <Imagen titulo="Selfie tomada con la cámara" src={detalle.imagen_selfie} vacio="La persona no tomó selfie" />
                        </div>
                        <dl className={styles.fieldsGrid}>
                            <Campo label="Similitud calculada" value={describirSimilitud(detalle.similitud, detalle.umbrales)} />
                            <Campo label="Motivo de la revisión" value={MOTIVOS[detalle.motivo] ?? detalle.motivo} />
                            <Campo label="Intentos realizados" value={String(detalle.intentos)} />
                            <Campo label="Consentimiento" value={consentimiento ? `${consentimiento.fecha}, ${consentimiento.hora}` : "No registrado"} />
                        </dl>
                    </section>

                    <section className={styles.section} aria-labelledby="documento-titulo">
                        <div className={styles.sectionTitle}><FileText size={18} /><h3 id="documento-titulo">Documento cargado</h3></div>
                        <div className={styles.comparacion}>
                            <Imagen titulo="Frente del documento" src={detalle.documento_frente} vacio="No disponible" />
                            <Imagen titulo="Reverso del documento" src={detalle.documento_reverso} vacio="No aplica o no disponible" />
                        </div>
                        <dl className={styles.fieldsGrid}>
                            <Campo label="Nombre declarado" value={nombre} />
                            <Campo label="Número de documento" value={`${detalle.tipo_documento} ${detalle.cedula}`} />
                            <Campo label="Fecha de nacimiento" value={detalle.fecha_nacimiento} />
                            <Campo label="Correo de la cuenta" value={detalle.correo_cuenta} />
                            <Campo label="Correo de contacto de la verificación" value={detalle.correo} />
                            <Campo label="Registro completado" value={registrado ? `${registrado.fecha}, ${registrado.hora}` : null} />
                            <Campo label="Teléfono" value={detalle.telefono} />
                        </dl>
                    </section>

                    {porConfirmar && (
                        <footer className={styles.actions}>
                            <Button size="sm" variant="danger" disabled={procesando} onClick={() => onResolver("bloquear")}>Bloquear acceso</Button>
                            <Button size="sm" disabled={procesando} loading={procesando} onClick={() => onResolver("legitimo")}>
                                <ShieldCheck size={17} /> Es legítimo
                            </Button>
                        </footer>
                    )}

                    {resoluble && !detalle.correo && (
                        <p className={styles.aviso} role="status">
                            La persona aún no registró un correo de contacto, así que todavía no es posible aprobar
                            la verificación. Puedes rechazarla si corresponde.
                        </p>
                    )}

                    <p className={styles.aviso}>
                        La coincidencia de rostros no demuestra que el documento sea auténtico. Verifica también que la
                        imagen del documento no tenga señales de alteración o de ser una fotografía de una pantalla.
                    </p>

                    {resoluble && (
                        <footer className={styles.actions}>
                            <Button size="sm" variant="danger" disabled={procesando} onClick={() => onResolver("rechazar")}>Rechazar</Button>
                            <Button size="sm" disabled={procesando || !detalle.correo} loading={procesando} onClick={() => onResolver("aprobar")}>
                                <ShieldCheck size={17} /> Aprobar verificación
                            </Button>
                        </footer>
                    )}
                </>}
            </article>
        </Modal>
    );
}
