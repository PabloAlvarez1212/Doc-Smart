"use client";

import { AlertCircle } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import ProfileSidebar from "../../../../components/doctor/Profile/ProfileSidebar/ProfileSidebar";
import PersonalInfo from "../../../../components/doctor/Profile/PersonalInfo/PersonalInfo";
import useProfile from "../../../../components/doctor/Profile/useProfile";
import EmailChangeModal from "../../../../components/patient/Profile/EmailChangeModal/EmailChangeModal";
import styles from "./MyProfile.module.css";
import useCalificacionesMedico from "../../../../components/hooks/useCalificacionesMedico";
import RatingsPanel from "../../../../components/ui/MedicalRatings/RatingsPanel/RatingsPanel";

export default function MyProfile() {
    const reduced = useReducedMotion();
    const entrance = { initial: reduced ? false : { y: 4 }, animate: { y: 0 }, transition: { duration: reduced ? 0 : .18, ease: [.23,1,.32,1] } };

    const {
        cambioCorreo, ocupadoCorreo, abrirCambioCorreo, cerrarCambioCorreo, editarCambioCorreo, enviarCambioCorreo, reiniciarCambioCorreo,
        perfil,
        actualizarPerfilMedico,
        error,
        guardando,
        loading,
        actualizarFotoPerfil,
        eliminarFotoPerfil,
    } = useProfile();

    const ratings = useCalificacionesMedico(perfil?.id, {
        incluirResenas: true,
        resenasPrivadas: true,
        activo: Boolean(perfil?.id),
    });

    if (loading) {
        return <div className={styles.page} role="status" aria-label="Cargando perfil">
            <div className={styles.skeletonHeader} aria-hidden="true"><span /><span /></div>
            <div className={styles.skeletonLayout} aria-hidden="true"><span /><div><span /><span /></div></div>
        </div>;
    }

    if (error || !perfil) {
        return <div className={styles.page}><div className={styles.errorState} role="alert"><AlertCircle size={24} aria-hidden="true" /><div><h1>No pudimos cargar tu perfil</h1><p>Vuelve a intentarlo en unos momentos.</p></div></div></div>;
    }

    return (
        <div className={styles.page}>
            <EmailChangeModal actual={perfil.correo} flujo={cambioCorreo} ocupado={ocupadoCorreo} onCerrar={cerrarCambioCorreo} onEditar={editarCambioCorreo} onEnviar={enviarCambioCorreo} onReiniciar={reiniciarCambioCorreo} />
            <header className={styles.pageHeader}>
                <div><h1>Mi perfil</h1><p>Mantén actualizados tus datos personales y profesionales.</p></div>
                <span>Perfil del médico</span>
            </header>
            <div className={styles.profileLayout}>
                <motion.div className={styles.sidebarColumn} {...entrance}>
                    <ProfileSidebar perfil={perfil} actualizarFotoPerfil={actualizarFotoPerfil} guardando={guardando} eliminarFotoPerfil={eliminarFotoPerfil} />
                </motion.div>
                <motion.div className={styles.formColumn} {...entrance}>
                    <PersonalInfo onCambiarCorreo={abrirCambioCorreo} ocupadoCorreo={ocupadoCorreo} perfil={perfil} actualizarPerfilMedico={actualizarPerfilMedico} guardando={guardando} />
                    <RatingsPanel
                        resumen={ratings.resumen}
                        calificaciones={ratings.calificaciones}
                        loading={ratings.loading}
                        error={ratings.error}
                        onRetry={ratings.retry}
                    />
                </motion.div>
            </div>
        </div>
    );
}
