"use client";
import { motion, useReducedMotion } from 'motion/react';
import { LoaderCircle, CircleAlert } from 'lucide-react';
import styles from './VerificationStatus.module.css';
export default function VerificationStatus({ state = { kind: 'idle', message: '', revision: 0 } }) {
 const reduced = useReducedMotion();
 return <div className={styles.region} role="status" aria-live="polite" aria-atomic="true">{state.message && <motion.div key={`${state.kind}-${state.revision}`} className={`${styles.notice} ${styles[state.kind] || ''}`} initial={{opacity:state.kind === "pending" ? 1 : 0}} animate={{opacity:1,x:state.kind==='error'&&!reduced?[0,-3,3,-2,0]:0}} exit={{opacity:0}} transition={{duration:reduced?0:.22}}>
 {state.kind==='pending'?<LoaderCircle className={styles.spinner} size={22} aria-hidden="true"/>:state.kind==='error'?<CircleAlert size={22} aria-hidden="true"/>:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor"/><motion.path d="m7 12 3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:reduced?0:.24}}/></svg>}
 <span>{state.message}</span></motion.div>}</div>
}
