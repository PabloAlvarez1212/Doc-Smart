"use client";

import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import home from '../home.module.css';
import styles from './Hero.module.css';

export default function InstallButton() {
  const installPrompt = useRef(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)');
    const syncDisplayMode = () => setInstalled(standalone.matches || navigator.standalone === true);
    const capturePrompt = (event) => {
      event.preventDefault();
      installPrompt.current = event;
    };
    const markInstalled = () => {
      installPrompt.current = null;
      setInstalled(true);
    };

    syncDisplayMode();
    standalone.addEventListener('change', syncDisplayMode);
    window.addEventListener('beforeinstallprompt', capturePrompt);
    window.addEventListener('appinstalled', markInstalled);
    return () => {
      standalone.removeEventListener('change', syncDisplayMode);
      window.removeEventListener('beforeinstallprompt', capturePrompt);
      window.removeEventListener('appinstalled', markInstalled);
    };
  }, []);

  async function install() {
    const prompt = installPrompt.current;
    if (!prompt) {
      setShowHelp((visible) => !visible);
      return;
    }

    installPrompt.current = null;
    setInstalling(true);
    setShowHelp(false);
    try {
      await prompt.prompt();
    } catch {
      setShowHelp(true);
    } finally {
      setInstalling(false);
    }
  }

  if (installed) return null;

  return (
    <>
      <button type="button" className={home.soft} onClick={install} disabled={installing}
        aria-expanded={showHelp} aria-controls="docsmart-install-help">
        <Download size={18} aria-hidden="true" /> Instalar DocSmart
      </button>
      <p id="docsmart-install-help" className={styles.installHelp} hidden={!showHelp}>
        Abre el menú del navegador y elige <strong>Instalar aplicación</strong> o{' '}
        <strong>Añadir a pantalla de inicio</strong>. En Safari para iPhone, busca la opción en <strong>Compartir</strong>.
      </p>
    </>
  );
}
