"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState } from "react";
import styles from "./Modal.module.css";

export default function Modal({
  abierto,
  onCerrar,
  onExitComplete,
  titulo,
  children,
  headerVariant = "default",
  text = "",
  width = "480px",
  icon,
}) {
  const titleId = useId();
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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

    const controls = Array.from(dialogRef.current?.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
    ) || []).filter((element) => element.getClientRects().length);
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

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence onExitComplete={onExitComplete}>
      {abierto && (
        <motion.div
          className={styles.overlay}
          onClick={onCerrar}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onKeyDown={handleKeyDown}
            className={styles.modal}
            style={{ width: "100%", maxWidth: width }}
            onClick={(event) => event.stopPropagation()}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, transform: "translateY(10px) scale(0.98)" }}
            animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
            exit={reduceMotion ? { opacity: 1 } : { opacity: 0, transform: "translateY(6px) scale(0.985)" }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className={`${styles.header} ${styles[headerVariant]}`}>
              <div className={styles.container}>
                {icon}
                <div className={styles.containerTitle}>
                  <h2 id={titleId} className={styles.titulo}>{titulo}</h2>
                  {text && <p>{text}</p>}
                </div>
              </div>
              <button
                ref={closeRef}
                aria-label="Cerrar ventana"
                className={styles.cerrar}
                onClick={onCerrar}
                type="button"
              >
                <X size={22} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.body}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
