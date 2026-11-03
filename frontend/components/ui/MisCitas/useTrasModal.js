"use client";

import { useRef, useState } from "react";

// Mientras un modal está abierto, la lista se queda como estaba y los avisos y efectos esperan.
// Al terminar de cerrarse, la lista recibe los cambios y las tarjetas animan a la vista.
export default function useTrasModal(citas) {
    const [congeladas, setCongeladas] = useState(null);
    const cola = useRef([]);

    const pausar = () => setCongeladas(citas);

    const alCerrar = (accion) => {
        if (congeladas) cola.current.push(accion);
        else accion();
    };

    const reanudar = () => {
        setCongeladas(null);
        const pendientes = cola.current;
        cola.current = [];
        pendientes.forEach((accion) => accion());
    };

    return { citas: congeladas ?? citas, pausar, reanudar, alCerrar };
}
