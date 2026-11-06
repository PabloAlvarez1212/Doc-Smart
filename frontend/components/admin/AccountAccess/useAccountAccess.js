"use client";

import { useState } from "react";
import Swal from "sweetalert2";
import { cambiarAccesoCuentaService } from "@/app/services/adminServices";
import { obtenerPrimerError } from "@/app/utils/errrorUtils";

export default function useAccountAccess(tipo, recargar) {
  const [cuentaEnProceso, setCuentaEnProceso] = useState(null);

  const cambiarAcceso = async (cuenta) => {
    if (cuentaEnProceso !== null) return;
    const bloquear = !cuenta.acceso_bloqueado;
    const nombre = `${cuenta.nombre} ${cuenta.apellido}`;
    const confirmacion = await Swal.fire({
      title: bloquear ? "Bloquear cuenta" : "Desbloquear cuenta",
      text: bloquear
        ? `Indica el motivo para bloquear la cuenta de ${nombre}.`
        : `¿Desbloquear la cuenta de ${nombre}?`,
      icon: "warning",
      ...(bloquear ? {
        input: "textarea",
        inputLabel: "Motivo del bloqueo",
        inputPlaceholder: "Escribe el motivo del bloqueo...",
        inputAttributes: { "aria-label": "Motivo del bloqueo", maxlength: "500" },
        inputValidator: (valor) => valor?.trim() ? undefined : "El motivo del bloqueo es obligatorio.",
      } : {}),
      showCancelButton: true,
      confirmButtonText: bloquear ? "Bloquear cuenta" : "Desbloquear cuenta",
      cancelButtonText: "Cancelar",
      confirmButtonColor: bloquear ? "#a32d2d" : "#2455a4",
    });
    if (!confirmacion.isConfirmed) return;

    setCuentaEnProceso(cuenta.id);
    try {
      await cambiarAccesoCuentaService(tipo, cuenta.id, bloquear, bloquear ? confirmacion.value.trim() : "");
      await recargar();
      await Swal.fire({
        icon: "success",
        title: bloquear ? "Cuenta bloqueada" : "Cuenta desbloqueada",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      const mensaje = obtenerPrimerError(error.response?.data?.errores)
        || "No se pudo cambiar el acceso. Inténtalo de nuevo.";
      await Swal.fire({ icon: "error", title: "No se pudo actualizar la cuenta", text: mensaje });
    } finally {
      setCuentaEnProceso(null);
    }
  };

  return { cambiarAcceso, cuentaEnProceso };
}
