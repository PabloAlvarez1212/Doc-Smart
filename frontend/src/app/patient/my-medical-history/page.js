"use client";

import Modal from "../../../../components/ui/Modal/Modal";
import Pagination from "../../../../components/ui/Pagination/Pagination";
import MedicalHistoryHero from "../../../../components/patient/MedicalHistory/Hero/MedicalHistoryHero";
import MedicalHistoryFilters from "../../../../components/patient/MedicalHistory/Filters/MedicalHistoryFilters";
import MedicalHistorySummary from "../../../../components/patient/MedicalHistory/Summary/MedicalHistorySummary";
import MedicalHistoryTimeline from "../../../../components/patient/MedicalHistory/Timeline/MedicalHistoryTimeline";
import MedicalHistoryDetail from "../../../../components/patient/MedicalHistory/Detail/MedicalHistoryDetail";
import useMedicalHistory from "../../../../components/patient/MedicalHistory/useMedicalHistory";
import styles from "./myMedicalHistory.module.css";

export default function MedicalHistory() {
    const {
        records,
        loading,
        error,
        page,
        totalPages,
        totalRecords,
        overallTotal,
        filters,
        professionals,
        hasFilters,
        latestRecord,
        selectedRecord,
        detailLoading,
        detailError,
        changePage,
        changeFilter,
        resetFilters,
        retry,
        openDetail,
        closeDetail,
        retryDetail,
    } = useMedicalHistory();

    return (
        <div className={styles.page}>
            <MedicalHistoryHero total={overallTotal} loading={loading} />
            <MedicalHistoryFilters
                filters={filters}
                professionals={professionals}
                onChange={changeFilter}
                onReset={resetFilters}
            />
            <MedicalHistorySummary
                records={records}
                total={overallTotal}
                latestRecord={latestRecord}
                loading={loading}
            />
            <MedicalHistoryTimeline
                records={records}
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
