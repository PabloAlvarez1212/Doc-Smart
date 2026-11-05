"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import styles from "./FilterBar.module.css";

/**
 * Barra de filtros compacta: un buscador y una fila de «chips» desplegables.
 * Cada chip muestra su nombre; al elegir un valor se rellena con el color del rol y muestra la elección.
 *
 * filters: [{ key, label, type: "select" | "date", value, onChange, options?: [{ value, label }], allLabel?, disabled?, hint? }]
 */
export default function FilterBar({ searchValue, onSearch, searchLabel = "Buscar", placeholder = "Buscar", filters = [], onClear }) {
    const [openKey, setOpenKey] = useState(null);
    const rootRef = useRef(null);
    const activeCount = filters.filter((filter) => String(filter.value ?? "") !== "").length;

    useEffect(() => {
        if (!openKey) return;
        const closeOutside = (event) => {
            if (rootRef.current && !rootRef.current.contains(event.target)) setOpenKey(null);
        };
        const closeEscape = (event) => {
            if (event.key === "Escape") setOpenKey(null);
        };
        document.addEventListener("pointerdown", closeOutside);
        document.addEventListener("keydown", closeEscape);
        return () => {
            document.removeEventListener("pointerdown", closeOutside);
            document.removeEventListener("keydown", closeEscape);
        };
    }, [openKey]);

    return (
        <section className={styles.bar} aria-label="Filtros" role="search" ref={rootRef}>
            {typeof onSearch === "function" && (
                <label className={styles.search}>
                    <span className={styles.srOnly}>{searchLabel}</span>
                    <Search size={17} aria-hidden="true" />
                    <input
                        type="search"
                        value={searchValue}
                        placeholder={placeholder}
                        autoComplete="off"
                        onChange={(event) => onSearch(event.target.value)}
                    />
                    {searchValue && (
                        <button type="button" className={styles.clearSearch} onClick={() => onSearch("")} aria-label="Borrar búsqueda">
                            <X size={14} aria-hidden="true" />
                        </button>
                    )}
                </label>
            )}

            <div className={styles.chips}>
                {filters.map((filter) => (
                    <FilterChip
                        key={filter.key}
                        filter={filter}
                        open={openKey === filter.key}
                        onToggle={() => setOpenKey((current) => (current === filter.key ? null : filter.key))}
                        onClose={() => setOpenKey(null)}
                    />
                ))}

                <AnimatePresence initial={false}>
                    {activeCount > 0 && onClear && (
                        <motion.button
                            type="button"
                            className={styles.clearAll}
                            onClick={() => { onClear(); setOpenKey(null); }}
                            initial={{ opacity: 0, scale: .85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: .85 }}
                            transition={{ duration: .18 }}
                        >
                            <X size={14} aria-hidden="true" />
                            Limpiar
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}

function FilterChip({ filter, open, onToggle, onClose }) {
    const { label, type = "select", value, onChange, options = [], allLabel = "Todos", disabled = false } = filter;
    const reduced = useReducedMotion();
    const chipRef = useRef(null);
    const popId = useId();
    const [alignRight, setAlignRight] = useState(false);
    const [query, setQuery] = useState("");
    const hasValue = String(value ?? "") !== "";
    const searchable = type === "select" && options.length > 8;

    const selected = options.find((option) => String(option.value) === String(value));
    const dateText = type === "date" && value
        ? new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(new Date(`${value}T00:00:00`))
        : "";
    const shown = type === "date" ? dateText : (selected?.label ?? value);

    useEffect(() => {
        if (open && chipRef.current) {
            const rect = chipRef.current.getBoundingClientRect();
            setAlignRight(rect.left + 280 > window.innerWidth - 16);
        }
        if (!open) setQuery("");
    }, [open]);

    const visibleOptions = searchable && query.trim()
        ? options.filter((option) => String(option.label).toLowerCase().includes(query.trim().toLowerCase()))
        : options;

    const choose = (next) => {
        onChange(next);
        onClose();
    };

    return (
        <div className={styles.chipWrap} ref={chipRef}>
            <button
                type="button"
                className={`${styles.chip} ${hasValue ? styles.chipOn : ""} ${open ? styles.chipOpen : ""}`}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={popId}
                disabled={disabled}
                onClick={onToggle}
            >
                <span className={styles.chipLabel}>{hasValue ? shown : label}</span>
                {hasValue && <span className={styles.chipKind}>{label}</span>}
                <ChevronDown size={15} aria-hidden="true" className={styles.chevron} />
            </button>

            {hasValue && !disabled && (
                <button type="button" className={styles.chipClear} onClick={() => onChange("")} aria-label={`Quitar filtro de ${label}`}>
                    <X size={13} aria-hidden="true" />
                </button>
            )}

            <AnimatePresence>
                {open && (
                    <motion.div
                        id={popId}
                        className={`${styles.pop} ${alignRight ? styles.popRight : ""}`}
                        initial={reduced ? false : { opacity: 0, y: -6, scale: .97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: .98 }}
                        transition={{ duration: .18, ease: [.23, 1, .32, 1] }}
                    >
                        {type === "date" ? (
                            <label className={styles.dateField}>
                                <span>{label}</span>
                                <input type="date" value={value || ""} onChange={(event) => { onChange(event.target.value); if (event.target.value) onClose(); }} autoFocus />
                            </label>
                        ) : (
                            <>
                                {searchable && (
                                    <input
                                        type="search"
                                        className={styles.popSearch}
                                        placeholder={`Buscar ${label.toLowerCase()}`}
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        autoFocus
                                    />
                                )}
                                <ul role="listbox" aria-label={label}>
                                    <li>
                                        <button type="button" role="option" aria-selected={!hasValue} onClick={() => choose("")}>
                                            {allLabel}
                                            {!hasValue && <Check size={15} aria-hidden="true" />}
                                        </button>
                                    </li>
                                    {visibleOptions.map((option) => {
                                        const active = String(option.value) === String(value);
                                        return (
                                            <li key={option.value}>
                                                <button type="button" role="option" aria-selected={active} onClick={() => choose(option.value)}>
                                                    {option.label}
                                                    {active && <Check size={15} aria-hidden="true" />}
                                                </button>
                                            </li>
                                        );
                                    })}
                                    {visibleOptions.length === 0 && <li className={styles.none}>Sin resultados</li>}
                                </ul>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
