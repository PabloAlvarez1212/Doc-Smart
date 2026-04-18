import styles from './layout.module.css'
import ParticlesBackground from '../../../components/ui/ParticlesBackground';
export default function LoginLayout({ children }) {
  return (
    <div className={styles.container}>
      <ParticlesBackground />
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}