"use client";

import { useEffect, useState } from "react";
import { ESTADOS_SECCION, claveDia, estadoDe } from "./citaFormato";

const VACIO = { dias: new Map() };

// Trae un lote amplio de citas sin filtros para marcar en el calendario los días con citas de la sección.
// Se repite cada vez que la lista principal cambia, así los puntos siguen a las acciones.
export default function useMapaCitas(cargar, seccion, revision) {
    const [mapa, setMapa] = useState(VACIO);

    useEffect(() => {
        let activo = true;
        cargar(seccion)
            .then((respuesta) => {
                if (!activo) return;
                const lista = Array.isArray(respuesta?.data) ? respuesta.data : [];
                const dias = new Map();
                for (const cita of lista) {
                    if (!ESTADOS_SECCION[seccion]?.includes(estadoDe(cita))) continue;
                    const clave = claveDia(cita.fecha_programada);
                    dias.set(clave, (dias.get(clave) || 0) + 1);
                }
                setMapa({ dias });
            })
            .catch(() => activo && setMapa(VACIO));
        return () => {
            activo = false;
        };
    }, [cargar, seccion, revision]);

    return mapa;
}
