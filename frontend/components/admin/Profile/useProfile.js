"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { obtenerPerfilAdmin } from "@/app/services/adminServices"
export default function useProfile() {
    const [perfil, setPerfil] = useState(null)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)
    const ultimaPeticion = useRef(0)
    const cargarPerfilAdmin = useCallback(async () => {
        const peticion = ++ultimaPeticion.current
        try {
            setLoading(true)
            setError(null)
            const data = await obtenerPerfilAdmin();
            if (!data?.data || typeof data.data !== "object") {
                throw new Error("Respuesta de perfil inválida")
            }
            if (peticion === ultimaPeticion.current) setPerfil(data.data);
        } catch (error) {
            if (peticion !== ultimaPeticion.current) return
            const status = error.response?.status

            if (status === 401) {
                setError("NO_AUTENTICADO")
            } else if (status === 403) {
                setError("NO_AUTORIZADO")
            } else {
                setError("ERROR_PERFIL")
            }
            setPerfil(null)
        } finally {
            if (peticion === ultimaPeticion.current) setLoading(false)
        }
    }, [])
    useEffect(() => {
        cargarPerfilAdmin();
        return () => { ultimaPeticion.current += 1; }
    }, [cargarPerfilAdmin])
    return {
        perfil,
        loading,
        error,
        reintentar: cargarPerfilAdmin,
    };
}