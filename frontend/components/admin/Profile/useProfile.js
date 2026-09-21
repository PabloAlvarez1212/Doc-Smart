"use client"
import { useEffect, useState } from "react"
import { obtenerPerfilAdmin } from "@/app/services/adminServices"
export default function useProfile() {
    const [perfil, setPerfil] = useState(null)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)
    useEffect(() => {
        cargarPerfilAdmin();
    }, [])
    const cargarPerfilAdmin = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await obtenerPerfilAdmin();
            setPerfil(data.data);
        } catch (error) {
            const status = error.response?.status

            if (status === 401) {
                setError("NO_AUTENTICADO")
            } else if (status === 403) {
                setError("NO_AUTORIZADO")
            } else {
                setError("ERROR_PERFIL")
                
                console.error(
                    "Error al obtener perfil del administrador:",
                    error
                )
            }

            setPerfil(null)

        } finally {
            setLoading(false)
        }

    }
    return {
        perfil,
        loading,
        error,
    };
}