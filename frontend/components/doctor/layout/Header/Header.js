
"use client";

import ResetPasswordFormComponent from "../../../ui/ResetPasswordComponent/ResetPasswordComponent";
import DocSmartNav from "../../../ui/DocSmartNav/DocSmartNav";
import {
    CalendarDays,
    Clock,
    House,
    KeyRound,
    LayoutDashboard,
    MessagesSquare,
    UserRound,
    Settings,
} from "lucide-react";
import { useState } from "react";

import useLogout from "../../../hooks/useLogout";
import Modal from "../../../ui/Modal/Modal";
import SettingsComponent from "../../../ui/SettingsComponent/SettingsComponent";
import { useNotificationsContext } from "../../../contex/NotificationsContext";

export default function Header() {
    const { noLeidas } = useNotificationsContext();

    const [modal, setModal] = useState(false);
    const [modalCambiarContrasena, setModalCambiarContrasena] = useState(false);

    const { logoutUser } = useLogout();

    return (
        <div>
            <DocSmartNav
                variant="doctor-home"
                home="/doctor/home"
                onSettings={() => setModal(true)}
                sections={["Consulta", "Mi práctica"]}
                notifications={{
                    href: "/doctor/notifications",
                    count: noLeidas ?? 0,
                }}
                links={[
                    {
                        href: "/doctor/home",
                        label: "Inicio",
                        icon: House,
                    },
                    {
                        href: "/doctor/dashboard",
                        label: "Dashboard",
                        icon: LayoutDashboard,
                        group: "Mi práctica",
                    },
                    {
                        href: "/doctor/my-appointments",
                        label: "Mis citas",
                        icon: CalendarDays,
                        group: "Consulta",
                    },
                    {
                        href: "/doctor/my-chats",
                        label: "Mis chats",
                        icon: MessagesSquare,
                        group: "Consulta",
                    },
                    {
                        href: "/doctor/availability",
                        label: "Disponibilidad",
                        icon: Clock,
                        group: "Consulta",
                    },
                    {
                        href: "/doctor/my-profile",
                        label: "Perfil",
                        icon: UserRound,
                        group: "Mi práctica",
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
                    reportesHref="/doctor/reports"
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
