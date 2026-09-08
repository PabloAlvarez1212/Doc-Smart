"use client"

import Swal from "sweetalert2"
import { useRouter } from "next/navigation"
import { logoutService } from "@/app/services/authService"

export default function useLogout() {

    const router = useRouter()

    // Cierra sesión directamente, sin preguntar
    const logoutDirecto = async () => {
        try {
            await logoutService()
        } catch (error) {
            console.error("Error al cerrar sesión:", error)
        } finally {
            router.push("/login")
        }
    }

    // Cierre de sesión manual
    const logoutUser = async () => {

        const result = await Swal.fire({
            title: "¿Cerrar sesión?",
            text: "Se cerrará la sesión en este dispositivo.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, continuar",
            cancelButtonText: "Cancelar",
            reverseButtons: true
        })

        if (!result.isConfirmed) return

        try {
            await logoutService()

            await Swal.fire({
                title: "¡Éxito!",
                text: "Se ha cerrado sesión correctamente.",
                icon: "success"
            })

        } catch (error) {
            console.error("Error al cerrar sesión:", error)
        } finally {
            router.push("/login")
        }
    }

    return {
        logoutUser,
        logoutDirecto
    }
}