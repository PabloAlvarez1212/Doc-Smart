import Button from "../../ui/Button/Button";
import Input from "../../ui/Input/Input";
import styles from "./loginForm.module.css";
export default function LoginForm(){
    return(
        <form className={styles.formLogin}>
            <Input type="email" placeholder="Correo:" name="email" id="email" className={styles.input}/>
            <Input type="password" placeholder="Contraseña:" name="password" id="password" className={styles.input}/>
            <Button type="submit" className={styles.btn} >Entrar</Button>
        </form>
    )
}