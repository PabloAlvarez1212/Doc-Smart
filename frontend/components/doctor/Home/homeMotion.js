"use client";

import { motion, useReducedMotion } from 'motion/react';

// One shared entrance and response language for this route.
export function HomeReveal({ children, className, delay = 0 }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 18, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
      transition={reduced ? { duration: 0 } : { type: 'spring', bounce: 0.2, visualDuration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
}
