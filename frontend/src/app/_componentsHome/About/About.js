import styles from "./About.module.css";

const equipo = [
    "Juan Pablo Alvarez Montoya",
    "Miguel Angel Racero Guerrero",
    "Kleider Yesid Echeverry",
];

export default function About() {
    return (
        <section
            id="quienes-somos"
            className={styles.section}
            aria-labelledby="about-title"
        >
            <span className={styles.label}>Nuestro equipo</span>

            <h2 id="about-title">Quiénes somos</h2>

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

            <div className={styles.team}>
                {equipo.map((nombre) => (
                    <article key={nombre} className={styles.member}>
                        <h3>{nombre}</h3>
                        <span>Diseño y desarrollo · Estudiantes del SENA </span>
                    </article>
                ))}
            </div>

            <p className={styles.note}>
                Nuestro propósito es construir una experiencia clara,
                accesible y cercana, que facilite la comunicación entre
                pacientes y profesionales. DocSmart apoya la gestión
                de la atención; las decisiones clínicas corresponden
                a los profesionales de salud.
            </p>
        </section>
    );
}