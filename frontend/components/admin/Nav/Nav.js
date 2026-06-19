"use client";
import Styles from "./Nav.module.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User } from "lucide-react";
import { Stethoscope, MapPinned, Map, Shield, BadgeCheck, Phone , LayoutDashboard} from "lucide-react";
import { BadgePlus } from "lucide-react";
import { useState } from "react";
import Button from "../../ui/Button/Button";
import { ChevronUp, ChevronDown } from 'lucide-react'


export default function Nav() {
    const pathName = usePathname();
    const activarLink = function (route) {
        return pathName === route ? Styles.activar : Styles.link;
    }
    const [catalogoAbierto, setCatalogoAbierto] = useState(false);

    return (
        <div className={Styles.containerNav}>
            <nav>
                <ul>
                    <div className={Styles.item}>
                        <LayoutDashboard size={32} />
                        <li><Link href={'/admin/'} className={activarLink('/admin/')}>Dashboard</Link></li>
                    </div>
                    <div className={Styles.item}>
                        <User size={32} />
                        <li><Link href={'/admin/patients'} className={activarLink('/admin/patients')}>Pacientes</Link></li>
                    </div>
                    <div className={Styles.item}>
                        <Stethoscope size={32} />
                        <li><Link href={'/admin/doctors'} className={activarLink('/admin/doctors')}>Medicos</Link></li>
                    </div>

                    <div className={Styles.catalogos}>
                        <div className={Styles.btn}>
                            
                            <Button onClick={() => setCatalogoAbierto(!catalogoAbierto)}>Catalogos    {catalogoAbierto ? <ChevronUp color="white" size={25} /> : <ChevronDown color="white" size={25} />}</Button>
                        </div>
                        {catalogoAbierto && (
                            <div>
                                <div className={Styles.item}>
                                    <BadgePlus size={32}/>
                                    <li><Link href={'/admin/specialties'} className={activarLink('/admin/specialties')}>Especialidades</Link></li>
                                </div>
                                <div className={Styles.item}>
                                    <MapPinned size={32}/>
                                    <li><Link href={'/admin/cities'} className={activarLink('/admin/cities')}>Ciudades</Link></li>
                                </div>
                                <div className={Styles.item}>
                                    <Map size={32} />
                                    <li><Link href={'/admin/departments'} className={activarLink('/admin/departments')}>Departamentos</Link></li>
                                </div>
                                <div className={Styles.item}>
                                    <Shield size={32} />
                                    <li><Link href={'/admin/roles'} className={activarLink('/admin/roles')}>Roles</Link></li>
                                </div>
                                <div className={Styles.item}>
                                    <BadgeCheck size={32} />
                                    <li><Link href={'/admin/states'} className={activarLink('/admin/states')}>Estados</Link></li>
                                </div>
                                <div className={Styles.item}>
                                    <Phone size={32} />
                                    <li><Link href={'/admin/channel'} className={activarLink('/admin/channel')}>Medios</Link></li>
                                </div>
                            </div>
                        )}
                    </div>
                </ul>
            </nav>
        </div>
    )
}