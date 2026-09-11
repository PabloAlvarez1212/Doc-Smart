"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { KeyRound, Settings, ShieldCheck } from "lucide-react";
import { useState } from "react";
import useLogout from "../../hooks/useLogout";
import Modal from "../../ui/Modal/Modal";
import ResetPasswordFormComponent from "../../ui/ResetPasswordComponent/ResetPasswordComponent";
import SettingsComponent from "../../ui/SettingsComponent/SettingsComponent";
import styles from "./Header.module.css";

const sectionNames = {
    "/admin/dashboard": "Resumen",
    "/admin/patients": "Pacientes",
    "/admin/doctors": "Médicos",
    "/admin/doctor-requests": "Solicitudes médicas",
    "/admin/specialties": "Especialidades",
    "/admin/cities": "Ciudades",
    "/admin/departments": "Departamentos",
    "/admin/roles": "Roles",
    "/admin/states": "Estados",
    "/admin/channel": "Medios",
};

export default function Header() {
    const pathname = usePathname();
    const [modal, setModal] = useState(false);
    const [passwordModal, setPasswordModal] = useState(false);
    const { logoutUser } = useLogout();

    return (
        <div className={styles.header}>
            <div className={styles.logo}>
                <Image src="/images/logo.png" width={64} height={48} alt="DocSmart" priority />
                <span className={styles.wordmark}><strong>Doc</strong>Smart</span>
            </div>

            <div className={styles.context} aria-label="Sección actual">
                <span className={styles.contextIcon}><ShieldCheck size={17} /></span>
                <span>
                    <small>Panel administrativo</small>
                    <strong>{sectionNames[pathname] ?? "Administración"}</strong>
                </span>
            </div>

            <button type="button" aria-label="Abrir ajustes" className={styles.settingsButton} onClick={() => setModal(true)}>
                <Settings size={20} />
                <span>Ajustes</span>
            </button>

            <Modal titulo="Cuenta y seguridad" abierto={modal} headerVariant="white" onCerrar={() => setModal(false)}>
                <SettingsComponent
                    cerrarSesion={logoutUser}
                    abrirCambiarContrasena={() => {
                        setModal(false);
                        setPasswordModal(true);
                    }}
                />
            </Modal>
            <Modal
                titulo="Cambiar contraseña"
                abierto={passwordModal}
                onCerrar={() => {
                    setPasswordModal(false);
                    setModal(true);
                }}
                headerVariant="yellow"
                text="Mantén tu cuenta segura con una contraseña fuerte"
                width="500px"
                icon={<KeyRound size={38} />}
            >
                <ResetPasswordFormComponent />
            </Modal>
        </div>
    );
}
