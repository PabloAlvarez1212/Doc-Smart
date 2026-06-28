import styles from "./formCatalogo.module.css"
import Input from "../../ui/Input/Input"
import Button from "../../ui/Button/Button"
import SelectSearch from "../../ui/SelectSearch/SelectSearch"
export default function FormCiudad({ formData, departamentos, handleChange, onSubmit, titulo }) {
    const opcionesDepartamentos = departamentos.map(dep => ({
        value: dep.id,
        label: dep.nombre
    }))

    return (
        <form onSubmit={onSubmit}>
            <h1 className={styles.title}>{titulo}</h1>
            <div className={styles.containerForm}>
                <SelectSearch
                    opciones={opcionesDepartamentos}
                    value={formData.departamento_id}
                    onChange={(id) => handleChange({ target: { name: 'departamento_id', value: id } })}
                    placeholder="Buscar departamento"
                    className={styles.containerSelect}
                />
                <Input placeholder="Nombre" value={formData.nombre}
                    onChange={handleChange} name="nombre"
                />
                <Button type="submit" size="sm">Crear</Button>
            </div>
        </form>
    )
}