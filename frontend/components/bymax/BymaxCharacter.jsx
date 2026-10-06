"use client";
import { memo, useEffect, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { AlertCircle, AudioLines, LoaderCircle, Mic, WifiOff } from "lucide-react";
import styles from "./BymaxAssistant.module.css";

const poses = {
  listening: "translateY(-2px) rotate(-2deg)",
  speaking: "translateY(-1px) rotate(1deg)",
  processing: "translateY(0px) rotate(-1deg)",
  recovering: "translateY(-2px) rotate(0deg)",
};
const icons = { error: AlertCircle, disconnected: WifiOff, listening: Mic, speaking: AudioLines, processing: LoaderCircle, recovering: LoaderCircle };

// One static asset: move the whole figure, with a separate, truthful state indicator.
export default memo(function BymaxCharacter({ status, paused = false, compact = false }) {
  const reduce = useReducedMotion();
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  const inactive = paused || hidden;
  const Icon = icons[status];
  return <span className={`${styles.character} ${compact ? styles.characterCompact : ""}`} data-state={status} data-paused={inactive} aria-hidden="true">
    <motion.span className={styles.characterFigure} initial={false}
      animate={{ transform: reduce || inactive ? "none" : poses[status] || "translateY(0px) rotate(0deg)" }}
      transition={{ duration: reduce || inactive ? 0 : .22, ease: [.23, 1, .32, 1] }}>
      <Image src="/icons/asistente_bymax.png" alt="" width={compact ? 48 : 326} height={compact ? 48 : 326} draggable={false}/>
    </motion.span>
    {Icon && <span className={styles.characterIndicator}><Icon size={compact ? 11 : 14}/></span>}
  </span>;
});
