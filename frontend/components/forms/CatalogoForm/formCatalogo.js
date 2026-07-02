"use client";

import styles from "./FormCatalogo.module.css";
import Input from "../../ui/Input/Input";
import Button from "../../ui/Button/Button";

export default function FormCatalogo({
    formData,
    handleChange,
    onSubmit,
    modoEdicion,
}) {
    return (
        <form onSubmit={onSubmit}>
            <div className={styles.containerForm}>
                <Input
                    placeholder="Nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    name="nombre"
                />

                <Button type="submit" size="sm">
                    {modoEdicion ? "Actualizar" : "Crear"}
                </Button>
            </div>
        </form>
    );
}