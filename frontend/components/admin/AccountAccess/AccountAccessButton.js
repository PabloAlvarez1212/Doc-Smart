"use client";

import { LockKeyhole, LockKeyholeOpen } from "lucide-react";
import styles from "./AccountAccessButton.module.css";

export default function AccountAccessButton({ cuenta, onCambiar, disabled }) {
  const bloqueada = cuenta.acceso_bloqueado;
  const etiqueta = bloqueada ? "Desbloquear" : "Bloquear";
  const Icon = bloqueada ? LockKeyholeOpen : LockKeyhole;

  return (
    <button
      type="button"
      className={`${styles.button} ${bloqueada ? styles.unlock : styles.lock}`}
      onClick={() => onCambiar(cuenta)}
      disabled={disabled}
      aria-label={`${etiqueta} cuenta de ${cuenta.nombre} ${cuenta.apellido}`}
    >
      <Icon size={16} aria-hidden="true" />
      {etiqueta}
    </button>
  );
}
