"use client";
import { useEffect, useRef, useState } from "react";
import { obtenerPrimerError } from "@/app/utils/errrorUtils";
const correoInicial = () => ({
    abierto: false, paso: "correo", correo: "", codigo: "",
    cambioId: null, error: "", bloqueado: false,
});

export default function useEmailChange({guardando, setPerfil, solicitarCambioCorreoService, confirmarCambioCorreoService}) {
    const [cambioCorreo, setCambioCorreo] = useState(correoInicial);
    const [ocupadoCorreo, setOcupadoCorreo] = useState(false);
    const correoRequest = useRef({ busy: false, version: 0, mounted: true });

    useEffect(() => {
        const request = correoRequest.current;
        request.mounted = true;
        return () => { request.mounted = false; request.version += 1; };
    }, []);

    function abrirCambioCorreo() {
        if (correoRequest.current.busy || guardando) return;
        correoRequest.current.version += 1;
        setCambioCorreo({ ...correoInicial(), abierto: true });
    }

    function cerrarCambioCorreo() {
        correoRequest.current.version += 1;
        setCambioCorreo(correoInicial());
    }

    function editarCambioCorreo(campo, valor) {
        if (correoRequest.current.busy || !["correo", "codigo"].includes(campo)) return;
        setCambioCorreo(actual => ({ ...actual, [campo]: valor, error: "" }));
    }

    async function enviarCambioCorreo() {
        const request = correoRequest.current;
        if (request.busy || !cambioCorreo.abierto || cambioCorreo.paso === "confirmado" || cambioCorreo.bloqueado) return;
        const verificando = cambioCorreo.paso === "verificacion";
        if (verificando && !cambioCorreo.cambioId) return;
        const correo = cambioCorreo.correo.trim().toLowerCase();
        const codigo = cambioCorreo.codigo.trim();
        if (!verificando && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
            setCambioCorreo(actual => ({ ...actual, error: "Ingresa un correo válido." }));
            return;
        }
        if (verificando && !/^\d{6}$/.test(codigo)) {
            setCambioCorreo(actual => ({ ...actual, error: "Ingresa los 6 dígitos del código." }));
            return;
        }
        request.busy = true;
        const version = request.version;
        setOcupadoCorreo(true);
        setCambioCorreo(actual => ({ ...actual, error: "" }));
        try {
            const respuesta = verificando
                ? await confirmarCambioCorreoService(cambioCorreo.cambioId, codigo)
                : await solicitarCambioCorreoService(correo);
            if (!respuesta?.ok || (verificando ? !respuesta.data?.correo : !respuesta.data?.cambio_id)) {
                throw new Error("El servidor no confirmó la operación. Intenta nuevamente.");
            }
            if (!request.mounted) return;
            // A confirmation can finish after closing: keep the profile truthful,
            // but never restore an obsolete modal session or its sensitive fields.
            if (verificando) setPerfil(actual => actual ? { ...actual, correo: respuesta.data.correo } : actual);
            if (version !== request.version) return;
            setCambioCorreo(actual => verificando
                ? { ...correoInicial(), abierto: true, paso: "confirmado", correo: respuesta.data.correo }
                : { ...actual, paso: "verificacion", correo, codigo: "", cambioId: respuesta.data.cambio_id });
        } catch (e) {
            if (!request.mounted || version !== request.version) return;
            const body = e.response?.data;
            const mensaje = obtenerPrimerError(body?.errores) || body?.detail || body?.mensaje || e.message || "No pudimos conectar. Intenta nuevamente.";
            const bloqueado = verificando && (
                e.response?.status === 429 ||
                ["El código ha expirado", "Esta solicitud ya no está disponible", "Se alcanzó el máximo de intentos", "Solicitud inválida"].includes(mensaje)
            );
            setCambioCorreo(actual => ({ ...actual, error: mensaje, bloqueado }));
        } finally {
            request.busy = false;
            if (request.mounted) setOcupadoCorreo(false);
        }
    }

    function reiniciarCambioCorreo() {
        if (correoRequest.current.busy) return;
        correoRequest.current.version += 1;
        setCambioCorreo(actual => ({ ...correoInicial(), abierto: true, correo: actual.correo }));
    }


return {cambioCorreo, ocupadoCorreo, abrirCambioCorreo, cerrarCambioCorreo, editarCambioCorreo, enviarCambioCorreo, reiniciarCambioCorreo};
}
