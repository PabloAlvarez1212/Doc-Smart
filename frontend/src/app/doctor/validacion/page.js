"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileSearch, LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";
import Button from "../../../../components/ui/Button/Button";
import useDoctorValidation from "../../../../components/doctor/Validation/useDoctorValidation";
import ValidationLayout from "../../../../components/doctor/Validation/ValidationLayout";
import PendingValidation from "../../../../components/doctor/Validation/PendingValidation";
import RejectedValidation from "../../../../components/doctor/Validation/RejectedValidation";
import styles from "../../../../components/doctor/Validation/Validation.module.css";

export default function DoctorValidationPage() {
    const router = useRouter();
    const { validacion, loading, error, recargarValidacion } = useDoctorValidation();
    const aprobado = validacion?.estado === "aprobado";

    useEffect(() => {
        if (!loading && !error && aprobado) router.replace("/doctor/home");
    }, [loading, error, aprobado, router]);

    let contenido;
    if (loading || (!error && aprobado)) {
        contenido = (
            <div role="status" aria-live="polite" aria-busy="true">
                <span className={styles.statusIcon}><LoaderCircle className={styles.spinner} size={28} aria-hidden="true" /></span>
                <h1>{aprobado ? "Tu solicitud está aprobada" : "Consultando tu solicitud"}</h1>
                <p className={styles.description}>{aprobado ? "Te estamos llevando al inicio del panel médico." : "Estamos cargando tu estado de validación médica."}</p>
            </div>
        );
    } else if (error) {
        contenido = (
            <div role="alert">
                <span className={`${styles.statusIcon} ${styles.rejected}`}><TriangleAlert size={28} aria-hidden="true" /></span>
                <h1>No pudimos consultar tu solicitud</h1>
                <p className={styles.description}>{error}</p>
            </div>
        );
    } else if (validacion?.estado === "pendiente") {
        contenido = <PendingValidation validacion={validacion} />;
    } else if (validacion?.estado === "rechazado") {
        contenido = <RejectedValidation validacion={validacion} />;
    } else {
        contenido = (
            <div role="status">
                <span className={styles.statusIcon}><FileSearch size={28} aria-hidden="true" /></span>
                <h1>{validacion?.estado ? "Estado de validación no disponible" : "No encontramos una solicitud"}</h1>
                <p className={styles.description}>{validacion?.estado
                    ? "No pudimos identificar el estado de tu solicitud. Vuelve a consultar en unos momentos."
                    : "No se encontró una solicitud de validación médica asociada a tu cuenta."}</p>
            </div>
        );
    }

    return (
        <ValidationLayout>
            {contenido}
            {!loading && !aprobado && (
                <div className={styles.actions}>
                    <Button className={styles.action} onClick={recargarValidacion}>
                        <RefreshCw size={16} aria-hidden="true" /> {error ? "Reintentar" : "Actualizar estado"}
                    </Button>
                </div>
            )}
        </ValidationLayout>
    );
}
