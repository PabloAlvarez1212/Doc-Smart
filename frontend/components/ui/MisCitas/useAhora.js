"use client";

import { useEffect, useState } from "react";

// Hora actual que se renueva cada 30 s para las cuentas regresivas y las fechas relativas.
export default function useAhora() {
    const [ahora, setAhora] = useState(() => Date.now());
    useEffect(() => {
        const temporizador = setInterval(() => setAhora(Date.now()), 30000);
        return () => clearInterval(temporizador);
    }, []);
    return ahora;
}
