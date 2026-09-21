"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import useInactivityLogout from "../../../components/hooks/useInactivityLogout";
import Header from "../../../components/doctor/layout/Header/Header";
import styles from "./layout.module.css";
import BymaxAssistant from "../../../components/bymax/BymaxAssistant";
import useProfile from "../../../components/doctor/Profile/useProfile";
import { NotificationsProvider } from "../../../components/contex/NotificationsContext";

export default function DoctorLayout({ children }) {
    useInactivityLogout()
    const pathname = usePathname();
    const esPaginaValidacion = pathname === "/doctor/validacion";

    // Al salir de validación, comprobar un perfil nuevo antes de abrir el panel.
    return (
        <DoctorAccess key={esPaginaValidacion ? "validacion" : "panel"} esPaginaValidacion={esPaginaValidacion}>
            {children}
        </DoctorAccess>
    );
}

function DoctorAccess({ children, esPaginaValidacion }) {
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

        // Protección adicional por rol.
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
            return;
        }

        // Médico aprobado intentando entrar a la página de validación.
        if (
            perfil.estado_validacion === "aprobado" &&
            esPaginaValidacion
        ) {
            router.replace("/doctor/home");
            return;
        }

        // Médico pendiente, rechazado o sin solicitud intentando
        // acceder al área normal del médico.
        if (
            perfil.estado_validacion !== "aprobado" &&
            !esPaginaValidacion
        ) {
            router.replace("/doctor/validacion");
            return;
        }

    }, [
        perfil,
        loading,
        error,
        router,
        esPaginaValidacion,
    ]);

    // Mientras verificamos la sesión.
    if (loading) {
        return <p>Cargando...</p>;
    }

    // No renderizar contenido si no existe una sesión válida.
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

    // Médico no aprobado intentando entrar al panel.
    // Evita mostrar por un instante el contenido protegido
    // mientras ocurre la redirección.
    if (
        perfil.estado_validacion !== "aprobado" &&
        !esPaginaValidacion
    ) {
        return null;
    }

    // Médico aprobado intentando entrar a /doctor/validacion.
    if (
        perfil.estado_validacion === "aprobado" &&
        esPaginaValidacion
    ) {
        return null;
    }

    // La página de validación no utiliza el layout normal del médico.
    if (esPaginaValidacion) {
        return children;
    }

    // Área normal para médicos aprobados.
    return (
        <NotificationsProvider>
            <div>
                <Header />

                <BymaxAssistant modo="medico" />

                <div className={styles.mainContent}>
                    <main>
                        {children}
                    </main>
                </div>
            </div>
        </NotificationsProvider>
    );
}
