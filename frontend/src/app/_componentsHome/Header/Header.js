"use client";
import styles from './Header.module.css';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function Header() {
    const router = useRouter();

    return (
        <header className={styles.containerMain}>
            <div className={styles.logo}>
                <Image
                    src="/images/logoSentado.png"
                    width={54}
                    height={54}
                    alt="DocSmart logo"
                />
                <span className={styles.logoText}>
                    Doc<span className={styles.logoAccent}>Smart</span>
                </span>
            </div>

            <nav className={styles.btns}>
                <button className={styles.btnGhost} onClick={() => router.push('/login')}>
                    Iniciar sesión
                </button>
                <button className={styles.btnSolid} onClick={() => router.push('/rol')}>
                    Registrarse
                </button>
            </nav>
        </header>
    );
}