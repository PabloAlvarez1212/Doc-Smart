"use client";

import { useMemo, useState } from "react";
import Modal from "../../../../components/ui/Modal/Modal";
import MedicalHistoryHero from "../../../../components/patient/MedicalHistory/Hero/MedicalHistoryHero";
import MedicalHistoryFilters from "../../../../components/patient/MedicalHistory/Filters/MedicalHistoryFilters";
import MedicalHistorySummary from "../../../../components/patient/MedicalHistory/Summary/MedicalHistorySummary";
import MedicalHistoryTimeline from "../../../../components/patient/MedicalHistory/Timeline/MedicalHistoryTimeline";
import MedicalHistoryDetail from "../../../../components/patient/MedicalHistory/Detail/MedicalHistoryDetail";
import { mockMedicalHistory } from "../../../../components/patient/MedicalHistory/mockMedicalHistory";
import styles from "./myMedicalHistory.module.css";

const initialFilters = { search: "", period: "all", doctor: "all" };

export default function MedicalHistory() {
    const [filters, setFilters] = useState(initialFilters);
    const [selectedRecord, setSelectedRecord] = useState(null);

    const doctors = useMemo(
        () => [...new Set(mockMedicalHistory.map((record) => record.medico))],
        []
    );

    const filteredRecords = useMemo(() => {
        const today = new Date("2026-09-04T12:00:00");
        const query = filters.search.trim().toLocaleLowerCase("es");

        return mockMedicalHistory.filter((record) => {
            const recordDate = new Date(`${record.fecha_creacion}T12:00:00`);
            const monthsAgo = (today.getFullYear() - recordDate.getFullYear()) * 12
                + today.getMonth() - recordDate.getMonth();

            const matchesSearch = !query || [
                record.medico,
                record.motivo_consulta,
                record.diagnostico_general,
            ].some((value) => value.toLocaleLowerCase("es").includes(query));

            const matchesDoctor = filters.doctor === "all"
                || record.medico === filters.doctor;

            const matchesPeriod = filters.period === "all"
                || (filters.period === "3months" && monthsAgo <= 3)
                || (filters.period === "6months" && monthsAgo <= 6)
                || (filters.period === "year" && recordDate.getFullYear() === today.getFullYear());

            return matchesSearch && matchesDoctor && matchesPeriod;
        });
    }, [filters]);

    const handleFilterChange = (field, value) => {
        setFilters((current) => ({ ...current, [field]: value }));
    };

    return (
        <div className={styles.page}>
            <MedicalHistoryHero total={mockMedicalHistory.length} />
            <MedicalHistoryFilters filters={filters} doctors={doctors} onChange={handleFilterChange} onReset={() => setFilters(initialFilters)} />
            <MedicalHistorySummary records={mockMedicalHistory} />
            <MedicalHistoryTimeline
                records={filteredRecords}
                hasFilters={Object.values(filters).some((value) => value !== "" && value !== "all")}
                onSelect={setSelectedRecord}
                onReset={() => setFilters(initialFilters)}
            />
            <Modal abierto={Boolean(selectedRecord)} onCerrar={() => setSelectedRecord(null)} titulo="Detalle de la consulta">
                {selectedRecord && <MedicalHistoryDetail record={selectedRecord} />}
            </Modal>
        </div>
    );
}
