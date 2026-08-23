"use client";
import Styles from "./Header.module.css";
import Image from "next/image";
import useLogout from "../../../hooks/useLogout";
import usePatient from "../../usePatient";
import { useState } from "react";
import SettingsComponent from "../../../ui/SettingsComponent/SettingsComponent";
import Modal from "../../../ui/Modal/Modal";
import { SettingsIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNotificationsContext } from "../../../contex/NotificationsContext";
export default function Header() {
    const {noLeidas} = useNotificationsContext()
    const [modal, setModal] = useState(false)
    const pathName = usePathname();
    const activateLink = function (route) {
        return pathName === route ? Styles.activar : Styles.link;
    }
    const {logoutUser} = useLogout()
    const {eliminarCuentaPaciente} = usePatient()
    return (
        <div className={Styles.containerHeader}>
            <div className={Styles.container}>
                <div className={Styles.logo}>
                    <Image src='/images/logo.png' width='130' height='100' alt="logo" />
                    <h2><span>Doc</span>Smart</h2>
                </div>
                <div className={Styles.icon}>
                    <SettingsIcon onClick={() => setModal(true)} className={Styles.iconSettings} />
                </div>
            </div>
            <div className={Styles.containerNav}>
                <nav>
                    <ul>
                        <li><Link href='/patient/home' className={activateLink('/patient/home')} >Inicio</Link></li>
                        <li><Link href='/patient/my-appointments' className={activateLink('/patient/my-appointments')}>Mis citas</Link></li>
                        <li><Link href='/patient/my-profile' className={activateLink('/patient/my-profile')}>Perfil</Link></li>
                        <li><Link href='/patient/chatbot' className={activateLink('/patient/chatbot')}>Chat bot</Link></li>
                        <li><Link href='/patient/' className={activateLink('/patient/')}>Encontar doctores</Link></li>
                        <li><Link href='/patient/notifications' className={activateLink('/patient/notifications')}>Notificaciones&nbsp;&nbsp;({noLeidas ?? 0})</Link></li>
                    </ul>
                </nav>
            </div>
            <Modal
                titulo="Acciones"
                abierto={modal}
                onCerrar={() => setModal(false)}
            >
                <SettingsComponent
                    cerrarSesion={logoutUser}
                    eliminarCuenta={eliminarCuentaPaciente}
                />
            </Modal>
        </div>
    )
}