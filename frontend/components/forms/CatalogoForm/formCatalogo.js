"use client"
import styles from "./formCatalogo.module.css"
import Input from "../../ui/Input/Input"
import Button from "../../ui/Button/Button"

export default function FormCatalogo({ formData, handleChange, onSubmit, titulo }) {
    return (
        <form onSubmit={onSubmit}>
            <h1 className={styles.title}>{titulo}</h1>
            <div className={styles.containerForm}>
                <Input placeholder="Nombre" value={formData.nombre}
                    onChange={handleChange} name="nombre"
                />
                <Button type="submit" size="sm">Crear</Button>
            </div>
        </form>
    )
}