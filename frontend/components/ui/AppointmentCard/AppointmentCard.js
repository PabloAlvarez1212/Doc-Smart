import style from "./AppointmentCard.module.css";
import { estadoDiseño } from "@/app/utils/estadoDise/estadoDiseUtils";
import formatearFecha from "@/app/utils/fechaFormaterUtils";
import Image from "next/image";
import Button from "../Button/Button";
import { MapPin, Calendar, Clock } from "lucide-react";

export default function AppointmentCard({
    cita,
    rol,
    cancelarCita,
    confirmarCita,
    completarCita,
    reprogramarCita,
}) {

    const { fecha, hora } = formatearFecha(
        cita.fecha_programada
    );

    const estado = cita.estado?.toLowerCase();

    const renderAcciones = () => {
        switch (estado) {
            case "reprogramada":
            case "pendiente":
                return (
                    <div className={style.btns}>

                        <Button
                            variant="warning"
                            onClick={() => reprogramarCita?.(cita)}
                        >
                            Reprogramar
                        </Button>

                        <Button
                            onClick={() => cancelarCita?.(cita.id)}
                            variant="danger"
                        >
                            Cancelar
                        </Button>

                        {rol === "medico" && (
                            <Button
                                onClick={() => confirmarCita?.(cita.id)}
                                className={style.btnConfirmar}
                            >
                                Confirmar
                            </Button>
                        )}

                    </div>
                );

            case "confirmada":
                return (
                    <div className={style.btns}>

                        <Button variant="warning">
                            Reprogramar
                        </Button>

                        <Button
                            onClick={() => cancelarCita?.(cita.id)}
                            variant="danger"
                        >
                            Cancelar
                        </Button>

                        {rol === "medico" && (
                            <Button
                                onClick={() => completarCita?.(cita.id)}
                            >
                                Completar
                            </Button>
                        )}

                    </div>
                );

            case "cancelada":
                return (
                    <p className={style.textCanelada}>
                        La cita ha sido cancelada
                    </p>
                );

            case "completada":
                return (
                    <p className={style.textCompletada}>
                        La cita ha sido completada
                    </p>
                );

            default:
                return null;
        }
    };

    return (
        <div className={style.card}>

            <div className={style.containerHeader}>

                <div className={style.info}>

                    <Image
                        src="/images/doctor3.jpg"
                        alt="Foto"
                        height={70}
                        width={70}
                    />

                    <div className={style.textHeader}>
                        <h3>
                            {rol === "paciente"
                                ? cita.medico
                                : cita.paciente}
                        </h3>

                        <p>
                            {cita.especialidad}
                        </p>
                    </div>

                </div>

                <p className={estadoDiseño(estado)}>
                    {cita.estado}
                </p>

            </div>

            <div className={style.main}>

                <div className={style.infoCita}>

                    <div className={style.textInfo}>
                        <Calendar />
                        <p>{fecha}</p>
                    </div>

                    <div className={style.textInfo}>
                        <Clock />
                        <p>{hora}</p>
                    </div>

                    <div className={style.direccion}>
                        <MapPin />

                        <div className={style.textInfoDireccion}>
                            <p>
                                {`${cita.ciudad} - ${cita.departamento}`}
                            </p>

                            <p>
                                {cita.direccion}
                            </p>
                        </div>
                    </div>

                </div>

                <div className={style.footer}>
                    {renderAcciones()}
                </div>

            </div>

        </div>
    );
}