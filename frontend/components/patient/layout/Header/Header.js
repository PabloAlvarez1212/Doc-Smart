
"use client";

import { useState } from "react";
import {
    CalendarDays,
    FileHeart,
    House,
    KeyRound,
    MessagesSquare,
    Settings,
    Stethoscope,
    UserRound,
} from "lucide-react";

import DocSmartNav from "../../../ui/DocSmartNav/DocSmartNav";
import ResetPasswordFormComponent from "../../../ui/ResetPasswordComponent/ResetPasswordComponent";
import SettingsComponent from "../../../ui/SettingsComponent/SettingsComponent";
import Modal from "../../../ui/Modal/Modal";
import useLogout from "../../../hooks/useLogout";
import { useNotificationsContext } from "../../../contex/NotificationsContext";

export default function Header() {
    const { noLeidas } = useNotificationsContext();

    const [modal, setModal] = useState(false);
    const [modalCambiarContrasena, setModalCambiarContrasena] = useState(false);

    const { logoutUser } = useLogout();

    return (
        <div>
            <DocSmartNav
                home="/patient/home"
                onSettings={() => setModal(true)}
                sections={["Atención", "Mi salud"]}
                favorites={{
                    href: "/patient/favorites",
                }}
                notifications={{
                    href: "/patient/notifications",
                    count: noLeidas ?? 0,
                }}
                links={[
                    {
                        href: "/patient/home",
                        label: "Inicio",
                        icon: House,
                    },
                    {
                        href: "/patient/my-appointments",
                        label: "Mis citas",
                        icon: CalendarDays,
                        group: "Atención",
                    },
                    {
                        href: "/patient/my-chats",
                        label: "Mis chats",
                        icon: MessagesSquare,
                        group: "Atención",
                    },
                    {
                        href: "/patient/my-medical-history",
                        label: "Historial clínico",
                        icon: FileHeart,
                        group: "Mi salud",
                    },
                    {
                        href: "/patient/my-profile",
                        label: "Perfil",
                        icon: UserRound,
                        group: "Mi salud",
                    },
                    {
                        href: "/patient/find-doctors",
                        label: "Encontrar doctores",
                        icon: Stethoscope,
                        group: "Atención",
                    },
                ]}
            />

            <Modal
                titulo="Configuración"
                text="Personaliza DocSmart a tu manera."
                abierto={modal}
                onCerrar={() => setModal(false)}
                headerVariant="white"
                width="620px"
                icon={<Settings size={22} aria-hidden="true" />}
            >
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

            <Modal
                titulo="Cambiar contraseña"
                abierto={modalCambiarContrasena}
                onCerrar={() => {
                    setModalCambiarContrasena(false);
                    setModal(true);
                }}
                headerVariant="white"
                text="Mantén tu cuenta segura con una contraseña fuerte"
                width="500px"
                icon={<KeyRound size={22} aria-hidden="true" />}
            >
                <ResetPasswordFormComponent />
            </Modal>
        </div>
    );
}
