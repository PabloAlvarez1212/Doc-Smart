import Select from 'react-select'
import styles from "./SelectSearch.module.css"
export default function SelectSearch({ opciones, value, onChange, placeholder }) {
    const valorSeleccionado = opciones.find(op => op.value === value) || null

    return (
        <div style={{ width: '30%' }}>
            <Select
                options={opciones}
                value={valorSeleccionado}
                onChange={(opcion) => onChange(opcion ? opcion.value : '')}
                placeholder={placeholder}
                isClearable
                noOptionsMessage={() => "No se encontró"}
                className={styles.select}
            />
        </div >
    )
}