import Image from "next/image";
import styles from "./AppointmentsList.module.css";
import { Clock12Icon } from "lucide-react";
import Button from "../../../ui/Button/Button";
import formatearFecha from '@/app/utils/fechaFormaterUtils';
import { estadoDiseño } from "@/app/utils/estadoDise/estadoDiseUtils";

export default function AppointmentsList({ data }) {
    const proximasCitas = (data?.proximas_citas || []).slice(0, 3);

    return (
        <div className={styles.containerMain}>
            <div className={styles.header}>
                <h2>Próximas Citas</h2>
                <Button className={styles.btn} size="sm">Ver más &nbsp;&nbsp;&gt;</Button>
            </div>

            {proximasCitas.length > 0 ? (
                <div className={styles.containerCards}>
                    {proximasCitas.map((cita) => {
                        // Pasamos directamente fecha_programada
                        const { fecha, hora } = formatearFecha(cita?.fecha_programada) || { fecha: '', hora: '' };

                        return (
                            <div className={styles.card} key={cita?.id}>
                                <div className={styles.container}>
                                    <Image 
                                        src="/images/doctor3.jpg" 
                                        width={120} 
                                        height={100} 
                                        alt="foto de perfil" 
                                    />
                                    <div className={styles.description}>
                                        <h3>Dr. {cita?.medico}</h3>
                                        <p>{cita?.especialidad}</p>
                                        <p>{`${cita?.ciudad} - ${cita?.direccion}`}</p>
                                        <div className={styles.schedule}>
                                            <Clock12Icon size={20} />
                                            <p>{fecha}</p>
                                            <p>{hora}</p>
                                        </div>
                                    </div>
                                </div>
                                <p className={estadoDiseño(cita?.estado)}>{cita?.estado}</p>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className={styles.textNotCitas}>No hay próximas citas que mostrar</p>
            )}
        </div>
    );
}