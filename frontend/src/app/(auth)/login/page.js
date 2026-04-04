import Image from "next/image"
import styles from "./login.module.css"
import LoginForm from "../../../../components/forms/loginForm/loginForm"
export default function login() {
    return (
        <div className={styles.mainLogin}>
            <div className={styles.container}>
                <div className={styles.logo}>
                    <Image src='/images/logoCara.png' width='100' height='100' alt="logo" />
                    <h1><span>Doc</span> Smart</h1>
                </div>
                <h2>Inicia sesión:</h2>
                <div className={styles.form}>
                    <LoginForm></LoginForm>
                </div>
            </div>
        </div>
    )
}