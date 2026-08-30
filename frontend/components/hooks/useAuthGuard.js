"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/app/services/api";

export const useAuthGuard = (rolPermitido) => {
    const router = useRouter();

    const [cargando, setCargando] = useState(true);
    const [usuario, setUsuario] = useState(null);

    useEffect(() => {
        let activo = true;

        const verificarSesion = async () => {
            try {
                const response = await api.get("/perfil/");

                const perfil = response?.data?.data;

                if (!perfil) {
                    router.replace("/login");
                    return;
                }

                const rol = perfil.rol;

                // El usuario está autenticado,
                // pero intenta entrar a una zona de otro rol.
                if (rolPermitido && rol !== rolPermitido) {

                    if (rol === "paciente") {
                        router.replace("/patient/home");
                        return;
                    }

                    if (
                        rol === "medico" ||
                        rol === "doctor"
                    ) {
                        router.replace("/doctor/home");
                        return;
                    }

                    if (rol === "admin") {
                        router.replace("/admin/dashboard");
                        return;
                    }

                    router.replace("/login");
                    return;
                }

                if (activo) {
                    setUsuario(perfil);
                }

            } catch {
                // Si el access expiró, api.js intenta refresh
                // automáticamente antes de llegar aquí.
                //
                // Si llegamos aquí, significa que la sesión
                // realmente no pudo recuperarse.
                if (activo) {
                    router.replace("/login");
                }

            } finally {
                if (activo) {
                    setCargando(false);
                }
            }
        };

        verificarSesion();

        return () => {
            activo = false;
        };

    }, [rolPermitido, router]);

    return {
        usuario,
        cargando,
    };
};