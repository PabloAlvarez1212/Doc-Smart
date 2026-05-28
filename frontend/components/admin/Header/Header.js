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
                        <li><Link href={'../../../src/app/admin/patients'}>Pacientes</Link></li>
                        <li><Link href={'../../../src/app/admin/doctors'}>Medicos</Link></li>
                        <li><Link href={'../../../src/app/admin/specialties'}>Especialidades</Link></li>
                        <li><Link href={'../../../src/app/admin/cities'}>Ciudades</Link></li>
                        <li><Link href={'../../../src/app/admin/departments'}>Departamentos</Link></li>
                        <li><Link href={'../../../src/app/admin/states'}>Estados</Link></li>
                        <li><Link href={'../../../src/app/admin/channel'}>Medios</Link></li>
                        <li><Link href={'../../../src/app/admin/roles'}>Roles</Link></li>
                    </ul>
                </nav>
            </div>
        </div>
    )
}