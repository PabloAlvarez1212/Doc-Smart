"use client";

import FindDoctorsHero from "../../../../components/patient/FindDoctors/Hero/FindDoctorsHero";
import DoctorsList from "../../../../components/patient/FindDoctors/List/DoctorsList";
import useFindDoctors from "../../../../components/patient/FindDoctors/useFindDoctors";
import styles from "./findDoctors.module.css";

export default function FindDoctorsPage() {
    const { doctores, loading, error, retry } = useFindDoctors();

    return (
        <div className={styles.page}>
            <FindDoctorsHero total={doctores.length} loading={loading} error={Boolean(error)} />
            <DoctorsList
                doctores={doctores}
                loading={loading}
                error={error}
                onRetry={retry}
            />
        </div>
    );
}
