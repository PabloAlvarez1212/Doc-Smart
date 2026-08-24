"use client";

import Header from "../../../components/doctor/layout/Header/Header";
import styles from "./layout.module.css";

import useProfile from "../../../components/doctor/Profile/useProfile";
import { NotificationsProvider } from "../../../components/contex/NotificationsContext";

export default function DoctorLayout({ children }) {

    const {
        perfil,
        loading
    } = useProfile();

    if (loading) {
        return <p>Cargando...</p>;
    }

    return (
        <NotificationsProvider
            userId={perfil?.id}
            tipoUsuario="medico"
        >
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