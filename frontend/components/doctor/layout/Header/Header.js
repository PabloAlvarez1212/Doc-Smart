import Styles from "./Header.module.css";
import Image from "next/image";
import { Settings, UserCircle2Icon } from "lucide-react";
import Link from "next/link";
export default function Header() {
    return (
        <div className={Styles.containerHeader}>
            <div className={Styles.container}>
                <div className={Styles.logo}>
                    <Image src='/images/logo.png' width='130' height='100' alt="logo"/>
                    <h2><span>Doc</span> Smart</h2>
                    <UserCircle2Icon/>
                    <Settings/>
                </div>
                <div className={Styles.icons}></div>
            </div>
            <div className={Styles.containerNav}>
                <nav>
                    <ul>
                        <li>Inicio</li>
                        <li>Dashboard</li>
                        <li>Mis citas</li>
                        <li>Mis chats</li>
                        <li>Perfil</li>
                        <li>Notificaciones</li>
                        <li>Sobre nosotros</li>
                    </ul>
                </nav>
            </div>
        </div>
    )
}