import styles from "./estadoDiseUtils.module.css"
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';

export function estadoDiseño(data) {
    switch (data) {
        case "confirmada":
            return styles.confirmada;
        case "pendiente":
            return styles.pendiente;
        case "completada":
            return styles.completada;
        case "cancelada":
            return styles.cancelada;
        case "reprogramada":
            return styles.reprogramada;
    }
}

export function renderIcono(tipo){
    switch(tipo){
        case "nueva_solicitud":
            return <CheckCircle color="green" />
        case "cita_pendiente":
            return <CheckCircle color="green" />
        case "cita_confirmada":
            return <CheckCircle color="green" />
        case "cita_reprogramada":
            return <AlertCircle color="#FFAD51" />
        case "cita_completada":
            return <CheckCircle color="green" />
        case "cita_cancelada":
            return <XCircle color="#FF0000" />;
    }
}