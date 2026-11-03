import { GraduationCap } from "lucide-react";
import Reveal from "../Reveal";
import home from "../home.module.css";
import styles from "./About.module.css";

const equipo = [
    ["Juan Pablo Alvarez Montoya", "JA"],
    ["Miguel Angel Racero Guerrero", "MR"],
    ["Kleider Yesid Echeverry", "KE"],
];

export default function About() {
    return (
        <section
            id="quienes-somos"
            className={home.section}
            aria-labelledby="about-title"
        >
            <div className={styles.about}>
                <Reveal>
                    <h2 id="about-title" className={home.h2}>Quiénes somos</h2>

                    <p className={styles.description}>
                        Somos un equipo de estudiantes del Servicio Nacional de
                        Aprendizaje (SENA), unidos por el interés en la tecnología
                        y su aplicación para facilitar el acceso a los servicios
                        de salud.
                    </p>

                    <p className={styles.description}>
                        Como parte de nuestro proceso de formación, diseñamos y
                        desarrollamos DocSmart: una plataforma que conecta
                        pacientes y médicos, facilita la gestión de citas y
                        organiza la información de salud. También integra a
                        Bymax, un asistente virtual que acompaña a los usuarios
                        en el uso de la plataforma.
                    </p>

                    <span className={styles.sena}>
                        <GraduationCap size={17} aria-hidden="true" />
                        Proyecto formativo del SENA
                    </span>
                </Reveal>

                <div className={styles.team}>
                    {equipo.map(([nombre, iniciales], i) => (
                        <Reveal as="article" key={nombre} className={styles.member} delay={i * .07}>
                            <span className={styles.avatar} aria-hidden="true">{iniciales}</span>
                            <div>
                                <h3>{nombre}</h3>
                                <span>Diseño y desarrollo · Estudiante del SENA</span>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>

            <Reveal as="blockquote" className={styles.purpose}>
                Nuestro propósito es construir una experiencia clara,
                accesible y cercana, que facilite la comunicación entre
                pacientes y profesionales.
                <small>
                    DocSmart apoya la gestión de la atención; las decisiones
                    clínicas corresponden a los profesionales de salud.
                </small>
            </Reveal>
        </section>
    );
}
