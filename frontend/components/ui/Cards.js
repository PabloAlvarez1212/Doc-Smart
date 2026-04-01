import Image from "next/image";
export default function Cards({ padding,image, description, title, widthImage, heightImage, fontSizeh3, fontSizeP, widthContainer, heightContainer,witdhText = '30rem' }) {
    const styles = {
        container: {
            display: 'flex',
            flexDirection: 'column',
            border: '2px solid black',
            width: widthContainer,
            height: heightContainer,
            alignItems: 'center'   ,
            gap: '1.5rem',
            borderRadius: '15px',
            padding: padding
        },
        containerImage: {
            width: widthImage,
            height: heightImage
        },
        titleDescription: {
            fontSize: fontSizeh3
        },
        p: {
            fontSize: fontSizeP,
            width: witdhText
        },
    }
    return (
        <div style={styles.container}>
            {image &&
                <Image
                    src={image}
                    alt={title}
                    width={100}
                    height={100}
                />
            }
            <h3 style={styles.titleDescription}>{title}</h3>
            <p style={styles.p}>{description}</p>
        </div>
    );

}