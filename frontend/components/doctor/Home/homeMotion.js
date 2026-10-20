"use client";

import { motion, useReducedMotion } from 'motion/react';

// One shared entrance and response language for this route.
export function HomeReveal({ children, className, delay = 0 }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { y: 8 }}
      animate={{ y: 0 }}
      transition={{ duration: reduced ? 0 : 0.28, delay: reduced ? 0 : delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
