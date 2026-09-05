"use client";

import { useMemo, useState } from "react";
import Modal from "../../../../components/ui/Modal/Modal";
import Pagination from "../../../../components/ui/Pagination/Pagination";
import MedicalHistoryHero from "../../../../components/patient/MedicalHistory/Hero/MedicalHistoryHero";
import MedicalHistoryFilters from "../../../../components/patient/MedicalHistory/Filters/MedicalHistoryFilters";
import MedicalHistorySummary from "../../../../components/patient/MedicalHistory/Summary/MedicalHistorySummary";
import MedicalHistoryTimeline from "../../../../components/patient/MedicalHistory/Timeline/MedicalHistoryTimeline";
import MedicalHistoryDetail from "../../../../components/patient/MedicalHistory/Detail/MedicalHistoryDetail";
import useMedicalHistory from "../../../../components/patient/MedicalHistory/useMedicalHistory";
import { getMedicalHistoryTimestamp } from "../../../../components/patient/MedicalHistory/medicalHistoryFormatters";
import styles from "./myMedicalHistory.module.css";

const initialFilters = {
    search: "",
    period: "all",
    doctor: "all",
    ordering: "-fecha_creacion",
};

export default function MedicalHistory() {
    const [filters, setFilters] = useState(initialFilters);
    const {
        records,
        loading,
        error,
        page,
        totalPages,
        totalRecords,
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
    } = useMedicalHistory();

    const doctors = useMemo(
        () => [...new Set(records.map((record) => record.medico).filter(Boolean))],
        [records]
    );

    const filteredRecords = useMemo(() => {
        const today = new Date();
        const query = filters.search.trim().toLocaleLowerCase("es");

        return records.filter((record) => {
            const recordDate = new Date(getMedicalHistoryTimestamp(record.fecha_creacion));
            const monthsAgo = (today.getFullYear() - recordDate.getFullYear()) * 12
                + today.getMonth() - recordDate.getMonth();

            const matchesSearch = !query || [
                record.medico,
                record.motivo_consulta,
                record.diagnostico_general,
            ].some((value) => String(value ?? "").toLocaleLowerCase("es").includes(query));

            const matchesDoctor = filters.doctor === "all"
                || record.medico === filters.doctor;

            const matchesPeriod = filters.period === "all"
                || (filters.period === "3months" && monthsAgo >= 0 && monthsAgo <= 3)
                || (filters.period === "6months" && monthsAgo >= 0 && monthsAgo <= 6)
                || (filters.period === "year" && recordDate.getFullYear() === today.getFullYear());

            return matchesSearch && matchesDoctor && matchesPeriod;
        });
    }, [filters, records]);

    const handleFilterChange = (field, value) => {
        setFilters((current) => ({ ...current, [field]: value }));
        if (field === "ordering") changeOrdering(value);
    };

    const resetFilters = () => {
        setFilters(initialFilters);
        changeOrdering(initialFilters.ordering);
    };

    const hasFilters = filters.search !== ""
        || filters.period !== "all"
        || filters.doctor !== "all";

    return (
        <div className={styles.page}>
            <MedicalHistoryHero total={totalRecords} loading={loading} />
            <MedicalHistoryFilters
                filters={filters}
                doctors={doctors}
                onChange={handleFilterChange}
                onReset={resetFilters}
            />
            <MedicalHistorySummary
                records={records}
                total={totalRecords}
                latestRecord={latestRecord}
                loading={loading}
            />
            <MedicalHistoryTimeline
                records={filteredRecords}
                hasFilters={hasFilters}
                loading={loading}
                error={error}
                latestRecordId={latestRecord?.id}
                onRetry={retry}
                onSelect={openDetail}
                onReset={resetFilters}
            />
            {!error && !loading && (
                <Pagination
                    paginaActual={page}
                    totalPaginas={totalPages}
                    totalRegistros={totalRecords}
                    onCambiarPagina={changePage}
                    cargando={loading}
                />
            )}
            <Modal
                abierto={Boolean(selectedRecord)}
                onCerrar={closeDetail}
                titulo="Detalle de la consulta"
            >
                {selectedRecord && (
                    <MedicalHistoryDetail
                        record={selectedRecord}
                        loading={detailLoading}
                        error={detailError}
                        onRetry={retryDetail}
                    />
                )}
            </Modal>
        </div>
    );
}
