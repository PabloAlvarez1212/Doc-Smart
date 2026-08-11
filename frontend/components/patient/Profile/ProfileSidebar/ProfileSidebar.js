import Button from "../../../ui/Button/Button"
import styles from "./ProfileSidebar.module.css"
import Image from "next/image"
import { CakeIcon, MailIcon,PhoneCall,UploadCloudIcon    } from "lucide-react"
export default function ProfileSidebar(){
    return(
        <div className={styles.containerSidebar}> 
            <div className={styles.fotoPerfil}>
                <Image width={100} height={100} alt="foto de perfil" src="/images/messias.jpg"/>
                <p className={styles.nombre}>Pablos Alvarez</p>
                <p className={styles.rol}>Paciente</p>
                <Button variant="white">{<UploadCloudIcon/>}&nbsp;&nbsp;&nbsp;Cambiar foto</Button>
            </div>
            <div className={styles.infoProfile}>
                <div className={styles.itemList}>
                    <MailIcon/>
                    <p>pablo@gmail.com</p>
                </div>
                <div className={styles.itemList}>
                    <PhoneCall/>
                    <p>320982372</p>
                </div>
                <div className={styles.itemList}>
                    <CakeIcon/>
                    <p>25 novim 2007</p>                  
                </div>
            </div>
        </div> 
    )
}