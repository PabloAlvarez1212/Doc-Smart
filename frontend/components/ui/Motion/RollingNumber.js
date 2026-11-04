"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import styles from "./RollingNumber.module.css";

const variants = {
    enter: (direction) => ({ y: `${direction * 80}%`, opacity: 0, filter: "blur(2px)" }),
    center: { y: 0, opacity: 1, filter: "blur(0px)" },
    exit: (direction) => ({ y: `${direction * -80}%`, opacity: 0, filter: "blur(2px)" }),
};

// Cambia el número con un giro corto: sube cuando aumenta y baja cuando disminuye.
export default function RollingNumber({ value, className = "" }) {
    const reduced = useReducedMotion();
    const [previo, setPrevio] = useState({ value, direction: 1 });

    if (previo.value !== value) {
        setPrevio({ value, direction: Number(value) >= Number(previo.value) ? 1 : -1 });
    }

    return (
        <span className={`${styles.roll} ${className}`}>
            <AnimatePresence initial={false} custom={previo.direction} mode="popLayout">
                <motion.span
                    key={value}
                    custom={previo.direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={reduced ? { duration: 0 } : { type: "spring", bounce: 0.3, visualDuration: 0.38 }}
                >
                    {value}
                </motion.span>
            </AnimatePresence>
        </span>
    );
}
