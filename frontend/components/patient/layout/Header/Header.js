"use client";

import DocSmartNav from "../../../ui/DocSmartNav/DocSmartNav";
import ResetPasswordFormComponent from "../../../ui/ResetPasswordComponent/ResetPasswordComponent";
import useLogout from "../../../hooks/useLogout";
import usePatient from "../../usePatient";
import { useState } from "react";
import SettingsComponent from "../../../ui/SettingsComponent/SettingsComponent";
import Modal from "../../../ui/Modal/Modal";
import { KeyRound } from "lucide-react";
import { useNotificationsContext } from "../../../contex/NotificationsContext";
export default function Header() {
  const {
    noLeidas
  } = useNotificationsContext();
  const [modal, setModal] = useState(false);
  const [modalCambiarContrasena, setModalCambiarContrasena] = useState(false);
  const {
    logoutUser
  } = useLogout();
  const {
    eliminarCuentaPaciente
  } = usePatient();
  return <div>
            <DocSmartNav home="/patient/home" onSettings={() => setModal(true)} links={[{
      href: "/patient/home",
      label: "Inicio"
    }, {
      href: "/patient/my-appointments",
      label: "Mis citas"
    }, {
      href: "/patient/my-chats",
      label: "Mis chats"
    }, {
      href: "/patient/my-medical-history",
      label: "Historial clínico"
    }, {
      href: "/patient/my-profile",
      label: "Perfil"
    }, {
      href: "/patient/find-doctors",
      label: "Encontrar doctores"
    }, {
      href: "/patient/notifications",
      label: `Notificaciones (${noLeidas ?? 0})`
    }]} />
            <Modal titulo="Acciones" abierto={modal} onCerrar={() => setModal(false)} headerVariant="white">
                <SettingsComponent cerrarSesion={logoutUser} eliminarCuenta={eliminarCuentaPaciente} abrirCambiarContrasena={() => {
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
