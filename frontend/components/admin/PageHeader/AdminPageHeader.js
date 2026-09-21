import styles from "./AdminPageHeader.module.css";

export default function AdminPageHeader({ eyebrow = "Administración", title, description, action }) {
    return (
        <header className={styles.header}>
            <div className={styles.copy}>
                <span className={styles.eyebrow}>{eyebrow}</span>
                <h1 className={styles.title}>{title}</h1>
                {description && <p className={styles.description}>{description}</p>}
            </div>
            {action && <div className={styles.action}>{action}</div>}
        </header>
    );
}
