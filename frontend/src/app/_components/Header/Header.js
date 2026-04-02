import styles from './Header.module.css';
import Image from 'next/image';
import Button from '../../../../components/ui/Button/Button';
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
                <Button size='sm'>Iniciar sesión</Button>
                <Button size='sm'>Registrase</Button>
            </div>
        </div>
    );
}