import styles from './Features.module.css';
import Cards from '../../../../components/ui/Card/Cards';

const features = [
    {
        title: "Agendar citas",
        description: "Programa y gestiona tus citas médicas en segundos, con confirmación inmediata.",
        image: "/icons/cita_medica.png",
        badge: "Pacientes",
        badgeColor: "#eff6ff",
        badgeText: "var(--color-dark)",
    },
    {
        title: "Asistente IA",
        description: "Chatbot inteligente disponible 24/7 para responder tus dudas médicas.",
        image: "/icons/cara_bymax.png",
        badge: "24/7",
        badgeColor: "#f0fdf4",
        badgeText: "#15803d",
    },
    {
        title: "Gestión de pacientes",
        description: "Para médicos: organiza, consulta y da seguimiento a tus pacientes de forma rápida y eficiente.",
        image: "/icons/paciente.png",
        badge: "Médicos",
        badgeColor: "#fdf4ff",
        badgeText: "#7e22ce",
    },
    {
        title: "Chat seguro",
        description: "Comunícate con tu doctor o paciente de forma privada y encriptada.",
        image: "/icons/chat.png",
        badge: "Seguro",
        badgeColor: "#fff7ed",
        badgeText: "#c2410c",
    },
];

export default function Features() {
    return (
        <section className={styles.section}>
            <div className={styles.header}>
                <span className={styles.sectionLabel}>Funcionalidades</span>
                <h2 className={styles.title}>Todo lo que necesitas<br />en un solo lugar</h2>
                <p className={styles.subtitle}>Diseñado para pacientes y profesionales de la salud</p>
            </div>

            <div className={styles.cardContainer}>
                {features.map((f, i) => (
                    <div key={i} className={styles.cardWrapper}>
                        <span
                            className={styles.badge}
                            style={{ background: f.badgeColor, color: f.badgeText }}
                        >
                            {f.badge}
                        </span>
                        <Cards
                            title={f.title}
                            description={f.description}
                            image={f.image}
                            className={styles.card}
                        />
                    </div>
                ))}
            </div>
        </section>
    );
}