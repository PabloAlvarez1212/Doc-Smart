import Select from "react-select";
import styles from "./SelectSearch.module.css";

export default function SelectSearch({
    opciones = [],
    value = "",
    onChange = () => {},
    placeholder = "Seleccionar",
    className = "",
    inputId,
    ariaLabel,
    disabled = false,
    emptyMessage = "No hay opciones disponibles",
}) {
    const valorSeleccionado = opciones.find((option) => option.value === value) || null;

    return (
        <div className={`${styles.wrapper} ${className}`}>
            <Select
                options={opciones}
                value={valorSeleccionado}
                onChange={(opcion) => onChange(opcion?.value ?? "")}
                placeholder={placeholder}
                inputId={inputId}
                aria-label={ariaLabel}
                isDisabled={disabled}
                isClearable
                isSearchable
                unstyled
                maxMenuHeight={224}
                menuPlacement="auto"
                menuShouldScrollIntoView={false}
                noOptionsMessage={() => emptyMessage}
                className={styles.select}
                classNamePrefix="select-search"
            />
        </div>
    );
}
