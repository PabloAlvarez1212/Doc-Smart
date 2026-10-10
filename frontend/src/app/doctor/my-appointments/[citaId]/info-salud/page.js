"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { obtenerInfoPacienteCita } from "@/app/services/api";
import styles from "./InfoPaciente.module.css";

export default function InfoPaciente() {
    const { citaId } = useParams();
    const router = useRouter();
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState("");
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        let activo = true;
        setDatos(null);
        setError("");
        setCargando(true);

        obtenerInfoPacienteCita(citaId)
            .then((respuesta) => {
                if (activo) setDatos(respuesta);
            })
            .catch((e) => {
                if (activo) setError(
                    e.response?.data?.detail ||
                    "No pudimos consultar la información del paciente."
                );
            })
            .finally(() => {
                if (activo) setCargando(false);
            });

        return () => { activo = false; };
    }, [citaId]);

    return (
        <main className={styles.page}>
            <button type="button" className={styles.back}
                onClick={() => router.back()}>
                ← Volver a la cita
            </button>

            <h1>Información de salud del paciente</h1>
            <p className={styles.subtitle}>
                Información reportada por el paciente.
            </p>

            {cargando && <p role="status">Cargando información…</p>}
            {error && <p role="alert" className={styles.error}>{error}</p>}

            {!cargando && !error && datos && (
                <>
                    <section className={styles.card}>
                        <h2>
                            {datos.paciente.nombre} {datos.paciente.apellido}
                        </h2>
                        <div className={styles.measures}>
                            <span>Peso: {datos.paciente.peso != null
                                ? `${datos.paciente.peso} kg` : "Sin informar"}</span>
                            <span>Estatura: {datos.paciente.estatura != null
                                ? `${datos.paciente.estatura} m` : "Sin informar"}</span>
                        </div>
                    </section>

                    {!datos.informacion_salud.length && (
                        <p>El paciente aún no ha registrado antecedentes.</p>
                    )}

                    <div className={styles.grid}>
                        {datos.informacion_salud.map((dato) => (
                            <article key={dato.id}
                                className={`${styles.card} ${
                                    dato.tipo_codigo === "alergia"
                                        ? styles.allergy : ""
                                }`}>
                                <span className={styles.type}>{dato.tipo_nombre}</span>
                                <h2>{dato.nombre}</h2>
                                <span className={styles.status}>{dato.estado}</span>

                                {dato.descripcion && <p>{dato.descripcion}</p>}

                                {dato.tipo_codigo === "alergia" && (
                                    <p><strong>Reacción:</strong>{" "}
                                        {dato.reaccion || "Sin informar"}</p>
                                )}

                                {dato.tipo_codigo === "medicamento" && (
                                    <>
                                        <p><strong>Dosis:</strong>{" "}
                                            {dato.dosis || "Sin informar"}</p>
                                        <p><strong>Frecuencia:</strong>{" "}
                                            {dato.frecuencia || "Sin informar"}</p>
                                        <p><strong>Vía:</strong>{" "}
                                            {dato.via_administracion || "Sin informar"}</p>
                                    </>
                                )}

                                {dato.fecha_inicio && (
                                    <p>Inicio: {dato.fecha_inicio}</p>
                                )}
                                {dato.fecha_fin && (
                                    <p>Finalización: {dato.fecha_fin}</p>
                                )}
                                {dato.es_permanente && (
                                    <p>Uso o condición permanente</p>
                                )}

                                <small>Reportado por el paciente</small>
                            </article>
                        ))}
                    </div>
                </>
            )}
        </main>
    );
}