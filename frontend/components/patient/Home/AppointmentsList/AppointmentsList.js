"use client"
import Image from "next/image";
import styles from "./AppointmentsList.module.css";
import { Calendar, Clock12Icon,MapPin,Stethoscope } from "lucide-react";
import Button from "../../../ui/Button/Button";
import formatearFecha from '@/app/utils/fechaFormaterUtils';
import { estadoDiseño } from "@/app/utils/estadoDise/estadoDiseUtils";
import { useRouter } from "next/navigation";
export default function AppointmentsList({ data }) {
    const proximasCitas = (data?.proximas_citas || []).slice(0, 3);
    const ruta = useRouter()

    return (
        <div className={styles.containerMain}>
            <div className={styles.header}>
                <h2>Próximas Citas</h2>
                <Button onClick={() => ruta.push('/patient/my-appointments')} className={styles.btn} size="sm" >Ver más &nbsp;&nbsp;&gt;</Button>
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
                                        src={cita?.foto_medico ? cita.foto_medico : "/images/foto_default.png"} 
                                        width={80} 
                                        height={80} 
                                        alt="foto de perfil" 
                                    />
                                    <div className={styles.description}>
                                        <h3>Dr. {cita?.medico}</h3>
                                        <div className={styles.especialidad}>
                                            <Stethoscope size={20} color="#8B5CF6"/>
                                            <p>{cita?.especialidad}</p>
                                        </div>
                                        <div className={styles.direccion}>
                                            <MapPin size={20} color="#3B82F6"/>
                                            <p>{`${cita?.ciudad} - ${cita?.direccion}`}</p>
                                        </div>
                                        
                                        <div className={styles.schedule}>
                                            <div className={styles.containerFecha}>
                                                <Calendar size={20}/>
                                                <p>{fecha}</p>
                                            </div>
                                            <div className={styles.containerFecha}>
                                                <Clock12Icon size={20} />
                                                <p>{hora}</p>
                                            </div>      
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