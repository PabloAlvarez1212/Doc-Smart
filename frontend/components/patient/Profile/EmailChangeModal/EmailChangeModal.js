"use client";
import { useEffect, useId, useRef } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, Mail } from "lucide-react";
import Modal from "../../../ui/Modal/Modal";
import base from "../../../ui/Modal/Modal.module.css";
import styles from "./EmailChangeModal.module.css";

export default function EmailChangeModal({ actual, flujo, ocupado, onCerrar, onEditar, onEnviar, onReiniciar }) {
    const id = useId();
    const inputRef = useRef(null);
    const doneRef = useRef(null);
    const verificacion = flujo.paso === "verificacion";
    const confirmado = flujo.paso === "confirmado";
    useEffect(() => {
        if (flujo.abierto) (confirmado ? doneRef.current : inputRef.current)?.focus({ preventScroll: true });
    }, [flujo.abierto, flujo.paso, confirmado]);
    return <Modal abierto={flujo.abierto} onCerrar={onCerrar} titulo="Cambiar correo"
        text="Verifica tu nuevo correo para actualizarlo de forma segura."
        headerVariant="white" icon={<Mail aria-hidden="true"/>} initialFocusRef={inputRef}
        footer={confirmado
            ? <button ref={doneRef} type="button" className={base.primary} onClick={onCerrar}>Listo</button>
            : <>
                <button type="button" className={base.secondary} onClick={onCerrar}>Cerrar</button>
                <button type="submit" form={id} className={base.primary} disabled={ocupado || flujo.bloqueado}>
                    {ocupado && <LoaderCircle size={17} className={styles.spinner} aria-hidden="true"/>}
                    {ocupado ? (verificacion ? "Verificando…" : "Enviando código…") : verificacion ? "Verificar y cambiar correo" : "Enviar código"}
                </button>
            </>}>
        <ol className={styles.steps} aria-label="Progreso del cambio de correo">
            {["Correo nuevo", "Verificación", "Confirmado"].map((paso, index) =>
                <li key={paso} aria-current={index === (confirmado ? 2 : verificacion ? 1 : 0) ? "step" : undefined}>
                    <span aria-hidden="true">{index + 1}</span>{paso}
                </li>)}
        </ol>
        {confirmado ? <div className={`${base.feedback} ${base.success}`} role="status">
            <CheckCircle2 size={22} aria-hidden="true"/><div><strong>Correo actualizado</strong><p className={styles.copy}>Tu correo ahora es <strong>{flujo.correo}</strong>.</p></div>
        </div> : <form id={id} className={base.form} aria-busy={ocupado} onSubmit={event => { event.preventDefault(); onEnviar(); }}>
            {actual && <div className={styles.reference}><span>Correo actual</span><strong>{actual}</strong></div>}
            {verificacion ? <>
                <p className={styles.copy}>Enviamos un código a <strong>{flujo.correo}</strong>. Ingresa los 6 dígitos para confirmar el cambio.</p>
                <label className={base.field} htmlFor={`${id}-codigo`}>Código de verificación
                    <input ref={inputRef} id={`${id}-codigo`} name="codigo" type="text" inputMode="numeric" autoComplete="one-time-code"
                        value={flujo.codigo} onChange={event => onEditar("codigo", event.target.value)} maxLength={6} pattern="[0-9]{6}" required
                        disabled={ocupado || flujo.bloqueado} aria-invalid={Boolean(flujo.error)} aria-describedby={`${id}-ayuda${flujo.error ? ` ${id}-error` : ""}`} className={styles.code}/>
                </label>
                <p id={`${id}-ayuda`} className={styles.help}>El código vence a los 10 minutos. La solicitud admite hasta 5 intentos.</p>
                <button type="button" className={styles.restart} onClick={onReiniciar} disabled={ocupado}>Iniciar una nueva solicitud</button>
                <p className={styles.help}>Una nueva solicitud reemplaza el código anterior. Este proceso no dispone de reenvío.</p>
            </> : <>
                <label className={base.field} htmlFor={`${id}-correo`}>Nuevo correo
                    <input ref={inputRef} id={`${id}-correo`} name="correo" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false}
                        value={flujo.correo} onChange={event => onEditar("correo", event.target.value)} required disabled={ocupado}
                        aria-invalid={Boolean(flujo.error)} aria-describedby={flujo.error ? `${id}-error` : undefined} placeholder="nombre@correo.com"/>
                </label>
                <p className={styles.help}>Tu correo actual seguirá activo hasta que verifiques el código enviado al nuevo.</p>
            </>}
            {flujo.error && <div id={`${id}-error`} className={base.feedback} role="alert"><AlertCircle size={19} aria-hidden="true"/><span>{flujo.error}{flujo.bloqueado && " Inicia una nueva solicitud para continuar."}</span></div>}
            {ocupado && <p className={styles.help} role="status">{verificacion ? "Verificando el código…" : "Solicitando el código…"}</p>}
        </form>}
    </Modal>;
}
