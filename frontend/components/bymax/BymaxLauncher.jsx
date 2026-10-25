"use client";
import BymaxCharacter from "./BymaxCharacter";
import styles from "./BymaxAssistant.module.css";
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
export default function BymaxLauncher({ status, label, open, positionStyle, dragHandlers, dragging, buttonRef }) {
  const pathname = usePathname();
  const docked = pathname.includes('/my-appointments');
  const [dock, setDock] = useState(null);
  useEffect(() => { setDock(docked ? document.querySelector('[data-bymax-dock="appointments"]') : null); }, [docked, pathname]);
  const launcher = <button ref={buttonRef} type="button" className={`${styles.launcher} ${docked ? styles.launcherDocked : ''} ${open ? styles.launcherHidden : ""} ${dragging && !docked ? styles.dragging : ""}`}
    data-state={status} data-hidden={open} style={docked ? undefined : positionStyle} {...(docked ? {onClick:dragHandlers.onClick} : dragHandlers)} aria-label={`Abrir Bymax. ${label}`} aria-expanded={open} aria-controls="bymax-chat" tabIndex={open ? -1 : 0}
    title={docked ? `Abrir Bymax. ${label}` : 'Habla con Bymax · Puedes arrastrarlo'}>
    <BymaxCharacter status={status} paused={open || dragging}/>
    <span className={styles.launcherLabel}>
      {label}
    </span>
  </button>;
  return docked ? (dock ? createPortal(launcher,dock) : null) : launcher;
}
