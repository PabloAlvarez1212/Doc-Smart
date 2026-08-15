"use client"

import { useState, useEffect } from "react";
import { obtenerDashboardMedicoInicioService } from "@/app/services/doctorServices";

export const useDashboardMedico = () => {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cargar = async () => {
            try {
                const data = await obtenerDashboardMedicoInicioService();
                setDashboard(data.data);
            } catch (error) {
                console.log(error);
            } finally {
                setLoading(false);
            }
        };

        cargar();
    }, []);

    return { dashboard, loading };
};