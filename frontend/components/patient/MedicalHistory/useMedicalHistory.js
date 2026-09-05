"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    listarHistorialPacienteService,
    obtenerHistorialClinicoService,
} from "@/app/services/medicalHistoryServices";

const PAGE_SIZE = 6;

const getRequestError = (error, context = "list") => {
    const status = error.response?.status;

    if (status === 401) {
        return "Tu sesión ya no está disponible. Inicia sesión nuevamente.";
    }

    if (status === 403) {
        return "No tienes permiso para consultar este historial clínico.";
    }

    if (status === 404 && context === "detail") {
        return "El registro solicitado no está disponible o no te pertenece.";
    }

    if (status === 429) {
        return "Has realizado demasiadas consultas. Espera un momento antes de intentarlo de nuevo.";
    }

    if (status >= 500) {
        return "El historial no está disponible temporalmente. Inténtalo más tarde.";
    }

    if (!error.response) {
        return "No fue posible conectar con el servidor. Revisa tu conexión.";
    }

    return "No fue posible cargar el historial clínico.";
};

export default function useMedicalHistory() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [ordering, setOrdering] = useState("-fecha_creacion");
    const [latestRecord, setLatestRecord] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    const [selectedRecord, setSelectedRecord] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState(null);

    const listControllerRef = useRef(null);
    const detailControllerRef = useRef(null);

    useEffect(() => {
        const controller = new AbortController();
        listControllerRef.current?.abort();
        listControllerRef.current = controller;

        const loadRecords = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = await listarHistorialPacienteService({
                    page,
                    pageSize: PAGE_SIZE,
                    ordering,
                    signal: controller.signal,
                });
                const nextRecords = Array.isArray(data?.results) ? data.results : [];

                setRecords(nextRecords);
                setTotalRecords(Number(data?.count) || 0);
                setTotalPages(Math.max(Number(data?.total_pages) || 1, 1));
                setPage(Number(data?.current_page) || 1);

                if (page === 1 && ordering === "-fecha_creacion") {
                    setLatestRecord(nextRecords[0] ?? null);
                }
            } catch (requestError) {
                if (requestError.code === "ERR_CANCELED") return;

                if (requestError.response?.status === 404) {
                    if (page > 1) {
                        setPage(1);
                        return;
                    }
                    setRecords([]);
                    setTotalRecords(0);
                    setTotalPages(1);
                    setLatestRecord(null);
                    return;
                }

                setRecords([]);
                setError(getRequestError(requestError));
            } finally {
                if (listControllerRef.current === controller) {
                    setLoading(false);
                }
            }
        };

        loadRecords();

        return () => controller.abort();
    }, [ordering, page, reloadKey]);

    useEffect(() => () => detailControllerRef.current?.abort(), []);

    const changePage = useCallback((nextPage) => {
        if (nextPage < 1 || nextPage > totalPages) return;
        setPage(nextPage);
    }, [totalPages]);

    const changeOrdering = useCallback((nextOrdering) => {
        setPage(1);
        setOrdering(nextOrdering);
    }, []);

    const retry = useCallback(() => {
        setReloadKey((current) => current + 1);
    }, []);

    const openDetail = useCallback(async (record) => {
        const controller = new AbortController();
        detailControllerRef.current?.abort();
        detailControllerRef.current = controller;
        setSelectedRecord(record);
        setDetailLoading(true);
        setDetailError(null);

        try {
            const detail = await obtenerHistorialClinicoService(record.id, {
                signal: controller.signal,
            });
            setSelectedRecord(detail);
        } catch (requestError) {
            if (requestError.code === "ERR_CANCELED") return;
            setDetailError(getRequestError(requestError, "detail"));
        } finally {
            if (detailControllerRef.current === controller) {
                setDetailLoading(false);
            }
        }
    }, []);

    const closeDetail = useCallback(() => {
        detailControllerRef.current?.abort();
        detailControllerRef.current = null;
        setSelectedRecord(null);
        setDetailError(null);
        setDetailLoading(false);
    }, []);

    const retryDetail = useCallback(() => {
        if (selectedRecord) openDetail(selectedRecord);
    }, [openDetail, selectedRecord]);

    return {
        records,
        loading,
        error,
        page,
        totalPages,
        totalRecords,
        ordering,
        latestRecord,
        selectedRecord,
        detailLoading,
        detailError,
        changePage,
        changeOrdering,
        retry,
        openDetail,
        closeDetail,
        retryDetail,
    };
}
