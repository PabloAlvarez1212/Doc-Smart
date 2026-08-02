"use client";

import styles from "./appointments.module.css";
import {
    UserRound,
    Phone,
    Mail,
    CalendarDays,
    FileText,
    Eye
} from "lucide-react";

export default function Appointments() {

    const pacientes = [
        {
            nombre: "Juan Pérez",
            edad: "45 años",
            genero: "Masculino",
            telefono: "+57 300 123 4567",
            correo: "juan.perez@email.com",
            visita: "10 de Marzo, 2026",
            condicion: "Hipertensión",
            estado: "Estable",
            color: styles.stable
        },
        {
            nombre: "María García",
            edad: "32 años",
            genero: "Femenino",
            telefono: "+57 310 987 6543",
            correo: "maria.garcia@email.com",
            visita: "12 de Marzo, 2026",
            condicion: "Control rutinario",
            estado: "Saludable",
            color: styles.healthy
        },
        {
            nombre: "Carlos Rodríguez",
            edad: "58 años",
            genero: "Masculino",
            telefono: "+57 320 456 7890",
            correo: "carlos.rodriguez@email.com",
            visita: "8 de Marzo, 2026",
            condicion: "Diabetes Tipo 2",
            estado: "En monitoreo",
            color: styles.monitor
        },
        {
            nombre: "Ana Martínez",
            edad: "28 años",
            genero: "Femenino",
            telefono: "+57 315 234 5678",
            correo: "ana.martinez@email.com",
            visita: "14 de Marzo, 2026",
            condicion: "Alergia estacional",
            estado: "Estable",
            color: styles.stable
        }
    ];


    return (
        <div className={styles.container}>

            <div className={styles.search}>
                Buscar pacientes por nombre o condición...
            </div>


            <div className={styles.grid}>

                {pacientes.map((paciente,index)=>(

                    <div className={styles.card} key={index}>


                        <div className={styles.top}>

                            <div className={styles.user}>
                                <div className={styles.avatar}>
                                    <UserRound size={25}/>
                                </div>

                                <div>
                                    <h3>{paciente.nombre}</h3>
                                    <p>
                                        {paciente.edad} • {paciente.genero}
                                    </p>
                                </div>
                            </div>


                            <span className={`${styles.status} ${paciente.color}`}>
                                {paciente.estado}
                            </span>

                        </div>


                        <div className={styles.info}>

                            <p>
                                <Phone size={16}/>
                                {paciente.telefono}
                            </p>

                            <p>
                                <Mail size={16}/>
                                {paciente.correo}
                            </p>

                            <p>
                                <CalendarDays size={16}/>
                                Última visita: {paciente.visita}
                            </p>

                            <p>
                                <FileText size={16}/>
                                {paciente.condicion}
                            </p>

                        </div>


                        <button className={styles.button}>
                            <Eye size={17}/>
                            Ver Detalles
                        </button>


                    </div>

                ))}

            </div>

        </div>
    );
}