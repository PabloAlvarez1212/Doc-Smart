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

export function renderIcono(tipo,size){
    switch(tipo){
        case "nueva_solicitud":
            return <CheckCircle size={size} color="#F59E0B" />
        case "cita_pendiente":
            return <CheckCircle size={size} color="#F59E0B" />
        case "cita_confirmada":
            return <CheckCircle size={size} color="#2563EB" />
        case "cita_reprogramada":
            return <AlertCircle size={size} color="#FFAD51" />
        case "cita_completada":
            return <CheckCircle size={size} color="#22C55E" />
        case "cita_cancelada":
            return <XCircle size={size} color="#FF0000" />;
    }
}