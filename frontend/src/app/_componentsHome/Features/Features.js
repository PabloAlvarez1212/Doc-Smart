import styles from './Features.module.css';
import Cards from '../../../../components/ui/Card/Cards';
export default function Features() {
    return (
        <div>
            <h2 className={styles.title}>Funcionalidades principales</h2>
            <div className={styles.cardContainer}>
                <div className={styles.cards}>
                    <Cards
                        title="Agendar citas"
                        description="Programa y gestiona tus citas médicas fácilmente."
                        image="/icons/cita_medica.png"
                        className={styles.card}
                    />
                </div>
                <div className={styles.cards}>
                    <Cards
                        title="Chat bot"
                        description="Chatbot inteligente disponible 24/7 para ayudarte"
                        image="/icons/cara_bymax.png"
                        className={styles.card}
                    />
                </div>
                <div className={styles.cards}>
                    <Cards
                        title="Gestión de Pacientes"
                        description="Para médicos: organiza,consulta y da seguimiento a tus pacientes de forma rápida y eficiente."
                        image="/icons/paciente.png"
                        className={styles.card}
                    />
                </div>
                <div className={styles.cards}>
                    <Cards
                        title="Chatea"
                        description="Comunicate con tu doctor o tu paciente de forma rapida y segura ."
                        image="/icons/chat.png"
                       className={styles.card}
                    />
                </div>
            </div>
        </div>
    );
}