"use client";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
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
  if (!abierto) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onCerrar}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.titulo}>{titulo}</h2>

          <button
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