"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Header from "../../../components/admin/Header/Header"
import Nav from "../../../components/admin/Nav/Nav"
import Styles from "./layout.module.css"
import ResponsiveNav from "../../../components/ui/ResponsiveNav/ResponsiveNav"
import useProfile from "../../../components/admin/Profile/useProfile"
import useInactivityLogout from "../../../components/hooks/useInactivityLogout"
export default function AdminLayout({ children }) {
    useInactivityLogout()
    const router = useRouter()

    const {
        perfil,
        loading,
        error,
    } = useProfile()

    useEffect(() => {

        if (loading) return

        // No tiene una sesión válida
        if (
            error === "NO_AUTENTICADO" ||
            error === "ERROR_PERFIL" ||
            !perfil
        ) {
            router.replace("/login")
            return
        }

        // Está autenticado, pero no tiene permisos de admin
        if (error === "NO_AUTORIZADO") {
            router.replace("/login")
            return
        }

        // Protección adicional por rol
        if (perfil.rol !== "admin") {
            router.replace("/login")
            return
        }

    }, [
        perfil,
        loading,
        error,
        router,
    ])

    if (loading) {
        return <p>Cargando...</p>
    }

    // No mostrar contenido administrativo
    // mientras se realiza una redirección
    if (
        error ||
        !perfil ||
        perfil.rol !== "admin"
    ) {
        return null
    }

    return (
        <div className={Styles.containerMain}>

            <header className={Styles.header}>
                <Header />
            </header>

            <div className={Styles.workspace}>

                <aside className={Styles.nav}>
                    <ResponsiveNav
                        id="admin-navigation"
                        label="Menú de administración"
                    >
                        <Nav />
                    </ResponsiveNav>
                </aside>

                <main className={Styles.main}>
                    <div className={Styles.content}>
                        {children}
                    </div>
                </main>

            </div>

        </div>
    )
}
