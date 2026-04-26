"use client";
import { useRouter } from "next/navigation";
import Styles from "./Footer.module.css"
import Button from "../../../../components/ui/Button/Button"
export default function Footer(){
    const router = useRouter();
    const navigateLogin = () => {
        router.push('/login')
    }
    return(
        <div className={Styles.container}>
            <div className={Styles.footer}>
                <h2 className={Styles.tittle}>¿Listo para comenzar?</h2>
            </div>
            <div className={Styles.footerText}>
                <p>Únete a miles de profesionales y pacientes que confían en DocSmart</p>
            </div>
            <Button variant="secundary" onClick={navigateLogin}>Acceder a la plataforma</Button>

        </div>

    )
        
}