"use client";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef } from "react";
import styles from "./Modal.module.css";

/**
 * Modal - Componente genérico reutilizable
 *
 * Props:
 * - abierto: boolean         → Controla si el modal se muestra
 * - onCerrar: () => void     → Callback para cerrar
 * - titulo: string           → Título del modal
 * - children: ReactNode      → Contenido interno (el form)
 */
export default function Modal({ abierto, onCerrar, titulo, children }) {
  const titleId = useId();
  const closeRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [abierto]);

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onCerrar();
    }
    if (event.key !== "Tab") return;
    const controls = Array.from(dialogRef.current.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
    )).filter(element => element.getClientRects().length);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  if (!abierto) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onCerrar}>
      <div
        ref={dialogRef}
        role="dialog" aria-modal="true" aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.titulo}>{titulo}</h2>

          <button
            ref={closeRef} aria-label="Cerrar ventana"
            className={styles.cerrar}
            onClick={onCerrar}
            type="button"
          >
            <X size={22} />
          </button>
        </div>

        <div className={styles.body}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
