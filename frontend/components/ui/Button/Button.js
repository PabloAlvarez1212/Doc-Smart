import styles from './Button.module.css'

export default function Button({
    type = "button",
    variant = "primary", // que diseño tendra, primary,danger,warning,secundary
    size = "md", // md(mediano), lg(largo), sm(pequeño)
    children, // contenido del boton
    className = "",
    disabled = false, // no permite que el boton se ejecute
    loading = false, // hace que el bton tenga una animacion de cargado mientras se realiza una accion
    onClick,
    ...rest // si se nos paso un promp lo podemos agregar
}) {
    //lista de las clases css
    const classes = [
        styles.btn,
        styles[variant],
        size !== "md" && styles[size],
        loading && styles.loading, // si loading es true agrega la clase, si no, no agrega nada
        className,
    ].filter(Boolean).join(" ");

    return (
        <button
            type={type}
            className={classes}
            disabled={disabled || loading}
            onClick={onClick}
            {...rest}
        >
            {loading ? (
                <>
                    <span className={styles.spinner}></span>
                    <span>Enviando...</span>
                </>
            ) : (
                children
            )}
        </button>
    );
}