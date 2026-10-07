"use client";

import { AlertCircle } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import PersonalInfo from "../../../../components/patient/Profile/PersonalInfo/PersonalInfo";
import ProfileSidebar from "../../../../components/patient/Profile/ProfileSidebar/ProfileSidebar";
import useProfile from "../../../../components/patient/Profile/useProfile";
import styles from "./MyProfile.module.css";

export default function MyProfile() {
    const reduceMotion = useReducedMotion();
    const {
        perfil,
        actualizarPerfilPaciente,
        error,
        guardando,
        loading,
        actualizarFotoPerfil,
        eliminarFotoPerfil,
    } = useProfile();
    const entrance = reduceMotion
        ? { initial: false, animate: { opacity: 1, transform: "translateY(0px)" }, transition: { duration: 0 } }
        : { initial: { opacity: 1, transform: "translateY(4px)" }, animate: { opacity: 1, transform: "translateY(0px)" }, transition: { duration: .18, ease: [0.23, 1, 0.32, 1] } };

    if (loading) return <ProfileSkeleton />;

    if (error || !perfil) {
        return (
            <main className={styles.page}>
                <div className={styles.errorState} role="alert">
                    <span aria-hidden="true"><AlertCircle size={24} /></span>
                    <div>
                        <h1>No pudimos cargar tu perfil</h1>
                        <p>Vuelve a intentarlo en unos momentos.</p>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className={styles.page}>
            <header className={styles.pageHeader}>
                <div>
                    <h1>Mi perfil</h1>
                    <p>Mantén actualizados tus datos personales y de salud.</p>
                </div>
                <span>Perfil del paciente</span>
            </header>

            <div className={styles.profileLayout}>
                <m.div className={styles.sidebarColumn} {...entrance}>
                    <ProfileSidebar
                        perfil={perfil}
                        actualizarFotoPerfil={actualizarFotoPerfil}
                        guardando={guardando}
                        eliminarFotoPerfil={eliminarFotoPerfil}
                    />
                </m.div>

                <m.div className={styles.formColumn} {...entrance}>
                    <PersonalInfo
                        perfil={perfil}
                        actualizarPerfilPaciente={actualizarPerfilPaciente}
                        guardando={guardando}
                    />
                </m.div>
            </div>
        </main>
    );
}

function ProfileSkeleton() {
    return (
        <main className={styles.page}>
            <div className={styles.skeletonHeader} role="status" aria-label="Cargando perfil">
                <span /><span />
            </div>
            <div className={styles.skeletonLayout} aria-hidden="true">
                <span className={styles.skeletonSidebar} />
                <div><span /><span /></div>
            </div>
        </main>
    );
}
