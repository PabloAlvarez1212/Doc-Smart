"use client";

import { useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { logoutService } from "@/app/services/authService";
import { iniciarCierreSesion } from "@/app/services/api";

const TIEMPO_INACTIVIDAD = 15 * 60 * 1000;
const CLAVE_ULTIMA_ACTIVIDAD = "docsmart_ultima_actividad";

export default function useInactivityLogout() {
    const cerrandoRef = useRef(false);

    useEffect(() => {
        const registrarActividad = () => {
            if (cerrandoRef.current) return;

            localStorage.setItem(
                CLAVE_ULTIMA_ACTIVIDAD,
                Date.now().toString()
            );
        };

        const cerrarPorInactividad = async () => {
            if (cerrandoRef.current) return;

            cerrandoRef.current = true;
            iniciarCierreSesion();

            try {
                await logoutService();
            } catch (error) {
                console.error(
                    "Error al cerrar sesión por inactividad:",
                    error
                );
            }

            await Swal.fire({
                icon: "warning",
                title: "Sesión cerrada",
                text: "Tu sesión se cerró por inactividad.",
                confirmButtonText: "Ir al login",
                allowOutsideClick: false,
                allowEscapeKey: false,
            });

            localStorage.removeItem(CLAVE_ULTIMA_ACTIVIDAD);

            window.location.href = "/login";
        };

        const verificarInactividad = () => {
            const ultimaActividad = Number(
                localStorage.getItem(CLAVE_ULTIMA_ACTIVIDAD)
            );

            if (!ultimaActividad) {
                registrarActividad();
                return;
            }

            const tiempoTranscurrido =
                Date.now() - ultimaActividad;

            if (tiempoTranscurrido >= TIEMPO_INACTIVIDAD) {
                cerrarPorInactividad();
            }
        };

        const eventos = [
            "mousedown",
            "keydown",
            "touchstart",
            "scroll",
        ];

        registrarActividad();

        eventos.forEach(evento => {
            window.addEventListener(
                evento,
                registrarActividad,
                { passive: true }
            );
        });

        const intervalo = setInterval(
            verificarInactividad,
            30 * 1000
        );

        return () => {
            eventos.forEach(evento => {
                window.removeEventListener(
                    evento,
                    registrarActividad
                );
            });

            clearInterval(intervalo);
        };
    }, []);
}