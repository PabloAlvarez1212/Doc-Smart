"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { motion, useReducedMotion } from "motion/react";
import {
    ChevronDown,
    ChevronRight,
    Search,
    Settings,
    ShieldCheck,
} from "lucide-react";

import SectionMenu, { MenuToggle } from "../../ui/SectionMenu/SectionMenu";
import menuStyles from "../../ui/SectionMenu/SectionMenu.module.css";
import CommandPalette from "./CommandPalette";
import { adminGroups, isAdminRouteActive } from "./adminRoutes";
import styles from "./Nav.module.css";

const brand = (
    <>
        <span className={styles.face}>
            <Image
                src="/images/logoCara.png"
                width={26}
                height={26}
                alt=""
                priority
            />
        </span>
        <span className={styles.wordmark}>
            Doc<strong>Smart</strong>
        </span>
    </>
);

// Sidebar con indicador en escritorio, solo íconos en tablet y menú por secciones en móvil.
export default function Nav({ onSettings }) {
    const pathname = usePathname();
    const reduceMotion = useReducedMotion();
    const menuId = useId();

    const catalogs = adminGroups.find((group) => group.collapsible);
    const catalogRouteActive = catalogs.links.some(({ href }) => isAdminRouteActive(pathname, href));

    const [catalogOpen, setCatalogOpen] = useState(catalogRouteActive);
    const [menuPath, setMenuPath] = useState(null);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [tip, setTip] = useState(null);

    const mobileRef = useRef(null);
    const toggleRef = useRef(null);

    const menuOpen = menuPath === pathname;
    const cerrarMenu = () => setMenuPath(null);

    useEffect(() => {
        const atajo = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                setMenuPath(null);
                setPaletteOpen((current) => !current);
            }
        };

        const cerrarAlPulsarFuera = (event) => {
            if (mobileRef.current && !mobileRef.current.contains(event.target)) {
                setMenuPath(null);
            }
        };

        window.addEventListener("keydown", atajo);
        document.addEventListener("pointerdown", cerrarAlPulsarFuera);

        return () => {
            window.removeEventListener("keydown", atajo);
            document.removeEventListener("pointerdown", cerrarAlPulsarFuera);
        };
    }, []);

    // En tablet el sidebar queda en íconos; la ayuda flota fuera de su área con scroll.
    const mostrarAyuda = (event) => {
        if (event.pointerType && event.pointerType !== "mouse") return;

        const target = event.target.closest?.("[data-tip]");

        if (!target) {
            setTip(null);
            return;
        }

        const box = target.getBoundingClientRect();
        setTip({ text: target.dataset.tip, x: box.right + 12, y: box.top + box.height / 2 });
    };

    const indicator = (
        <motion.span
            className={styles.indicator}
            layoutId="admin-nav-indicator"
            aria-hidden="true"
            transition={
                reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", bounce: 0.22, visualDuration: 0.4 }
            }
        />
    );

    const renderLink = ({ href, label, icon: Icon }) => {
        const active = isAdminRouteActive(pathname, href);

        return (
            <li key={href}>
                <Link
                    href={href}
                    data-tip={label}
                    className={`${styles.link} ${active ? styles.active : ""}`}
                    aria-current={active ? "page" : undefined}
                >
                    {active && indicator}
                    <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
                    <span className={styles.label}>{label}</span>
                </Link>
            </li>
        );
    };

    const CatalogIcon = catalogs.icon;

    return (
        <div className={`${styles.root} ${menuStyles.navTokens}`}>
            <aside
                className={styles.sidebar}
                aria-label="Menú de administración"
                onPointerOver={mostrarAyuda}
                onPointerLeave={() => setTip(null)}
                onFocus={mostrarAyuda}
                onBlur={() => setTip(null)}
            >
                <Link href="/admin/dashboard" className={styles.brand} aria-label="DocSmart, panel administrativo">
                    {brand}
                </Link>

                <button
                    type="button"
                    className={styles.search}
                    data-tip="Buscar (Ctrl + K)"
                    onClick={() => setPaletteOpen(true)}
                >
                    <Search size={17} strokeWidth={1.9} aria-hidden="true" />
                    <span className={styles.label}>Buscar</span>
                    <kbd>Ctrl K</kbd>
                </button>

                <nav className={styles.nav} aria-label="Navegación administrativa">
                    {adminGroups.map((group) =>
                        group.collapsible ? (
                            <div key={group.label}>
                                <p className={styles.groupLabel}>Configuración</p>
                                <button
                                    type="button"
                                    data-tip={group.label}
                                    className={`${styles.link} ${catalogRouteActive ? styles.holds : ""}`}
                                    aria-expanded={catalogOpen}
                                    aria-controls="admin-catalogs"
                                    onClick={() => setCatalogOpen((current) => !current)}
                                >
                                    {catalogRouteActive && !catalogOpen && indicator}
                                    <CatalogIcon size={19} strokeWidth={1.9} aria-hidden="true" />
                                    <span className={styles.label}>{group.label}</span>
                                    <ChevronDown className={styles.chevron} size={16} aria-hidden="true" />
                                </button>

                                <div
                                    id="admin-catalogs"
                                    className={`${styles.sub} ${catalogOpen ? styles.subOpen : ""}`}
                                    inert={!catalogOpen}
                                >
                                    <ul className={styles.list}>{group.links.map(renderLink)}</ul>
                                </div>
                            </div>
                        ) : (
                            <div key={group.label}>
                                <p className={styles.groupLabel}>{group.label}</p>
                                <ul className={styles.list}>{group.links.map(renderLink)}</ul>
                            </div>
                        )
                    )}
                </nav>

                <div className={styles.user}>
                    <span className={styles.avatar}>
                        <ShieldCheck size={18} strokeWidth={1.9} aria-hidden="true" />
                    </span>
                    <span className={styles.userText}>
                        <strong>Administrador</strong>
                        <small>Gestión del sistema</small>
                    </span>
                    <button
                        type="button"
                        className={`${styles.iconButton} ${styles.settings}`}
                        data-tip="Ajustes"
                        aria-label="Abrir ajustes"
                        onClick={onSettings}
                    >
                        <Settings size={18} strokeWidth={1.9} aria-hidden="true" />
                    </button>
                </div>
            </aside>

            {tip && (
                <span className={styles.tip} style={{ left: tip.x, top: tip.y }} aria-hidden="true">
                    {tip.text}
                </span>
            )}

            <div
                ref={mobileRef}
                className={styles.mobileBar}
                onKeyDown={(event) => {
                    if (event.key === "Escape" && menuOpen) {
                        cerrarMenu();
                        toggleRef.current?.focus();
                    }
                }}
            >
                <Link href="/admin/dashboard" className={styles.brand} aria-label="DocSmart, panel administrativo" onClick={cerrarMenu}>
                    {brand}
                </Link>

                <div className={styles.actions}>
                    <button
                        type="button"
                        className={styles.iconButton}
                        aria-label="Buscar páginas"
                        onClick={() => {
                            cerrarMenu();
                            setPaletteOpen(true);
                        }}
                    >
                        <Search size={18} strokeWidth={1.9} aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className={`${styles.iconButton} ${styles.settings}`}
                        aria-label="Abrir ajustes"
                        onClick={() => {
                            cerrarMenu();
                            onSettings();
                        }}
                    >
                        <Settings size={18} strokeWidth={1.9} aria-hidden="true" />
                    </button>
                    <MenuToggle
                        ref={toggleRef}
                        open={menuOpen}
                        controls={menuId}
                        onClick={() => setMenuPath(menuOpen ? null : pathname)}
                    />
                </div>

                <SectionMenu
                    id={menuId}
                    open={menuOpen}
                    onNavigate={cerrarMenu}
                    groups={adminGroups.map((group) => ({
                        label: group.label,
                        links: group.links.map((link) => ({
                            ...link,
                            current: isAdminRouteActive(pathname, link.href) ? "page" : undefined,
                        })),
                    }))}
                />
            </div>

            <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        </div>
    );
}

// Ruta de la página actual sobre el contenido del panel.
export function AdminCrumbs() {
    const pathname = usePathname();
    const group = adminGroups.find((item) =>
        item.links.some(({ href }) => isAdminRouteActive(pathname, href))
    );
    const page = group?.links.find(({ href }) => isAdminRouteActive(pathname, href));

    return (
        <nav className={styles.crumbs} aria-label="Ruta">
            <span>Administración</span>
            {group && (
                <>
                    <ChevronRight size={14} aria-hidden="true" />
                    <span>{group.label}</span>
                </>
            )}
            {page && (
                <>
                    <ChevronRight size={14} aria-hidden="true" />
                    <strong aria-current="page">{page.label}</strong>
                </>
            )}
        </nav>
    );
}
