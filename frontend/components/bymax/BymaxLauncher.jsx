"use client";
import Image from "next/image";
import { AlertCircle, AudioLines, LoaderCircle } from "lucide-react";
import styles from "./BymaxAssistant.module.css";
export default function BymaxLauncher({ status, label, open, positionStyle, dragHandlers, dragging, buttonRef }) {
  return <button ref={buttonRef} type="button" className={`${styles.launcher} ${open ? styles.launcherHidden : ""} ${dragging ? styles.dragging : ""}`}
    data-state={status} style={positionStyle} {...dragHandlers} aria-label={`Abrir Bymax. ${label}`} aria-expanded={open} aria-controls="bymax-chat" tabIndex={open ? -1 : 0}
    title="Habla con Bymax · Puedes arrastrarlo">
    <span className={styles.launcherFigure}><Image src="/icons/asistente_bymax.png" alt="" width={326} height={326} priority draggable={false}/></span>
    <span className={styles.launcherLabel}>
      {status === "error" ? <AlertCircle size={12}/> : status === "processing" ? <LoaderCircle size={12}/> : ["listening", "speaking"].includes(status) ? <AudioLines size={12}/> : null}
      {label}
    </span>
  </button>;
}
