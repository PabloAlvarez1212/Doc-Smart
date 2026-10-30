"use client";

import Swal from "sweetalert2";
import { useCallback, useEffect, useRef, useState } from "react";
import { obtenerPrimerError } from "@/app/utils/errrorUtils";
import {
    detalleRevisionFacialService,
    listarRevisionesFacialesService,
    resolverRevisionFacialService,
} from "@/app/services/adminServices";

export const FILTROS = [
    { key: "posterior", label: "Por confirmar" },
    { key: "revision", label: "En revisión" },
    { key: "aprobado", label: "Aprobadas" },
    { key: "rechazado", label: "Rechazadas" },
    { key: "alternativa", label: "Alternativa" },
];

export default function usePatientVerification() {
    const [estado, setEstado] = useState("revision");
    const [busqueda, setBusqueda] = useState("");
    const [resultados, setResultados] = useState([]);
    const [conteos, setConteos] = useState({});
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [detalle, setDetalle] = useState(null);
    const [procesando, setProcesando] = useState(false);
    const ocupado = useRef(false);

    const cargar = useCallback(async () => {
        setCargando(true);
        setError("");
        try {
            const respuesta = await listarRevisionesFacialesService(estado);
            setResultados(respuesta.data?.resultados ?? []);
            setConteos(respuesta.data?.conteos ?? {});
        } catch (e) {
            setError(obtenerPrimerError(e.response?.data?.errores) || "No fue posible cargar las verificaciones.");
        } finally {
            setCargando(false);
        }
    }, [estado]);

    useEffect(() => { cargar(); }, [cargar]);

    const abrir = async (fila) => {
        setDetalle({ ...fila, cargando: true });
        try {
            const respuesta = await detalleRevisionFacialService(fila.proceso_id);
            setDetalle(respuesta.data);
        } catch (e) {
            setDetalle(null);
            Swal.fire({ icon: "error", title: "No se pudo abrir la verificación", text: obtenerPrimerError(e.response?.data?.errores) || "Inténtalo de nuevo." });
        }
    };

    // Personas que el sistema dejó pasar: ya usan su cuenta; el administrador confirma o bloquea.
    const resolverPosterior = async (decision) => {
        if (!detalle || ocupado.current) return false;
        const bloquear = decision === "bloquear";
        let motivo = "";
        if (bloquear) {
            const respuesta = await Swal.fire({
                icon: "warning",
                title: "Bloquear acceso",
                text: "La persona no podrá volver a ingresar y recibirá un correo con el motivo.",
                input: "textarea",
                inputLabel: "Motivo del bloqueo",
                inputPlaceholder: "Describe la inconsistencia encontrada",
                inputAttributes: { maxlength: 500 },
                showCancelButton: true,
                confirmButtonText: "Bloquear acceso",
                cancelButtonText: "Cancelar",
                inputValidator: (valor) => (!valor || valor.trim().length < 5 ? "Escribe el motivo (mínimo 5 caracteres)" : undefined),
            });
            if (!respuesta.isConfirmed) return false;
            motivo = respuesta.value.trim();
        } else {
            const respuesta = await Swal.fire({
                icon: "question",
                title: "¿Confirmar que es legítimo?",
                text: "La persona seguirá usando su cuenta con normalidad y el caso saldrá de esta lista.",
                showCancelButton: true,
                confirmButtonText: "Es legítimo",
                cancelButtonText: "Cancelar",
            });
            if (!respuesta.isConfirmed) return false;
        }
        ocupado.current = true;
        setProcesando(true);
        try {
            const respuesta = await resolverRevisionFacialService(detalle.proceso_id, decision, motivo);
            const enviado = respuesta.data?.correo_enviado === true;
            setDetalle(null);
            await cargar();
            Swal.fire(!bloquear
                ? { icon: "success", title: "Verificación confirmada", timer: 2200, showConfirmButton: false }
                : enviado
                    ? { icon: "success", title: "Acceso bloqueado", text: `Se notificó el motivo a ${detalle.correo_cuenta || "la persona"} por correo.` }
                    : { icon: "warning", title: "Acceso bloqueado", text: "No se pudo enviar el correo con el motivo. Comunícate con la persona por otro medio." });
            return true;
        } catch (e) {
            Swal.fire({ icon: "error", title: "No se pudo registrar la decisión", text: obtenerPrimerError(e.response?.data?.errores) || "Inténtalo de nuevo." });
            return false;
        } finally {
            ocupado.current = false;
            setProcesando(false);
        }
    };

    const resolver = async (decision) => {
        if (decision === "legitimo" || decision === "bloquear") return resolverPosterior(decision);
        if (!detalle || ocupado.current) return false;
        const aprobar = decision === "aprobar";
        const confirmacion = await Swal.fire({
            icon: aprobar ? "question" : "warning",
            title: aprobar ? "¿Aprobar la verificación?" : "¿Rechazar la verificación?",
            text: aprobar
                ? "La persona podrá continuar con su registro."
                : "El proceso de registro quedará bloqueado y la persona no podrá continuar.",
            showCancelButton: true,
            confirmButtonText: aprobar ? "Aprobar" : "Rechazar",
            cancelButtonText: "Cancelar",
        });
        if (!confirmacion.isConfirmed) return false;
        ocupado.current = true;
        setProcesando(true);
        try {
            const respuesta = await resolverRevisionFacialService(detalle.proceso_id, decision);
            const enviado = respuesta.data?.correo_enviado === true;
            setDetalle(null);
            await cargar();
            Swal.fire(enviado
                ? { icon: "success", title: "Decisión registrada", text: `Se notificó a ${detalle.correo || "la persona"} por correo.`, timer: 2600, showConfirmButton: false }
                : { icon: "warning", title: "Decisión registrada", text: "No se pudo enviar el correo de notificación. Comunícate con la persona por otro medio." });
            return true;
        } catch (e) {
            Swal.fire({ icon: "error", title: "No se pudo registrar la decisión", text: obtenerPrimerError(e.response?.data?.errores) || "Inténtalo de nuevo." });
            return false;
        } finally {
            ocupado.current = false;
            setProcesando(false);
        }
    };

    const texto = busqueda.trim().toLowerCase();
    const filtrados = texto
        ? resultados.filter(r => `${r.nombre} ${r.apellido} ${r.cedula}`.toLowerCase().includes(texto))
        : resultados;

    return {
        estado, setEstado, busqueda, setBusqueda, resultados: filtrados, conteos, cargando, error,
        recargar: cargar, detalle, abrir, cerrar: () => setDetalle(null), resolver, procesando,
    };
}
