"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import Header from "../../../components/patient/layout/Header/Header";
import styles from "./layout.module.css";
import useProfile from "../../../components/patient/Profile/useProfile";
import { NotificationsProvider } from "../../../components/contex/NotificationsContext";
import BymaxAssistant from "../../../components/bymax/BymaxAssistant";

export default function PacienteLayout({ children }) {
    const router = useRouter();

    const {
        perfil,
        loading,
        error,
    } = useProfile();

    useEffect(() => {
        if (loading) return;

        // Usuario autenticado, pero no pertenece a la zona de paciente
        if (error === "NO_AUTORIZADO") {
            router.replace("/doctor/home");
            return;
        }

        // Sesión inválida o error al obtener perfil
        if (
            error === "NO_AUTENTICADO" ||
            error === "ERROR_PERFIL" ||
            !perfil
        ) {
            router.replace("/login");
            return;
        }

        // Protección adicional por rol
        if (perfil.rol !== "paciente") {
            if (
                perfil.rol === "medico" ||
                perfil.rol === "doctor"
            ) {
                router.replace("/doctor/home");
                return;
            }

            if (perfil.rol === "admin") {
                router.replace("/admin/dashboard");
                return;
            }

            router.replace("/login");
        }

    }, [
        perfil,
        loading,
        error,
        router,
    ]);

    if (loading) {
        return <p>Cargando...</p>;
    }

    // No renderizar contenido mientras se redirige
    if (
        error ||
        !perfil ||
        perfil.rol !== "paciente"
    ) {
        return null;
    }

    return (
        <NotificationsProvider>
            <div>
                <Header />

                <div className={styles.main}>
                    <main>
                        {children}
                    </main>
                </div>

                <BymaxAssistant />
            </div>
        </NotificationsProvider>
    );
}