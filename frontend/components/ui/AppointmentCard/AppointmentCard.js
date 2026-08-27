import style from "./AppointmentCard.module.css";
import { estadoDiseño } from "@/app/utils/estadoDise/estadoDiseUtils";
import formatearFecha from "@/app/utils/fechaFormaterUtils";
import Image from "next/image";
import Button from "../Button/Button";
import { MapPin, Calendar, Clock, CalendarX, CalendarCheck } from "lucide-react";

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

    const fechaCancelacionFormateada = cita.fecha_cancelacion ? formatearFecha(cita.fecha_cancelacion) : null
    const fechaFinalFormateada = cita.fecha_final ? formatearFecha(cita.fecha_final) : null
    const fechaCancelada = fechaCancelacionFormateada?.fecha
    const horaCancelada = fechaCancelacionFormateada?.hora

    const fechaCompleta = fechaFinalFormateada?.fecha
    const horaCompletada = fechaFinalFormateada?.hora

    const estado = cita.estado?.toLowerCase();

    // ==========================================
    // DATOS DEL PERFIL SEGÚN EL ROL
    // ==========================================

    const nombrePerfil =
        rol === "medico"
            ? cita.paciente
            : cita.medico;

    const fotoPerfil =
        rol === "medico"
            ? cita.foto_paciente
            : cita.foto_medico;

    const fotoSrc = fotoPerfil
        ? fotoPerfil.startsWith("http")
            ? fotoPerfil
            : `http://localhost:8000${fotoPerfil}`
        : "/images/foto_default.png";


    // ==========================================
    // ACCIONES SEGÚN ESTADO DE LA CITA
    // ==========================================

    const renderAcciones = () => {

        switch (estado) {

            case "reprogramada":
            case "pendiente":
                return (
                    <div className={style.btns}>

                        <Button
                            variant="warning"
                            onClick={() =>
                                reprogramarCita?.(cita)
                            }
                        >
                            Reprogramar
                        </Button>

                        <Button
                            onClick={() =>
                                cancelarCita?.(cita.id)
                            }
                            variant="danger"
                        >
                            Cancelar
                        </Button>

                        {rol === "medico" && (
                            <Button
                                onClick={() =>
                                    confirmarCita?.(cita.id)
                                }
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

                        <Button
                            variant="warning"
                            onClick={() =>
                                reprogramarCita?.(cita)
                            }
                        >
                            Reprogramar
                        </Button>

                        <Button
                            onClick={() =>
                                cancelarCita?.(cita.id)
                            }
                            variant="danger"
                        >
                            Cancelar
                        </Button>

                        {rol === "medico" && (
                            <Button
                                onClick={() =>
                                    completarCita?.(cita.id)
                                }
                            >
                                Completar
                            </Button>
                        )}

                    </div>
                );


            case "cancelada":
                return (
                    <div className={style.containerFooter}>
                        <p className={style.textCanelada}>
                            La cita ha sido cancelada
                        </p>

                        {cita.fecha_cancelacion && (
                            <div className={style.fecha}>
                                <p><CalendarCheck size={18} /> <span>{fechaCancelada}</span></p>
                                <p><Clock size={18} /> <span>{horaCancelada}</span></p>
                            </div>
                        )}
                    </div>
                );


            case "completada":
                return (
                    <div className={style.containerFooter}>
                        <p className={style.textCompletada}>
                            La cita ha sido completada
                        </p>
                        {cita.fecha_final && (
                            <div className={style.fecha}>
                                <p><CalendarCheck size={18} /> <span>{fechaCompleta}</span></p>
                                <p><Clock size={18} /> <span>{horaCompletada}</span></p>
                            </div>
                        )}
                    </div>
                );


            default:
                return null;
        }
    };


    return (
        <div className={style.card}>

            {/* =========================
                HEADER DE LA TARJETA
            ========================== */}

            <div className={style.containerHeader}>

                <div className={style.info}>

                    <Image
                        src={fotoSrc}
                        alt={`Foto de ${nombrePerfil || "usuario"}`}
                        height={70}
                        width={70}
                    />

                    <div className={style.textHeader}>

                        <h3>
                            {nombrePerfil}
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


            {/* =========================
                INFORMACIÓN DE LA CITA
            ========================== */}

            <div className={style.main}>

                <div className={style.infoCita}>

                    <div className={style.textInfo}>

                        <Calendar />

                        <p>
                            {fecha}
                        </p>

                    </div>


                    <div className={style.textInfo}>

                        <Clock />

                        <p>
                            {hora}
                        </p>

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


                {/* =========================
                    ACCIONES
                ========================== */}

                <div className={style.footer}>
                    {renderAcciones()}
                </div>

            </div>

        </div>
    );
}