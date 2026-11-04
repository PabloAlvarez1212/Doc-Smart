"use client";

import { KeyRound } from "lucide-react";
import { useState } from "react";
import useLogout from "../../hooks/useLogout";
import Modal from "../../ui/Modal/Modal";
import ResetPasswordFormComponent from "../../ui/ResetPasswordComponent/ResetPasswordComponent";
import SettingsComponent from "../../ui/SettingsComponent/SettingsComponent";
import Nav from "../Nav/Nav";

export default function Header() {
  const [modal, setModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const {
    logoutUser
  } = useLogout();
  return <>
            <Nav onSettings={() => setModal(true)} />

            <Modal titulo="Cuenta y seguridad" abierto={modal} headerVariant="white" onCerrar={() => setModal(false)}>
                <SettingsComponent cerrarSesion={logoutUser} abrirCambiarContrasena={() => {
        setModal(false);
        setPasswordModal(true);
      }} />
            </Modal>
            <Modal titulo="Cambiar contraseña" abierto={passwordModal} onCerrar={() => {
      setPasswordModal(false);
      setModal(true);
    }} headerVariant="yellow" text="Mantén tu cuenta segura con una contraseña fuerte" width="500px" icon={<KeyRound size={38} />}>
                <ResetPasswordFormComponent />
            </Modal>
        </>;
}
