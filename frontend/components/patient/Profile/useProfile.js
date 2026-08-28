"use client";

import { obtenerPrimerError } from "@/app/utils/errrorUtils";
import Swal from "sweetalert2";
import { useEffect, useState } from "react";

import {
    obtenerPerfilPacienteService,
    actualizarPerfilPacienteService,
    actualizarFotoPerfilPacienteService,
    eliminarFotoPerfilPacienteService,
} from "@/app/services/patientServices";

export default function useProfile() {
    const [perfil, setPerfil] = useState(null);
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

            setPerfil(
                data.data ?? data
            );

        } catch (error) {
            setPerfil(null);

            if (error.response?.status === 403) {
                setError("NO_AUTORIZADO");
                return;
            }

            if (error.response?.status === 401) {
                setError("NO_AUTENTICADO");
                return;
            }

            setError("ERROR_PERFIL");

        } finally {
            setLoading(false);
        }
    };

    const actualizarPerfilPaciente = async (formData) => {
        try {
            setGuardando(true);
            setError(null);

            await actualizarPerfilPacienteService(
                formData
            );

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
                text:
                    mensajeBackend ||
                    "Ocurrió un error al actualizar el perfil.",
            });

            return false;

        } finally {
            setGuardando(false);
        }
    };

    const actualizarFotoPerfil = async (archivo) => {
        try {
            setGuardando(true);
            setError(null);

            await actualizarFotoPerfilPacienteService(
                archivo
            );

            await cargarPerfilPaciente();

            await Swal.fire({
                icon: "success",
                title: "Foto actualizada",
                text: "Tu foto de perfil fue actualizada correctamente.",
            });

            return true;

        } catch (error) {
            const mensajeBackend = obtenerPrimerError(
                error.response?.data?.errores
            );

            await Swal.fire({
                icon: "error",
                title: "No se pudo actualizar la foto",
                text:
                    mensajeBackend ||
                    "Ocurrió un error al actualizar la foto.",
            });

            return false;

        } finally {
            setGuardando(false);
        }
    };

    const eliminarFotoPerfil = async () => {
        const result = await Swal.fire({
            title: "¿Eliminar foto de perfil?",
            text: "Volverás a utilizar la foto predeterminada.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
            reverseButtons: true,
        });

        if (!result.isConfirmed) {
            return;
        }

        try {
            setGuardando(true);
            setError(null);

            await eliminarFotoPerfilPacienteService();

            await cargarPerfilPaciente();

            await Swal.fire({
                icon: "success",
                title: "Foto eliminada",
                text: "Ahora estás utilizando la foto predeterminada.",
            });

        } catch (error) {
            const mensajeBackend = obtenerPrimerError(
                error.response?.data?.errores
            );

            await Swal.fire({
                icon: "error",
                title: "No se pudo eliminar la foto",
                text:
                    mensajeBackend ||
                    "Ocurrió un error al eliminar la foto.",
            });

        } finally {
            setGuardando(false);
        }
    };

    return {
        perfil,
        loading,
        guardando,
        error,
        actualizarPerfilPaciente,
        actualizarFotoPerfil,
        eliminarFotoPerfil,
    };
}