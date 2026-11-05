"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertCircle, Heart, RefreshCw, Search, Stethoscope, X } from "lucide-react";

import Button from "../../../../components/ui/Button/Button";
import DoctorCard from "../../../../components/patient/FindDoctors/DoctorCard/DoctorCard";
import ScheduleAppointmentModal from "../../../../components/patient/FindDoctors/Appointment/ScheduleAppointmentModal";
import DoctorProfileModal from "../../../../components/patient/FindDoctors/Profile/DoctorProfileModal";
import { listarFavoritosServices, quitarFavoritoService, agregarFavoritoService } from "@/app/services/doctorServices";

import styles from "./favorites.module.css";

const SORTS = [
    { value: "recent", label: "Guardados hace poco" },
    { value: "rating", label: "Mejor calificados" },
    { value: "name", label: "Nombre (A-Z)" },
];

export default function FavoritesPage() {
    const reduceMotion = useReducedMotion();

    const [doctores, setDoctores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [especialidad, setEspecialidad] = useState("Todas");
    const [orden, setOrden] = useState("recent");
    const [doctorSeleccionado, setDoctorSeleccionado] = useState(null);
    const [perfilSeleccionado, setPerfilSeleccionado] = useState(null);

    const cargar = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const respuesta = await listarFavoritosServices();
            const lista = respuesta?.data;

            if (!Array.isArray(lista)) throw new Error("Formato inesperado");

            setDoctores(lista);
        } catch {
            setError("No pudimos cargar tus médicos favoritos.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    // Quita el favorito al instante; si el servidor falla, vuelve a mostrarlo en su lugar.
    const toggleFavorito = async (doctor) => {
        const posicion = doctores.findIndex((item) => item.id === doctor.id);

        if (doctor.es_favorito === false) {
            return;
        }

        setDoctores((prev) => prev.filter((item) => item.id !== doctor.id));

        try {
            await quitarFavoritoService(doctor.id);
        } catch {
            setDoctores((prev) => {
                const copia = [...prev];
                copia.splice(Math.max(0, posicion), 0, doctor);
                return copia;
            });
            await agregarFavoritoService(doctor.id).catch(() => {});
        }
    };

    const especialidades = useMemo(
        () => ["Todas", ...new Set(doctores.map((doctor) => doctor.especialidad).filter(Boolean))],
        [doctores],
    );

    const visibles = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();

        const lista = doctores.filter((doctor) => {
            const coincideEspecialidad = especialidad === "Todas" || doctor.especialidad === especialidad;
            const coincideTexto = !texto || `${doctor.nombre} ${doctor.apellido} ${doctor.especialidad} ${doctor.ciudad}`.toLowerCase().includes(texto);
            return coincideEspecialidad && coincideTexto;
        });

        if (orden === "rating") {
            return [...lista].sort((a, b) => (Number(b.promedio_calificacion) || 0) - (Number(a.promedio_calificacion) || 0));
        }

        if (orden === "name") {
            return [...lista].sort((a, b) => `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`, "es"));
        }

        return lista;
    }, [doctores, busqueda, especialidad, orden]);

    const hayFiltros = busqueda.trim() !== "" || especialidad !== "Todas";

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.titleBlock}>
                    <span className={styles.heartBadge} aria-hidden="true"><Heart size={26} /></span>
                    <div>
                        <p className={styles.eyebrow}>Tus médicos de confianza</p>
                        <h1>Mis médicos favoritos</h1>
                        <p className={styles.description}>Vuelve a ellos con un toque: aquí ves su disponibilidad, su valor y su ubicación.</p>
                    </div>
                </div>

                <div className={styles.counter} aria-live="polite">
                    <Heart size={19} aria-hidden="true" />
                    <div>
                        <strong>{loading ? "Cargando…" : `${doctores.length} ${doctores.length === 1 ? "médico guardado" : "médicos guardados"}`}</strong>
                        <span>En tu lista</span>
                    </div>
                </div>
            </header>

            {!loading && !error && doctores.length > 0 && (
                <section className={styles.toolbar} aria-label="Filtros de favoritos">
                    <label className={styles.search}>
                        <span className={styles.srOnly}>Buscar en favoritos</span>
                        <Search size={18} aria-hidden="true" />
                        <input
                            type="search"
                            placeholder="Buscar por nombre, especialidad o ciudad"
                            value={busqueda}
                            onChange={(event) => setBusqueda(event.target.value)}
                            autoComplete="off"
                        />
                        {busqueda && (
                            <button type="button" className={styles.clear} onClick={() => setBusqueda("")} aria-label="Borrar búsqueda">
                                <X size={16} aria-hidden="true" />
                            </button>
                        )}
                    </label>

                    <label className={styles.sort}>
                        <span className={styles.srOnly}>Ordenar favoritos</span>
                        <select value={orden} onChange={(event) => setOrden(event.target.value)}>
                            {SORTS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </label>

                    <div className={styles.chips} role="group" aria-label="Especialidad">
                        {especialidades.map((nombre) => (
                            <button
                                key={nombre}
                                type="button"
                                className={especialidad === nombre ? styles.chipOn : undefined}
                                aria-pressed={especialidad === nombre}
                                onClick={() => setEspecialidad(nombre)}
                            >
                                {nombre}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {loading ? (
                <div className={styles.grid} role="status" aria-label="Cargando favoritos">
                    {[1, 2].map((item) => <span key={item} className={styles.skeleton} />)}
                </div>
            ) : error ? (
                <div className={styles.empty} role="alert">
                    <span className={styles.emptyIcon}><AlertCircle size={30} aria-hidden="true" /></span>
                    <h2>No pudimos cargar tus favoritos</h2>
                    <p>{error} Revisa tu conexión e inténtalo nuevamente.</p>
                    <Button onClick={cargar}><RefreshCw size={17} aria-hidden="true" />Reintentar</Button>
                </div>
            ) : doctores.length === 0 ? (
                <div className={styles.empty}>
                    <span className={styles.emptyIcon}><Heart size={30} aria-hidden="true" /></span>
                    <h2>Aún no tienes médicos favoritos</h2>
                    <p>Toca el corazón en la tarjeta de un médico para guardarlo aquí y agendar de nuevo con un solo toque.</p>
                    <Link href="/patient/find-doctors" className={styles.cta}>
                        <Stethoscope size={18} aria-hidden="true" />Encontrar doctores
                    </Link>
                </div>
            ) : visibles.length === 0 ? (
                <div className={styles.empty} role="status">
                    <span className={styles.emptyIcon}><Search size={30} aria-hidden="true" /></span>
                    <h2>Ningún favorito coincide</h2>
                    <p>Cambia la búsqueda o la especialidad para ver el resto.</p>
                    {hayFiltros && (
                        <Button variant="secundary" onClick={() => { setBusqueda(""); setEspecialidad("Todas"); }}>
                            Mostrar todos
                        </Button>
                    )}
                </div>
            ) : (
                <motion.div className={styles.grid} layout={reduceMotion ? false : true}>
                    <AnimatePresence mode="popLayout" initial>
                        {visibles.map((doctor, index) => (
                            <DoctorCard
                                key={doctor.id}
                                index={index}
                                doctor={doctor}
                                onSchedule={setDoctorSeleccionado}
                                onViewProfile={setPerfilSeleccionado}
                                onToggleFavorito={toggleFavorito}
                            />
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}

            <ScheduleAppointmentModal
                doctor={doctorSeleccionado}
                onClose={() => setDoctorSeleccionado(null)}
            />

            <DoctorProfileModal doctor={perfilSeleccionado} onClose={() => setPerfilSeleccionado(null)} />
        </div>
    );
}
