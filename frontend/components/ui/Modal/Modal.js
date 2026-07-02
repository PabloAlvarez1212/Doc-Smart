"use client";
import { X } from "lucide-react";
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

  return (
    <div className={styles.overlay} onClick={onCerrar}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()} // evita cerrar al clickear el contenido
      >
        {/* Header del modal */}
        <div className={styles.header}>
          <h2 className={styles.titulo}>{titulo}</h2>
          <button className={styles.cerrar} onClick={onCerrar} type="button">
            <X size={22} />
          </button>
        </div>

        {/* Contenido */}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
