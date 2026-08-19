"use client";

import ProfileSidebar from "../../../../components/doctor/Profile/ProfileSidebar/ProfileSidebar";
import PersonalInfo from "../../../../components/doctor/Profile/PersonalInfo/PersonalInfo";
import useProfile from "../../../../components/doctor/Profile/useProfile";
import styles from "./MyProfile.module.css";

export default function MyProfile() {

    const {
        perfil,
        actualizarPerfilMedico,
        error,
        guardando,
        loading,
        actualizarFotoPerfil,
        eliminarFotoPerfil,
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
                    eliminarFotoPerfil={eliminarFotoPerfil}
                />
            </div>

            <div className={styles.personalInfo}>
                <PersonalInfo
                    perfil={perfil}
                    actualizarPerfilMedico={actualizarPerfilMedico}
                    guardando={guardando}
                />
            </div>

        </div>
    );
}