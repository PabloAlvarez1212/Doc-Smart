import Styles from "./Footer.module.css"

export default function Footer(){
    return(
        <div className={Styles.container}>
            <div className={Styles.footer}>
                <h2 className={Styles.tittle}>¿Listo para comenzar?</h2>
            </div>
            <div className={Styles.footerText}>
                <p>Únete a miles de profesionales y pacientes que confían en DocSmart</p>
            </div>
            <button className={Styles.footerBtn}>
                Acceder a la plataforma
            </button>

        </div>

    )
        
}