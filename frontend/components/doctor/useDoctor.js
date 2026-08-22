"use client";

import { eliminarCuentaMedicoService } from "@/app/services/doctorServices";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

export default function useDoctor() {

    const router = useRouter();

    const eliminarCuentaMedico = async () => {

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

        if (!respuesta.isConfirmed) {
            return;
        }

        try {

            await eliminarCuentaMedicoService();

            await Swal.fire({
                title: "¡Éxito!",
                text: "Su cuenta ha sido eliminada correctamente.",
                icon: "success",

                didOpen: () => {
                    Swal.getContainer().style.zIndex = "9999";
                }
            });

            router.replace(
                "/login"
            );

        } catch (error) {

            console.error(
                "Error al eliminar cuenta del médico:",
                error
            );

            await Swal.fire({
                icon: "error",
                title: "No se pudo eliminar la cuenta",
                text:
                    error.response?.data?.errores?.detalle ||
                    "Ocurrió un error al eliminar la cuenta.",

                didOpen: () => {
                    Swal.getContainer().style.zIndex = "9999";
                }
            });
        }
    };

    return {
        eliminarCuentaMedico
    };
}