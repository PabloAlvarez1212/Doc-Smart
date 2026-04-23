"use client";

import styles from './Header.module.css';
import Image from 'next/image';
import Button from '../../../../components/ui/Button/Button';
import { useRouter } from 'next/navigation';

export default function Header() {
    const router = useRouter();

    const handleLoginClick = () => {
        router.push('/login');
    };

    const handleRegisterClick = () => {
        router.push('/rol');
    };

    return (
        <div className={styles.containerMain}>
            <div className={styles.logo}>
                <Image
                    src="/images/logoSentado.png"
                    width={100}
                    height={100}
                    alt='logo'
                />
                <h2><span>Doc</span>Smart</h2>
            </div>

            <div className={styles.btns}>
                <Button size='sm' onClick={handleLoginClick}>
                    Iniciar sesión
                </Button>

                <Button 
                    size='sm'
                    variant="primary"
                    onClick={handleRegisterClick}
                >
                    Registrarse
                </Button>
            </div>
        </div>
    );
}