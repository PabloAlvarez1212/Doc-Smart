"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Settings } from "lucide-react";
import styles from "./DocSmartNav.module.css";

export default function DocSmartNav({
    variant,
    links = [],
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

    return (
        <header data-docsmart-nav="true" className={`${styles.reserve} ${variant === "doctor-home" ? styles.doctorHome : ""}`}>
            <div
                ref={rootRef}
                data-docsmart-bar="true"
                className={`${styles.bar} ${
                    compact ? styles.compact : ""
                }`}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
            >
                <div className={styles.top}>
                    <Link
                        href={home}
                        className={styles.logo}
                        aria-label="DocSmart, inicio"
                        onClick={cerrarMenu}
                    >
                        <Image
                            src="/images/logoSentado.png"
                            width={40}
                            height={40}
                            alt=""
                            priority
                        />

                        <span>
                            Doc<strong>Smart</strong>
                        </span>
                    </Link>

                    <div className={styles.actions}>
                        {onSettings ? (
                            <button
                                className={styles.settings}
                                type="button"
                                aria-label="Abrir Configuración"
                                onClick={() => {
                                    cerrarMenu();
                                    onSettings();
                                }}
                            >
                                <Settings size={19} aria-hidden="true" />
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
                            <span role="status">
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

                        <button
                            ref={toggleRef}
                            type="button"
                            className={styles.toggle}
                            aria-label={
                                open ? "Cerrar menú" : "Abrir menú"
                            }
                            aria-expanded={open}
                            aria-controls={navigationId}
                            onClick={() => {
                                setOpenPath(open ? null : pathname);
                            }}
                        >
                            <span
                                className={open ? styles.cross : ""}
                                aria-hidden="true"
                            >
                                <i />
                                <i />
                            </span>
                        </button>
                    </div>
                </div>

                <div
                    id={navigationId}
                    className={`${styles.navigation} ${
                        open ? styles.open : ""
                    }`}
                >
                    <nav aria-label="Navegación principal">
                        <ul>
                            {links.map(({ href, label }) => {
                                const [route, hash] = href.split("#");
                                const targetPath = route || pathname;

                                const active = hash
                                    ? pathname === targetPath &&
                                      activeHash === hash
                                    : (
                                        pathname === targetPath &&
                                        !activeHash
                                    ) || (
                                        targetPath !== "/" &&
                                        pathname.startsWith(
                                            `${targetPath}/`
                                        )
                                    );

                                return (
                                    <li key={href}>
                                        <Link
                                            href={href}
                                            aria-current={
                                                active
                                                    ? hash
                                                        ? "location"
                                                        : "page"
                                                    : undefined
                                            }
                                            onClick={cerrarMenu}
                                            className={`${styles.link} ${
                                                active ? styles.active : ""
                                            }`}
                                        >
                                            {active && (
                                                <motion.span
                                                    className={
                                                        styles.indicator
                                                    }
                                                    layoutId={
                                                        `nav-${navigationId}`
                                                    }
                                                    aria-hidden="true"
                                                    transition={
                                                        reduceMotion
                                                            ? { duration: 0 }
                                                            : {
                                                                type: "spring",
                                                                bounce: 0,
                                                                duration: 0.3,
                                                            }
                                                    }
                                                />
                                            )}

                                            <span>{label}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    {!onSettings &&
                        !sessionHome &&
                        !sessionLoading && (
                            <div className={styles.mobileTheme}>
                                <Link
                                    className={styles.mobileLogin}
                                    href="/login"
                                    onClick={cerrarMenu}
                                >
                                    Iniciar sesión
                                </Link>
                            </div>
                        )}
                </div>
            </div>
        </header>
    );
}