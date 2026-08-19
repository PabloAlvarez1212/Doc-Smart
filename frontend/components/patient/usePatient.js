"use client"
import { eliminarPacienteService } from "@/app/services/patientServices"
import { logoutService } from "@/app/services/authService"
import { useRouter } from "next/navigation"
import Swal from "sweetalert2"
export default function usePatient() {
    const router = useRouter()
    const eliminarCuentaPaciente = async () => {
        const respuesta = await Swal.fire({
            title: "¿Estás seguro de realizar esta acción?",
            text: "Se borrará permanentemente y no se podrá revertir.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, continuar",
            cancelButtonText: "Cancelar",
            reverseButtons: true,
            didOpen: () => {
                Swal.getContainer().style.zIndex = "9999";
            }
        });
        if (respuesta.isConfirmed) {
            try {
                await eliminarPacienteService()
                await Swal.fire({
                    title: "Éxito!",
                    text: "Su cuenta a sido eliminada correctamente.",
                    icon: "success",
                    didOpen: () => {
                        Swal.getContainer().style.zIndex = "9999";
                    }
                });
                router.replace("/login")
            } catch (e) {
                console.log(e)
            }

        }
    }
    return { eliminarCuentaPaciente }
}