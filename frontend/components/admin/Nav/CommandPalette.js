"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CornerDownLeft, Search } from "lucide-react";
import { adminGroups, isAdminRouteActive } from "./adminRoutes";
import styles from "./CommandPalette.module.css";

const normalizar = (texto) =>
    texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// Búsqueda rápida de páginas del panel (Ctrl + K).
const subscribe = () => () => {};

export default function CommandPalette({ open, onClose }) {
    const reduceMotion = useReducedMotion();
    const isClient = useSyncExternalStore(subscribe, () => true, () => false);

    if (!isClient) return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    key="palette"
                    className={styles.backdrop}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.16 }}
                    onPointerDown={(event) => {
                        if (event.target === event.currentTarget) onClose();
                    }}
                >
                    <motion.div
                        className={styles.panel}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Buscar páginas"
                        initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -4 }}
                        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    >
                        <PaletteContent onClose={onClose} />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}

function PaletteContent({ onClose }) {
    const router = useRouter();
    const pathname = usePathname();
    const listId = useId();
    const listRef = useRef(null);

    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState(0);

    const texto = normalizar(query.trim());
    const grupos = adminGroups
        .map((group) => ({
            ...group,
            links: group.links.filter(
                (link) =>
                    !texto ||
                    normalizar(`${link.label} ${link.hint} ${group.label}`).includes(texto)
            ),
        }))
        .filter((group) => group.links.length);
    const resultados = grupos.flatMap((group) => group.links);

    // Devuelve el foco al botón que abrió la búsqueda.
    useEffect(() => {
        const previous = document.activeElement;

        return () => previous?.focus?.({ preventScroll: true });
    }, []);

    useEffect(() => {
        listRef.current
            ?.querySelector('[aria-selected="true"]')
            ?.scrollIntoView({ block: "nearest" });
    }, [selected, query]);

    const abrir = (href) => {
        onClose();
        if (href !== pathname) router.push(href);
    };

    const handleKeyDown = (event) => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setSelected((current) => Math.min(current + 1, resultados.length - 1));
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setSelected((current) => Math.max(current - 1, 0));
        } else if (event.key === "Enter") {
            event.preventDefault();
            if (resultados[selected]) abrir(resultados[selected].href);
        } else if (event.key === "Escape") {
            event.preventDefault();
            onClose();
        }
    };

    return (
        <>
            <div className={styles.field}>
                <Search size={18} aria-hidden="true" />
                <input
                    autoFocus
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setSelected(0);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Busca una página: ciudades, médicos…"
                    autoComplete="off"
                    spellCheck={false}
                    role="combobox"
                    aria-expanded="true"
                    aria-controls={listId}
                    aria-activedescendant={
                        resultados[selected] ? `${listId}-${selected}` : undefined
                    }
                />
                <kbd>Esc</kbd>
            </div>

            <div ref={listRef} id={listId} className={styles.list} role="listbox" aria-label="Páginas">
                {grupos.length ? (
                    grupos.map((group) => (
                        <div key={group.label} role="group" aria-label={group.label}>
                            <p className={styles.group} aria-hidden="true">{group.label}</p>
                            {group.links.map((link) => {
                                const { href, label, icon: Icon } = link;
                                const position = resultados.indexOf(link);
                                const actual = isAdminRouteActive(pathname, href);

                                return (
                                    <div
                                        key={href}
                                        id={`${listId}-${position}`}
                                        role="option"
                                        aria-selected={position === selected}
                                        className={styles.option}
                                        onPointerMove={() => setSelected(position)}
                                        onClick={() => abrir(href)}
                                    >
                                        <span className={styles.icon}>
                                            <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
                                        </span>
                                        <span className={styles.text}>{label}</span>
                                        {actual && <span className={styles.now}>Página actual</span>}
                                        <code>{href}</code>
                                    </div>
                                );
                            })}
                        </div>
                    ))
                ) : (
                    <p className={styles.empty}>
                        No hay páginas que coincidan con “{query}”.
                    </p>
                )}
            </div>

            <div className={styles.foot} aria-hidden="true">
                <span><kbd>↑</kbd><kbd>↓</kbd> moverse</span>
                <span><kbd><CornerDownLeft size={11} /></kbd> abrir</span>
                <span><kbd>Esc</kbd> cerrar</span>
            </div>
        </>
    );
}
