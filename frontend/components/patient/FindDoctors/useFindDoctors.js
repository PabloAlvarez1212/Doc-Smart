"use client";

import { useEffect, useState } from "react";
import { listarMedicosDisponiblesServices } from "@/app/services/doctorServices";

export default function useFindDoctors() {
    const [doctores, setDoctores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [requestVersion, setRequestVersion] = useState(0);

    useEffect(() => {
        let active = true;

        const cargarDoctoresDisponibles = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await listarMedicosDisponiblesServices();
                const doctors = response?.data;

                if (!Array.isArray(doctors)) {
                    throw new Error("Formato de respuesta inesperado");
                }

                if (active) setDoctores(doctors);
            } catch {
                if (active) {
                    setDoctores([]);
                    setError("No se pudieron cargar los médicos.");
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        cargarDoctoresDisponibles();

        return () => {
            active = false;
        };
    }, [requestVersion]);

    const retry = () => setRequestVersion((current) => current + 1);

    return { doctores, loading, error, retry };
}
