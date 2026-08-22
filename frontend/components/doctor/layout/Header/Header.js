"use client";

import Styles from "./Header.module.css";
import Image from "next/image";
import { SettingsIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import useLogout from "../../../hooks/useLogout";
import Modal from "../../../ui/Modal/Modal";
import SettingsComponent from "../../../ui/SettingsComponent/SettingsComponent";
import useDoctor from "../../useDoctor";

export default function Header() {
    const [modal, setModal] = useState(false);
    const pathName = usePathname();
    const {
        eliminarCuentaMedico
    } = useDoctor();
    const activateLink = function (route) {
        return pathName === route ? Styles.activar : Styles.link;
    };
    const { logoutUser } = useLogout();
    return (
        <div className={Styles.containerHeader}>
            <div className={Styles.container}>
                <div className={Styles.logo}>
                    <Image src="/images/logo.png" width={130} height={100} alt="logo"/>
                    <h2><span>Doc</span>Smart</h2>
                </div>
                <div className={Styles.icon}>
                    <SettingsIcon onClick={() => setModal(true)} className={Styles.iconSettings}/>
                </div>
            </div>
            <div className={Styles.containerNav}>
                <nav>
                    <ul>
                        <li><Link href="/doctor/home" className={activateLink("/doctor/home")}>Inicio</Link></li>
                        <li><Link href="/doctor/dashboard" className={activateLink("/doctor/dashboard")}>Dashboard</Link></li>
                        <li><Link href="/doctor/my-appointments" className={activateLink("/doctor/my-appointments")}>Mis Citas</Link></li>
                        <li><Link href="/doctor/my-chats" className={activateLink("/doctor/my-chats")}>Mis Chats</Link></li>
                        <li><Link href="/doctor/my-profile" className={activateLink("/doctor/my-profile")}>Perfil</Link></li>
                        <li><Link href="/doctor/notifications" className={activateLink("/doctor/notifications")}>Notificaciones</Link></li> 
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
                    eliminarCuenta={eliminarCuentaMedico}
                />
            </Modal>
        </div>
    );
}