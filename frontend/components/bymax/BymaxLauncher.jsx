"use client";
import BymaxCharacter from "./BymaxCharacter";
import styles from "./BymaxAssistant.module.css";
export default function BymaxLauncher({ status, label, open, positionStyle, dragHandlers, dragging, buttonRef }) {
  return <button ref={buttonRef} type="button" className={`${styles.launcher} ${open ? styles.launcherHidden : ""} ${dragging ? styles.dragging : ""}`}
    data-state={status} data-hidden={open} style={positionStyle} {...dragHandlers} aria-label={`Abrir Bymax. ${label}`} aria-expanded={open} aria-controls="bymax-chat" tabIndex={open ? -1 : 0}
    title="Habla con Bymax · Puedes arrastrarlo">
    <BymaxCharacter status={status} paused={open || dragging}/>
    <span className={styles.launcherLabel}>
      {label}
    </span>
  </button>;
}
