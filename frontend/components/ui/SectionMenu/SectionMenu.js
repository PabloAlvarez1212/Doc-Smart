"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import styles from "./SectionMenu.module.css";

// Menú móvil por secciones: agrupa las páginas por tema y se despliega bajo la barra.
export default function SectionMenu({ id, open, groups, footer, onNavigate }) {
    const starts = groups.reduce(
        (acc, group, index) => [
            ...acc,
            index ? acc[index - 1] + groups[index - 1].links.length : 0,
        ],
        []
    );

    return (
        <div
            id={id}
            className={`${styles.sheet} ${open ? styles.open : ""}`}
            inert={!open}
        >
            {groups.map((group, groupIndex) => (
                <section
                    key={group.label ?? "principal"}
                    className={styles.group}
                    aria-label={group.label ?? "Principal"}
                >
                    {group.label && (
                        <p className={styles.label}>{group.label}</p>
                    )}

                    <ul>
                        {group.links.map(({ href, label, icon: Icon, current }, index) => (
                            <li
                                key={href}
                                style={{ "--i": starts[groupIndex] + index }}
                            >
                                <Link
                                    href={href}
                                    className={`${styles.row} ${current ? styles.active : ""}`}
                                    aria-current={current}
                                    onClick={onNavigate}
                                >
                                    <span className={styles.icon}>
                                        {Icon && (
                                            <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
                                        )}
                                    </span>
                                    <span className={styles.text}>{label}</span>
                                    {current ? (
                                        <span className={styles.here}>Estás aquí</span>
                                    ) : (
                                        <ChevronRight className={styles.go} size={16} aria-hidden="true" />
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}

            {footer && <div className={styles.footer}>{footer}</div>}
        </div>
    );
}

export function MenuToggle({ open, controls, onClick, ref }) {
    return (
        <button
            ref={ref}
            type="button"
            className={styles.toggle}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls={controls}
            onClick={onClick}
        >
            <span className={open ? styles.cross : ""} aria-hidden="true">
                <i />
                <i />
            </span>
        </button>
    );
}
