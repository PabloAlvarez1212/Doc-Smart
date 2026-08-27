import styles from "./Hero.module.css";
import Image from "next/image";

export default function Hero({ nombre, especialidad, foto_perfil }) {

    const fotoPerfil = foto_perfil
        ? foto_perfil.startsWith("http")
            ? foto_perfil
            : `http://localhost:8000${foto_perfil}`
        : "/images/foto_default.png";

    return (
        <div className={styles.containerMain}>
            <div className={styles.saludo}>
                <div className={styles.containerText}>
                    <p>Bienvenido de vuelta</p>
                    <h2>Dr. {nombre}</h2>
                    <p>{especialidad}</p>
                </div>

                <div className={styles.img}>
                    <Image src={fotoPerfil} alt="Foto de perfil" width={150} height={150} loading="eager"/>
                </div>

            </div>
        </div>
    );
}