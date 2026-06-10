"use client"
import Styles from "./Header.module.css";
import Image from "next/image";
import { Settings, UserCircle2Icon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
export default function Header() {
    const pathName = usePathname(); 
    const activarLink = function (route){
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
                    <UserCircle2Icon size={40} className={Styles.icon}/>
                    <Settings size={40} color="#262626" className={Styles.icon}/>
                </div>
            </div>
            <div className={Styles.containerNav}>
                <nav>
                    <ul>
                        <li><Link href={'/admin/patients'} className={activarLink('/admin/patients')}>Pacientes</Link></li>
                        <li><Link href={'/admin/doctors'} className={activarLink('/admin/doctors')}>Medicos</Link></li>
                        <li><Link href={'/admin/specialties'} className={activarLink('/admin/specialties')}>Especialidades</Link></li>
                        <li><Link href={'/admin/cities'} className={activarLink('/admin/cities')}>Ciudades</Link></li>
                        <li><Link href={'/admin/departments'} className={activarLink('/admin/departments')}>Departamentos</Link></li>
                        <li><Link href={'/admin/states'} className={activarLink('/admin/states')}>Estados</Link></li>
                        <li><Link href={'/admin/channel'} className={activarLink('/admin/channel')}>Medios</Link></li>
                        <li><Link href={'/admin/roles'} className={activarLink('/admin/roles')}>Roles</Link></li>
                    </ul>
                </nav>
            </div>
            <div className={Styles.line}></div>
        </div>
    )
}