"use client"
import Swal from "sweetalert2"
import { useRouter } from "next/navigation"
import { logoutService } from "@/app/services/authService"
export default function useLogout() {
    const router = useRouter()
    const logoutUser = async () => {
        const result = await Swal.fire({
            title: "¿Cerrar sesión?",
            text: "Se cerrará la sesión en este dispositivo.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, continuar",
            cancelButtonText: "Cancelar",
            reverseButtons: true,

            didOpen: () => {
                Swal.getContainer().style.zIndex = "9999";
            }
        });

        if (result.isConfirmed) {
            try {
                await logoutService();
                await Swal.fire({
                    title: "Éxito!",
                    text: "Se a cerrado sesión correctamente.",
                    icon: "success",
                    didOpen: () => {
                        Swal.getContainer().style.zIndex = "9999";
                    }
                });
                router.push('/login')
            } catch (e) {
                console.log(e);
                router.push('/login')
            }
        }
    }
    return ({ logoutUser })
}