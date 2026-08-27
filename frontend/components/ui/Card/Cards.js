import Image from "next/image";
import styles from "./card.module.css"
export default function Cards(
    {
        variant = 'default', //primary,second
        className = '',
        image,
        icono,
        description,
        title,
        layout = 'vertical', //vertical,horizontal
        align = 'center', //center,left,right
    }
) {
    return (
        <div className={`${styles.containerCard} ${styles[layout]} ${styles[align]} ${className}`}>
            {variant === 'default' && (
                <>
                    {image ? (
                        <Image width={150} height={150} alt={title} src={image} />
                    ): icono}
                    <h2>{title}</h2>
                    <p>{description}</p>
                </>
            )}
            {variant === 'compact' && (
                <>
                    {title && (
                        <h2>{title}</h2>
                    )}
                    <p>{description}</p>
                </>
            )}
        </div>
    )
}