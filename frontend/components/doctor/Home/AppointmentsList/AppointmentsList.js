import styles from "./AppointmentsList.module.css";
import Button from "../../../ui/Button/Button";
import {
    CalendarDays,
    Clock,
    Mail,
    Phone
} from "lucide-react";

import formatearFecha from "@/app/utils/fechaFormaterUtils";
import Image from "next/image";
import Link from "next/link";

export default function AppointmentsList({ data }) {

    const proximasCitas =
        data?.proximas_citas || [];

    return (
        <div className={styles.containerMain}>

            <div className={styles.container}>

                <div className={styles.header}>

                    <div>
                        <h2>Próximas Citas</h2>

                        <p className={styles.subtitle}>
                            Tus próximas consultas programadas
                        </p>
                    </div>

                    <Link
                        href="/doctor/my-appointments"
                        className={styles.link}
                    >
                        <Button
                            className={styles.btnGreen}
                            size="sm"
                        >
                            Ver más &nbsp; &gt;
                        </Button>
                    </Link>

                </div>


                {proximasCitas.length > 0 ? (

                    <div className={styles.containerCards}>

                        {proximasCitas.map((cita) => {

                            const { fecha, hora } =
                                formatearFecha(
                                    cita.fecha_programada
                                );

                            const fotoPaciente =
                                cita.foto_paciente
                                    ? `http://localhost:8000${cita.foto_paciente}`
                                    : "/images/foto_default.png";

                            const estado =
                                cita.estado?.toLowerCase();

                            return (

                                <div
                                    className={styles.card}
                                    key={cita.id}
                                >

                                    {/* FOTO */}

                                    <div className={styles.avatar}>

                                        <Image
                                            src={fotoPaciente}
                                            alt={`Foto de ${cita.paciente}`}
                                            width={75}
                                            height={75}
                                        />

                                    </div>


                                    {/* INFORMACIÓN DEL PACIENTE */}

                                    <div className={styles.patientInfo}>

                                        <div className={styles.nameRow}>

                                            <div>
                                                <h3>
                                                    {cita.paciente}
                                                </h3>

                                                <span className={styles.patientLabel}>
                                                    Paciente
                                                </span>
                                            </div>

                                        </div>


                                        <div className={styles.contactInfo}>

                                            {cita.correo && (
                                                <div className={styles.infoItem}>
                                                    <Mail size={16} />
                                                    <span>
                                                        {cita.correo}
                                                    </span>
                                                </div>
                                            )}

                                            {cita.telefono && (
                                                <div className={styles.infoItem}>
                                                    <Phone size={16} />
                                                    <span>
                                                        {cita.telefono}
                                                    </span>
                                                </div>
                                            )}

                                        </div>


                                        <div className={styles.schedule}>

                                            <div className={styles.infoItem}>
                                                <CalendarDays size={17} />
                                                <span>{fecha}</span>
                                            </div>

                                            <div className={styles.infoItem}>
                                                <Clock size={17} />
                                                <span>{hora}</span>
                                            </div>

                                        </div>

                                    </div>


                                    {/* ESTADO */}

                                    <div className={styles.statusContainer}>

                                        <span
                                            className={`${styles.status} ${styles[estado]}`}
                                        >
                                            {cita.estado}
                                        </span>

                                    </div>

                                </div>
                            );

                        })}

                    </div>

                ) : (

                    <div className={styles.emptyState}>

                        <CalendarDays size={35} />

                        <p>
                            No tienes próximas citas programadas.
                        </p>

                    </div>

                )}

            </div>

        </div>
    );
}