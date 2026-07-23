"use client";
import Styles from "./Header.module.css";
import Image from "next/image";
import { Settings, UserCircle2Icon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
export default function Header() {
    const pathName = usePathname();
    const activateLink = function(route){
        return pathName === route ? Styles.activar : Styles.link;
    }
    return (
        <div className={Styles.containerHeader}>
            <div className={Styles.container}>
                <div className={Styles.logo}>
                    <Image src='/images/logo.png' width='130' height='100' alt="logo"/>
                    <h2><span>Doc</span>Smart</h2>
                </div>
                <div className={Styles.icons}>
                    <UserCircle2Icon size={32} className={Styles.icon}/>
                    <Settings size={32} color="#262626" className={Styles.icon}/>
                </div>
            </div>
            <div className={Styles.containerNav}>
                <nav>
                    <ul>
                        <li><Link href='/doctor/home'  className={activateLink('/patient/home')} >Inicio</Link></li>
                        <li><Link href='/doctor/dashboard'  className={activateLink('/doctor/dashboard')}>Dashboard</Link></li>
                        <li><Link href='/doctor/my-appointments'  className={activateLink('/doctor/my-appointments')}>Mis Citas</Link></li>
                        <li><Link href='/doctor/my-chats'  className={activateLink('/doctor/my-chats')}>Mis Chats</Link></li>
                        <li><Link href='/doctor/my-profile'  className={activateLink('/doctor/my-profile')}>Perfil</Link></li>
                        <li><Link href='/doctor/notifications/'  className={activateLink('/doctor/notifications')}>Notificaciones</Link></li>
                    </ul>
                </nav>
            </div>
            <div className={Styles.line}></div>
        </div>
    )
}


