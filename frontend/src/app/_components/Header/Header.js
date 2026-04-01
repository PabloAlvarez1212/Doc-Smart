import styles from './Header.module.css';
import Image from 'next/image';
export default function Header(){
    return (
        <div className={styles.containerMain}>
            <div className={styles.logo}>
                <Image
                    src="/images/logoSentado.png"
                    width="100"
                    height="100"
                    alt='logo'
                />
                <h2><span>Doc</span>Smart</h2>
            </div>
            <div className={styles.btns}>
                <button>Iniciar sesión</button>
                <button>Registarse</button>
            </div>
        </div>
    );
}