import { ChartNoAxesCombined } from "lucide-react";
import styles from "./DashboardMetricsState.module.css";

export default function DashboardMetricsState() {
    return (
        <div className={styles.state} role="status">
            <span className={styles.icon} aria-hidden="true"><ChartNoAxesCombined size={23} /></span>
            <div>
                <h3>Visualizaciones a la espera de datos</h3>
                <p>Las tendencias y distribuciones aparecerán cuando el sistema disponga de métricas temporales verificadas.</p>
            </div>
        </div>
    );
}
