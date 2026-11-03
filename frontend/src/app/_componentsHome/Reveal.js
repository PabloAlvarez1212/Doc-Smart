"use client";

import { MotionConfig, motion } from "motion/react";

// Respeta la preferencia de reducir movimiento en todo el inicio.
export function HomeMotion({ children }) {
    return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

// Aparece al entrar en pantalla, una sola vez.
export default function Reveal({ as = "div", delay = 0, children, ...props }) {
    const Component = motion[as];

    return (
        <Component
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1], delay }}
            {...props}
        >
            {children}
        </Component>
    );
}
