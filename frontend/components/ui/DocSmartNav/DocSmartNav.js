"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Bell, Heart, LogIn, Settings } from "lucide-react";
import SectionMenu, { MenuToggle } from "../SectionMenu/SectionMenu";
import menuStyles from "../SectionMenu/SectionMenu.module.css";
import styles from "./DocSmartNav.module.css";

// Barra flotante en escritorio y tablet; en móvil las páginas pasan a un menú por secciones.
export default function DocSmartNav({
    variant,
    links = [],
    sections = [],
    notifications,
    favorites,
    home = "/",
    onSettings,
    sessionHome,
    sessionLoading = false,
}) {
    const pathname = usePathname();
    const reduceMotion = useReducedMotion();
    const navigationId = useId();

    const [openPath, setOpenPath] = useState(null);
    const [compact, setCompact] = useState(false);
    const [activeHash, setActiveHash] = useState("");

    const toggleRef = useRef(null);
    const rootRef = useRef(null);

    const open = openPath === pathname;

    // Obtiene las secciones directamente de los enlaces del navbar.
    const sectionKey = JSON.stringify(
        links
            .filter((link) => {
                const [route, hash] = link.href.split("#");
                return hash && (!route || route === pathname);
            })
            .map((link) => link.href.split("#")[1])
    );

    useEffect(() => {
        const sectionIds = JSON.parse(sectionKey);
        let frame = null;

        const actualizarSeccion = () => {
            setCompact(window.scrollY > 24);

            const sections = sectionIds
                .map((sectionId) => {
                    const element = document.getElementById(sectionId);

                    return element
                        ? {
                            id: sectionId,
                            top: element.getBoundingClientRect().top,
                        }
                        : null;
                })
                .filter(Boolean)
                .sort((a, b) => a.top - b.top);

            let currentSection = sections
                .filter((section) => section.top <= 160)
                .at(-1);

            // Permite activar la última sección al llegar al final,
            // aunque su contenido sea demasiado corto.
            const atBottom =
                window.scrollY > 0 &&
                Math.ceil(window.scrollY + window.innerHeight) >=
                    document.documentElement.scrollHeight - 2;

            if (atBottom && sections.length) {
                currentSection = sections.at(-1);
            }

            setActiveHash(currentSection?.id || "");
        };

        const programarActualizacion = () => {
            if (frame !== null) return;

            frame = window.requestAnimationFrame(() => {
                frame = null;
                actualizarSeccion();
            });
        };

        actualizarSeccion();

        window.addEventListener("scroll", programarActualizacion, {
            passive: true,
        });
        window.addEventListener("resize", programarActualizacion);
        window.addEventListener("hashchange", programarActualizacion);

        return () => {
            if (frame !== null) {
                window.cancelAnimationFrame(frame);
            }

            window.removeEventListener("scroll", programarActualizacion);
            window.removeEventListener("resize", programarActualizacion);
            window.removeEventListener("hashchange", programarActualizacion);
        };
    }, [pathname, sectionKey]);

    useEffect(() => {
        const cerrarAlPulsarFuera = (event) => {
            if (
                rootRef.current &&
                !rootRef.current.contains(event.target)
            ) {
                setOpenPath(null);
            }
        };

        document.addEventListener("pointerdown", cerrarAlPulsarFuera);

        return () => {
            document.removeEventListener(
                "pointerdown",
                cerrarAlPulsarFuera
            );
        };
    }, []);

    const cerrarMenu = () => {
        setOpenPath(null);
    };

    const handleKeyDown = (event) => {
        if (event.key === "Escape" && open) {
            event.preventDefault();
            cerrarMenu();
            toggleRef.current?.focus();
        }
    };

    const handleBlur = (event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
            cerrarMenu();
        }
    };

    // La luz de la barra sigue al cursor sin volver a renderizar.
    const moverLuz = (event) => {
        if (event.pointerType !== "mouse") return;

        const bar = event.currentTarget;
        const box = bar.getBoundingClientRect();

        bar.style.setProperty("--spot-x", `${event.clientX - box.left}px`);
        bar.style.setProperty("--spot-y", `${event.clientY - box.top}px`);
    };

    const estadoEnlace = (href) => {
        const [route, hash] = href.split("#");
        const targetPath = route || pathname;

        const active = hash
            ? pathname === targetPath && activeHash === hash
            : (pathname === targetPath && !activeHash) ||
              (targetPath !== "/" && pathname.startsWith(`${targetPath}/`));

        return active ? (hash ? "location" : "page") : undefined;
    };

    const enlaces = links.map((link) => ({
        ...link,
        current: estadoEnlace(link.href),
    }));

    // Agrupa los enlaces para el menú móvil: primero los sueltos y luego cada sección.
    const grupos = [
        { label: null, links: [] },
        ...sections.map((label) => ({ label, links: [] })),
    ];

    enlaces.forEach((link) => {
        let grupo = grupos.find(({ label }) => label === (link.group ?? null));

        if (!grupo) {
            grupo = { label: link.group, links: [] };
            grupos.push(grupo);
        }

        grupo.links.push(link);
    });

    const notificacionesActivas =
        notifications &&
        (pathname === notifications.href ||
            pathname.startsWith(`${notifications.href}/`));

    const sinSesion = !onSettings && !sessionHome && !sessionLoading;

    return (
        <header
            data-docsmart-nav="true"
            className={`${styles.reserve} ${menuStyles.navTokens} ${variant === "doctor-home" ? menuStyles.doctor : ""}`}
        >
            <div
                ref={rootRef}
                data-docsmart-bar="true"
                className={`${styles.bar} ${compact ? styles.compact : ""}`}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                onPointerMove={moverLuz}
            >
                <span className={styles.glow} aria-hidden="true">
                    <span className={styles.spot} />
                </span>

                <Link
                    href={home}
                    className={styles.brand}
                    aria-label="DocSmart, inicio"
                    onClick={cerrarMenu}
                >
                    <span className={styles.face}>
                        <Image
                            src="/images/logoCara.png"
                            width={28}
                            height={28}
                            alt=""
                            priority
                        />
                    </span>

                    <span className={styles.wordmark}>
                        Doc<strong>Smart</strong>
                    </span>
                </Link>

                <nav className={styles.desktop} aria-label="Navegación principal">
                    <ul className={styles.track}>
                        {enlaces.map(({ href, label, short, icon: Icon, current }) => (
                            <motion.li
                                key={href}
                                layout={reduceMotion ? false : "position"}
                                transition={{ type: "spring", bounce: 0.2, visualDuration: 0.35 }}
                            >
                                <Link
                                    href={href}
                                    aria-current={current}
                                    data-tip={short ?? label}
                                    className={`${styles.link} ${current ? styles.active : ""}`}
                                >
                                    {current && (
                                        <motion.span
                                            className={styles.indicator}
                                            layoutId={`nav-${navigationId}`}
                                            aria-hidden="true"
                                            transition={
                                                reduceMotion
                                                    ? { duration: 0 }
                                                    : {
                                                        type: "spring",
                                                        bounce: 0.22,
                                                        visualDuration: 0.4,
                                                    }
                                            }
                                        />
                                    )}

                                    {Icon && (
                                        <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
                                    )}

                                    <span className={styles.label}>{short ?? label}</span>
                                </Link>
                            </motion.li>
                        ))}
                    </ul>
                </nav>

                <div className={styles.actions}>
                    {notifications && (
                        <Link
                            href={notifications.href}
                            className={`${styles.iconButton} ${notifications.count > 0 ? styles.ring : ""}`}
                            aria-current={notificacionesActivas ? "page" : undefined}
                            aria-label={`Notificaciones, ${notifications.count} sin leer`}
                            onClick={cerrarMenu}
                        >
                            <Bell size={19} strokeWidth={1.9} aria-hidden="true" />

                            {notifications.count > 0 && (
                                <motion.span
                                    key={notifications.count}
                                    className={styles.badge}
                                    aria-hidden="true"
                                    initial={reduceMotion ? false : { scale: 0.4 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", bounce: 0.5, visualDuration: 0.35 }}
                                >
                                    {notifications.count > 99 ? "99+" : notifications.count}
                                </motion.span>
                            )}
                        </Link>
                    )}

                    {favorites && (
                        <Link
                            href={favorites.href}
                            className={`${styles.iconButton} ${styles.favorite}`}
                            aria-current={pathname === favorites.href || pathname.startsWith(`${favorites.href}/`) ? "page" : undefined}
                            aria-label="Médicos favoritos"
                            onClick={cerrarMenu}
                        >
                            <Heart size={19} strokeWidth={1.9} aria-hidden="true" />
                        </Link>
                    )}

                    {onSettings ? (
                        <button
                            className={`${styles.iconButton} ${styles.settings}`}
                            type="button"
                            aria-label="Abrir Configuración"
                            onClick={() => {
                                cerrarMenu();
                                onSettings();
                            }}
                        >
                            <Settings size={19} strokeWidth={1.9} aria-hidden="true" />
                        </button>
                    ) : sessionHome ? (
                        <Link
                            className={styles.primary}
                            href={sessionHome}
                            onClick={cerrarMenu}
                        >
                            Mi espacio
                        </Link>
                    ) : sessionLoading ? (
                        <span className={styles.status} role="status">
                            Comprobando sesión…
                        </span>
                    ) : (
                        <>
                            <Link
                                className={styles.login}
                                href="/login"
                                onClick={cerrarMenu}
                            >
                                Iniciar sesión
                            </Link>

                            <Link
                                className={styles.primary}
                                href="/rol"
                                onClick={cerrarMenu}
                            >
                                Registrarse
                            </Link>
                        </>
                    )}

                    <MenuToggle
                        ref={toggleRef}
                        open={open}
                        controls={navigationId}
                        onClick={() => {
                            setOpenPath(open ? null : pathname);
                        }}
                    />
                </div>

                <SectionMenu
                    id={navigationId}
                    open={open}
                    groups={grupos.filter((grupo) => grupo.links.length)}
                    onNavigate={cerrarMenu}
                    footer={
                        sinSesion && (
                            <Link
                                className={styles.menuLogin}
                                href="/login"
                                onClick={cerrarMenu}
                            >
                                <LogIn size={18} strokeWidth={1.9} aria-hidden="true" />
                                Iniciar sesión
                            </Link>
                        )
                    }
                />
            </div>
        </header>
    );
}
