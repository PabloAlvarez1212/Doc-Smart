import Image from "next/image";
import styles from "./AppointmentsList.module.css";
import { Clock12Icon } from "lucide-react";
import Button from "../../../ui/Button/Button";
export default function AppointmentsList() {

    return (
        <div className={styles.containerMain}>
            <div className={styles.header}>
                <h2>Próximas Citas</h2>
                <Button className={styles.btn} size="sm">Ver más &nbsp;&nbsp;&gt;</Button>
            </div>
            <div className={styles.containerCards}>
                <div className={styles.card}>
                    <div className={styles.container}>
                        <Image src="/images/doctor3.jpg" width={120} height={100} alt="foto de perfil" />
                        <div className={styles.description}>
                            <h3>Dra. María González</h3>
                            <p>Medicina General</p>
                            <div className={styles.schedule}>
                                <Clock12Icon size={20} />
                                <p>25 Jul</p>
                                <p>2:00 pm</p>
                            </div>
                        </div>
                    </div>
                    <p className={styles.estados}>Confirmada</p>
                </div>
                <div className={styles.card}>
                    <div className={styles.container}>
                        <Image src="/images/doctora1.jpg" width={120} height={100} alt="foto de perfil" />
                        <div className={styles.description}>
                            <h3>Dra. María González</h3>
                            <p>Medicina General</p>
                            <div className={styles.schedule}>
                                <Clock12Icon size={20} />
                                <p>25 Jul</p>
                                <p>2:00 pm</p>
                            </div>
                        </div>
                    </div>
                    <p className={styles.estados}>Confirmada</p>
                </div>
                <div className={styles.card}>
                    <div className={styles.container}>
                        <Image src="/images/doctora2.png" width={120} height={100} alt="foto de perfil" />
                        <div className={styles.description}>
                            <h3>Dra. María González</h3>
                            <p>Medicina General</p>
                            <div className={styles.schedule}>
                                <Clock12Icon size={20} />
                                <p>25 Jul</p>
                                <p>2:00 pm</p>
                            </div>
                        </div>
                    </div>
                    <p className={styles.estados}>Confirmada</p>
                </div>
            </div>
        </div>
    )
}