import Button from "../../../ui/Button/Button"
import styles from "./ProfileSidebar.module.css"
import Image from "next/image"
import { User, MailIcon,PhoneCall,UploadCloudIcon    } from "lucide-react"
export default function ProfileSidebar({perfil}){
    return(
        <div className={styles.containerSidebar}> 
            <div className={styles.fotoPerfil}>
                <Image width={100} height={100} alt="foto de perfil" src="/images/messias.jpg"/>
                <p className={styles.nombre}>{`${perfil.nombre ?? "Usuario"} ${perfil.apellido}`}</p>
                <p className={styles.rol}>{perfil.rol}</p>
                <Button variant="white">{<UploadCloudIcon/>}&nbsp;&nbsp;&nbsp;Cambiar foto</Button>
            </div>
            <div className={styles.infoProfile}>
                <div className={styles.itemList}>
                    <MailIcon/>
                    <p>{perfil.correo}</p>
                </div>
                <div className={styles.itemList}>
                    <PhoneCall/>
                    <p>{perfil.telefono}</p>
                </div>
                <div className={styles.itemList}>
                    <User/>
                    <p>{`${perfil.edad} años`}</p>                  
                </div>
            </div>
        </div> 
    )
}