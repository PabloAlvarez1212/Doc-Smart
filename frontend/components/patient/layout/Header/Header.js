"use client";

import DocSmartNav from "../../../ui/DocSmartNav/DocSmartNav";
import ResetPasswordFormComponent from "../../../ui/ResetPasswordComponent/ResetPasswordComponent";
import useLogout from "../../../hooks/useLogout";
import { useState } from "react";
import SettingsComponent from "../../../ui/SettingsComponent/SettingsComponent";
import Modal from "../../../ui/Modal/Modal";
import { CalendarDays, FileHeart, House, KeyRound, MessagesSquare, Stethoscope, UserRound } from "lucide-react";
import { useNotificationsContext } from "../../../contex/NotificationsContext";
export default function Header() {
  const {
    noLeidas
  } = useNotificationsContext();
  const [modal, setModal] = useState(false);
  const [modalCambiarContrasena, setModalCambiarContrasena] = useState(false);
  const {logoutUser} = useLogout();
  return <div>
            <DocSmartNav home="/patient/home" onSettings={() => setModal(true)} sections={["Atención", "Mi salud"]} notifications={{
      href: "/patient/notifications",
      count: noLeidas ?? 0
    }} links={[{
      href: "/patient/home",
      label: "Inicio",
      icon: House
    }, {
      href: "/patient/my-appointments",
      label: "Mis citas",
      icon: CalendarDays,
      group: "Atención"
    }, {
      href: "/patient/my-chats",
      label: "Mis chats",
      icon: MessagesSquare,
      group: "Atención"
    }, {
      href: "/patient/my-medical-history",
      label: "Historial clínico",
      icon: FileHeart,
      group: "Mi salud"
    }, {
      href: "/patient/my-profile",
      label: "Perfil",
      icon: UserRound,
      group: "Mi salud"
    }, {
      href: "/patient/find-doctors",
      label: "Encontrar doctores",
      icon: Stethoscope,
      group: "Atención"
    }]} />
            <Modal titulo="Acciones" abierto={modal} onCerrar={() => setModal(false)} headerVariant="white">
              <SettingsComponent
                  reportesHref="/patient/reports"
                  onReportesClick={() => setModal(false)}
                  cerrarSesion={logoutUser}
                  abrirCambiarContrasena={() => {
                      setModal(false);
                      setModalCambiarContrasena(true);
                  }}
              />
            </Modal>
            <Modal titulo="Cambiar contraseña" abierto={modalCambiarContrasena} onCerrar={() => {
      setModalCambiarContrasena(false);
      setModal(true);
    }} headerVariant="yellow" text="Mantén tu cuenta segura con una contraseña fuerte" width="500px" icon={<KeyRound size={45} />}>
                <ResetPasswordFormComponent />
            </Modal>
        </div>;
}
