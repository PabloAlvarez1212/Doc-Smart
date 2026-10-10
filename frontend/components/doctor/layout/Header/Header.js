"use client";

import ResetPasswordFormComponent from "../../../ui/ResetPasswordComponent/ResetPasswordComponent";
import DocSmartNav from "../../../ui/DocSmartNav/DocSmartNav";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import useLogout from "../../../hooks/useLogout";
import Modal from "../../../ui/Modal/Modal";
import SettingsComponent from "../../../ui/SettingsComponent/SettingsComponent";
import useDoctor from "../../useDoctor";
export default function Header() {
  const [modal, setModal] = useState(false);
  const [modalCambiarContrasena, setModalCambiarContrasena] = useState(false);
  const {
    eliminarCuentaMedico
  } = useDoctor();
  const {
    logoutUser
  } = useLogout();
  return <div>
            <DocSmartNav home="/doctor/home" onSettings={() => setModal(true)} links={[{
      href: "/doctor/home",
      label: "Inicio"
    }, {
      href: "/doctor/dashboard",
      label: "Dashboard"
    }, {
      href: "/doctor/my-appointments",
      label: "Mis citas"
    }, {
      href: "/doctor/my-chats",
      label: "Mis chats"
    }, {
      href: "/doctor/availability",
      label: "Disponibilidad"
    }, {
      href: "/doctor/my-profile",
      label: "Perfil"
    }, {
      href: "/doctor/notifications",
      label: "Notificaciones"
    }]} />
            <Modal titulo="Acciones" abierto={modal} headerVariant="white" onCerrar={() => setModal(false)}>
                <SettingsComponent cerrarSesion={logoutUser} eliminarCuenta={eliminarCuentaMedico} abrirCambiarContrasena={() => {
        setModal(false);
        setModalCambiarContrasena(true);
      }} />
            </Modal>
            <Modal titulo="Cambiar contraseña" abierto={modalCambiarContrasena} onCerrar={() => {
      setModalCambiarContrasena(false);
      setModal(true);
    }} headerVariant="yellow" text="Mantén tu cuenta segura con una contraseña fuerte" width="500px" icon={<KeyRound size={45} />}>
                <ResetPasswordFormComponent />
            </Modal>
        </div>;
}
