import styles from './layout.module.css'
export default function LoginLayout({ children }) {
  return (
    <div className={styles.background}>
      {children}
    </div>
  );
}