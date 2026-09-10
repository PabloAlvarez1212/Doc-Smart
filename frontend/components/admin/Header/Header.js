"use client"
import Styles from "./Header.module.css";
import Image from "next/image";
import useLogout from "../../hooks/useLogout";
import Modal from "../../ui/Modal/Modal";
import SettingsComponent from "../../ui/SettingsComponent/SettingsComponent";
import { useState } from "react";
import { SettingsIcon,KeyRound } from "lucide-react";
import ResetPasswordFormComponent from "../../ui/ResetPasswordComponent/ResetPasswordComponent";

export default function Header() {
    const [modal, setModal] = useState(false);
    const [modalCambiarContrasena, setModalCambiarContrasena] = useState(false)
    const { logoutUser } = useLogout();
    return (
        <div className={Styles.containerHeader}>
            <div className={Styles.container}>
                <div className={Styles.logo}>
                    <Image src='/images/logo.png' width='130' height='100' alt="logo" />
                    <h2><span>Doc</span>Smart</h2>
                </div>
                <div className={Styles.icons}>
                    <button type="button" aria-label="Abrir ajustes" className={Styles.settingsButton} onClick={() => setModal(true)}>
                        <SettingsIcon className={Styles.iconSettings} />
                    </button>

                </div>
            </div>
            <Modal
                titulo="Acciones"
                abierto={modal}
                headerVariant="white"
                onCerrar={() => setModal(false)}
            >
                <SettingsComponent
                    cerrarSesion={logoutUser}
                    abrirCambiarContrasena={() => {
                        setModal(false)
                        setModalCambiarContrasena(true)
                    }}
                />
            </Modal>
            <Modal
                titulo="Cambiar contraseña"
                abierto={modalCambiarContrasena}
                onCerrar={() => {
                    setModalCambiarContrasena(false)
                    setModal(true)
                }}
                headerVariant="yellow"
                text="Mantén tu cuenta segura con una contraseña fuerte"
                width="500px"
                icon={<KeyRound size={45} />}
            >
                <ResetPasswordFormComponent />
            </Modal>
        </div>
    )
}
