"use client";

import styles from "./FormCatalogo.module.css";
import Input from "../../ui/Input/Input";
import Button from "../../ui/Button/Button";

export default function FormCatalogo({
    formData,
    handleChange,
    onSubmit,
    modoEdicion,
    guardando = false,
}) {
    return (
        <form onSubmit={onSubmit} className={styles.form}>
            <div className={styles.containerForm}>
                <label htmlFor="catalog-name">Nombre</label>
                <Input
                    id="catalog-name"
                    placeholder="Escribe un nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    name="nombre"
                />

                <Button type="submit" size="sm" loading={guardando}>
                    {modoEdicion ? "Actualizar" : "Crear"}
                </Button>
            </div>
        </form>
    );
}
