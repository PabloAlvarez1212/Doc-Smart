"use client";

import { Sun, Moon, Monitor } from 'lucide-react';
import { useId } from 'react';
import { useTheme } from './ThemeProvider';
import styles from './ThemeSelector.module.css';
export default function ThemeSelector() {
  const {
    preference,
    changeTheme
  } = useTheme();
  const id = useId();
  return <fieldset className={styles.selector}><legend className={styles.legend}>Apariencia</legend>{[['light', 'Claro', Sun], ['dark', 'Oscuro', Moon], ['system', 'Sistema', Monitor]].map(([value, label, Icon]) => <label key={value} className={styles.option}><input type="radio" name={id} value={value} checked={preference === value} onChange={() => changeTheme(value)} /><span><Icon size={16} aria-hidden="true" />{label}</span></label>)}</fieldset>;
}
