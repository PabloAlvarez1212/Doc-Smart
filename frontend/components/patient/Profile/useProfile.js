"use client";
import { obtenerPrimerError } from "@/app/utils/errrorUtils";
import Swal from "sweetalert2";
import { useEffect, useState } from "react";
import {
    obtenerPerfilPacienteService,
    actualizarPerfilPacienteService
} from "@/app/services/patientServices";

export default function useProfile() {

    const [perfil, setPerfil] = useState({});
    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        cargarPerfilPaciente();
    }, []);

    const cargarPerfilPaciente = async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await obtenerPerfilPacienteService();

            setPerfil(data.data ?? data);

        } catch (error) {

            console.error(error);
            setError("No se pudo cargar el perfil.");

        } finally {

            setLoading(false);

        }
    };

    const actualizarPerfilPaciente = async (formData) => {
        try {
            setGuardando(true);
            setError(null);
            await actualizarPerfilPacienteService(formData);
            await cargarPerfilPaciente();
            await Swal.fire({
                icon: "success",
                title: "Perfil actualizado",
                text: "Tus datos fueron actualizados correctamente.",
            });
            return true;
        } catch (error) {
            const mensajeBackend = obtenerPrimerError(
                error.response?.data?.errores
            );
            await Swal.fire({
                icon: "error",
                title: "No se pudo actualizar",
                text: mensajeBackend || "Ocurrió un error al actualizar el perfil.",
            });
            return false;
        } finally {
            setGuardando(false);
        }
    };

    return {
        perfil,
        loading,
        guardando,
        error,
        actualizarPerfilPaciente
    };
}