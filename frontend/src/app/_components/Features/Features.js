import styles from './Features.module.css';
import Cards from '../../../../components/ui/Cards';
import Image from 'next/image';
export default function Features() {
    return (
        <div>
            <h2>Funcionalidades principales</h2>
            <div className={styles.cardContainer}>
                <div className={styles.cards}>
                    <Cards
                        title="Agendar citas"
                        description="Programa y gestiona tus citas médicas fácilmente."
                        image="/icons/cita_medica.png"
                        fontSizeh3="2rem"
                        widthImage='6rem'
                        heightImage='6rem'
                        fontSizeP='1.5rem'
                        widthContainer='550px'
                        heightContainer='320px'
                        padding='2rem'

                    />
                </div>
                <div className={styles.cards}>
                    <Cards
                        title="Chat bot"
                        description="Chatbot inteligente disponible 24/7 para ayudarte"
                        image="/icons/cara_bymax.png"
                        fontSizeh3="2rem"
                        widthImage='5rem'
                        heightImage='5rem'
                        fontSizeP='1.5rem'
                        widthContainer='550px'
                        heightContainer='320px'
                        padding='2rem'
                    />
                </div>
                <div className={styles.cards}>
                    <Cards
                        title="Gestión de Pacientes"
                        description="Para médicos: organiza,consulta y da seguimiento a tus pacientes de forma rápida y eficiente."
                        image="/icons/paciente.png"
                        fontSizeh3="2rem"
                        widthImage='4rem'
                        heightImage='4rem'
                        fontSizeP='1.5rem'
                        widthContainer='550px'
                        heightContainer='320px'
                        padding='2rem'
                    />
                </div>
                <div className={styles.cards}>
                    <Cards
                        title="Chatea"
                        description="Comunicate con tu doctor o tu paciente de forma rapida y segura ."
                        image="/icons/chat.png"
                        fontSizeh3="2rem"
                        widthImage='4rem'
                        heightImage='4rem'
                        fontSizeP='1.5rem'
                        widthContainer='550px'
                        heightContainer='320px'
                        padding='2rem'
                    />
                </div>
            </div>
        </div>
    );
}