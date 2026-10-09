"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { MotionConfig } from "motion/react";
const ThemeContext = createContext(null);
export default function ThemeProvider({
  children
}) {
  const [preference, setPreference] = useState('system');
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    let current = 'system';
    try {
      const saved = localStorage.getItem('docsmart-theme');
      if (['light', 'dark', 'system'].includes(saved)) current = saved;
    } catch {}
    const apply = value => {
      current = value;
      setPreference(value);
      const theme = value === 'system' ? media.matches ? 'dark' : 'light' : value;
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    };
    apply(current);
    const systemChange = () => {
      if (current === 'system') apply(current);
    };
    const storageChange = e => {
      if (e.key === 'docsmart-theme' || e.key === null) apply(['light', 'dark', 'system'].includes(e.newValue) ? e.newValue : 'system');
    };
    const themeChange = e => apply(e.detail);
    media.addEventListener('change', systemChange);
    window.addEventListener('storage', storageChange);
    window.addEventListener('docsmart:theme', themeChange);
    return () => {
      media.removeEventListener('change', systemChange);
      window.removeEventListener('storage', storageChange);
      window.removeEventListener('docsmart:theme', themeChange);
    };
  }, []);
  function changeTheme(value) {
    if (!['light', 'dark', 'system'].includes(value)) return;
    setPreference(value);
    try {
      localStorage.setItem('docsmart-theme', value);
    } catch {}
    const apply = () => window.dispatchEvent(new CustomEvent('docsmart:theme', {
      detail: value
    }));
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(apply);
    } else {
      apply();
    }
  }
  return <ThemeContext.Provider value={{
    preference,
    changeTheme
  }}><MotionConfig reducedMotion="user">{children}</MotionConfig></ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
