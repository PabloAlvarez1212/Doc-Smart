"use client";
import Swal from "sweetalert2";
import { obtenerPrimerError } from "@/app/utils/errrorUtils";
import { useState } from "react";
import { cambiarContraseñaAuthService } from "@/app/services/authService";
export function useChangePassword() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const cambiarContraseña = async (data) => {
        try {

            setLoading(true);
            setError(null);
            await cambiarContraseñaAuthService(data);

            await Swal.fire({
                icon: "success",
                title: "Contraseña actualizada",
                text: "Tu contraseña se actualizó correctamente. Por seguridad, se cerrará tu sesión y deberás iniciar sesión nuevamente.",
                confirmButtonText: "Ir al inicio de sesión"
            });

            return true;

        } catch (error) {

            console.log("Error al cambiar contraseña:");
            const data = error.response?.data;

            const mensaje =
                obtenerPrimerError(data?.errores) ??
                obtenerPrimerError(data?.mensaje) ??
                "No se pudo cambiar la contraseña.";

            setError(mensaje);

            await Swal.fire({
                icon: "error",
                title: "No se pudo cambiar la contraseña",
                text: mensaje,
                confirmButtonText: "Aceptar",
            });

            return false;

        } finally {
            setLoading(false);
        }
    };

    return {
        cambiarContraseña,
        loading,
        error
    };
}