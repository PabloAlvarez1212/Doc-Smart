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
                    <h2><span>Doc</span> Smart</h2>
                </div>
                <div className={Styles.icons}>
                    <UserCircle2Icon size={40} className={Styles.icon}/>
                    <Settings size={40} color="#262626" className={Styles.icon}/>
                </div>
            </div>
            <div className={Styles.containerNav}>
                <nav>
                    <ul>
                        <li><Link href='/patient/home'  className={activateLink('/patient/home')} >Inicio</Link></li>
                        <li><Link href='/patient/my-appointments'  className={activateLink('/patient/my-appointments')}>Mis citas</Link></li>
                        <li><Link href='/patient/my-profile'  className={activateLink('/patient/my-profile')}>Perfil</Link></li>
                        <li><Link href='/patient/chatbot'  className={activateLink('/patient/chatbot')}>Chat bot</Link></li>
                        <li><Link href='/patient/'  className={activateLink('/patient/')}>Encontar doctores</Link></li>
                        <li><Link href='/about'  className={activateLink('/about')}>Sobre nosotros</Link></li>
                    </ul>
                </nav>
            </div>
            <div className={Styles.line}></div>
        </div>
    )
}