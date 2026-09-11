"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BadgeCheck,
    BadgePlus,
    ChevronDown,
    CircleUserRound,
    LayoutDashboard,
    Map,
    MapPinned,
    Phone,
    Settings2,
    Shield,
    Stethoscope,
    UserRoundCheck,
} from "lucide-react";
import { useState } from "react";
import styles from "./Nav.module.css";

const primaryItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/patients", label: "Pacientes", icon: CircleUserRound },
    { href: "/admin/doctors", label: "Médicos", icon: Stethoscope },
];

const catalogItems = [
    { href: "/admin/specialties", label: "Especialidades", icon: BadgePlus },
    { href: "/admin/departments", label: "Departamentos", icon: Map },
    { href: "/admin/cities", label: "Ciudades", icon: MapPinned },
    { href: "/admin/states", label: "Estados", icon: BadgeCheck },
    { href: "/admin/roles", label: "Roles", icon: Shield },
    { href: "/admin/channel", label: "Medios", icon: Phone },
];

const validationItems = [
    { href: "/admin/doctor-requests", label: "Solicitudes médicas", icon: UserRoundCheck },
];

export default function Nav() {
    const pathname = usePathname();
    const catalogRouteActive = catalogItems.some(({ href }) => pathname === href || pathname.startsWith(`${href}/`));
    const [catalogOpen, setCatalogOpen] = useState(catalogRouteActive);

    const renderLink = ({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
            <li key={href}>
                <Link href={href} className={`${styles.link} ${active ? styles.active : ""}`} aria-current={active ? "page" : undefined}>
                    <Icon size={19} strokeWidth={1.9} />
                    <span>{label}</span>
                </Link>
            </li>
        );
    };

    return (
        <nav className={styles.nav} aria-label="Navegación administrativa">
            <div>
                <p className={styles.groupLabel}>Principal</p>
                <ul className={styles.list}>{primaryItems.map(renderLink)}</ul>
            </div>

            <div>
                <p className={styles.groupLabel}>Validación</p>
                <ul className={styles.list}>{validationItems.map(renderLink)}</ul>
            </div>

            <div className={styles.group}>
                <p className={styles.groupLabel}>Configuración</p>
                <button
                    type="button"
                    className={`${styles.groupButton} ${catalogRouteActive ? styles.groupActive : ""}`}
                    aria-expanded={catalogOpen}
                    aria-controls="admin-catalogs"
                    onClick={() => setCatalogOpen((current) => !current)}
                >
                    <span><Settings2 size={19} strokeWidth={1.9} /> Catálogos</span>
                    <ChevronDown className={catalogOpen ? styles.chevronOpen : ""} size={18} />
                </button>
                <ul id="admin-catalogs" className={`${styles.list} ${styles.sublist} ${catalogOpen ? styles.sublistOpen : ""}`}>
                    {catalogItems.map(renderLink)}
                </ul>
            </div>

            <div className={styles.footer}>
                <Shield size={16} />
                <span><strong>DocSmart Admin</strong><small>Gestión del sistema</small></span>
            </div>
        </nav>
    );
}
