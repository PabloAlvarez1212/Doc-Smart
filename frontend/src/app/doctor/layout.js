"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import Header from "../../../components/doctor/layout/Header/Header";
import styles from "./layout.module.css";
import useProfile from "../../../components/doctor/Profile/useProfile";
import { NotificationsProvider } from "../../../components/contex/NotificationsContext";

export default function DoctorLayout({ children }) {
    const router = useRouter();

    const {
        perfil,
        loading,
        error,
    } = useProfile();

    useEffect(() => {
        if (loading) return;

        // Usuario autenticado, pero no tiene permisos de médico.
        if (error === "NO_AUTORIZADO") {
            router.replace("/patient/home");
            return;
        }

        // No hay una sesión válida o ocurrió un error cargando el perfil.
        if (
            error === "NO_AUTENTICADO" ||
            error === "ERROR_PERFIL" ||
            !perfil
        ) {
            router.replace("/login");
            return;
        }

        // Protección adicional por si el endpoint devolviera
        // un perfil con un rol inesperado.
        if (
            perfil.rol !== "medico" &&
            perfil.rol !== "doctor"
        ) {
            if (perfil.rol === "paciente") {
                router.replace("/patient/home");
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

    // Mientras verificamos la sesión.
    if (loading) {
        return <p>Cargando...</p>;
    }

    // No renderizar contenido del médico mientras
    // estamos redirigiendo.
    if (
        error ||
        !perfil ||
        (
            perfil.rol !== "medico" &&
            perfil.rol !== "doctor"
        )
    ) {
        return null;
    }

    return (
        <NotificationsProvider>
            <div>
                <Header />

                <div className={styles.mainContent}>
                    <main>
                        {children}
                    </main>
                </div>
            </div>
        </NotificationsProvider>
    );
}