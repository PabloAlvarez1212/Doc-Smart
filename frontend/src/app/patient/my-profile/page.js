"use client";

import ProfileSidebar from "../../../../components/patient/Profile/ProfileSidebar/ProfileSidebar";
import PersonalInfo from "../../../../components/patient/Profile/PersonalInfo/PersonalInfo";
import styles from "./MyProfile.module.css";
import useProfile from "../../../../components/patient/Profile/useProfile";

export default function MyProfile() {

    const {
        perfil,
        actualizarPerfilPaciente,
        error,
        guardando,
        loading,
        actualizarFotoPerfil,
    } = useProfile();

    if (loading) {
        return (
            <div className={styles.containerMain}>
                <p>Cargando perfil...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.containerMain}>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className={styles.containerMain}>

            <div className={styles.profileSidebar}>
                <ProfileSidebar
                    perfil={perfil}
                    actualizarFotoPerfil={actualizarFotoPerfil}
                    guardando={guardando}
                />
            </div>

            <div className={styles.personalInfo}>
                <PersonalInfo
                    perfil={perfil}
                    actualizarPerfilPaciente={actualizarPerfilPaciente}
                    guardando={guardando}
                />
            </div>

        </div>
    );
}