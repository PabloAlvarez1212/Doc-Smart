'use client'

import { motion, useReducedMotion } from 'motion/react'
import styles from './MarcasRadiales.module.css'

// Estilo "desbloqueo facial": una corona de marcas alrededor del rostro que se enciende y reacciona.
// estados: idle · escaneando · ok · bad · calidad · ultimo
const SALIDA = [0.23, 1, 0.32, 1]
const RESORTE = { type: 'spring', stiffness: 460, damping: 17 }

const FORMAS = {
    circulo: { w: 160, h: 140, cx: 80, cy: 70, rx: 54, ry: 54, n: 48, sep: 3, largo: 8 },
    ovalo: { w: 400, h: 300, cx: 200, cy: 150, rx: 92, ry: 119, n: 64, sep: 10, largo: 16 },
}

const PARTICULAS = Array.from({ length: 10 }, (_, i) => {
    const angulo = (i / 10) * Math.PI * 2 + 0.3
    const radio = 46 + (i % 3) * 8
    return { x: Math.cos(angulo) * radio, y: Math.sin(angulo) * radio, r: 2 + (i % 3) * 0.7 }
})

const INSIGNIAS = {
    ok: ['var(--ink-green)', 'M115.5 108 l5 5 8-9.5'],
    bad: ['var(--ink-red)', 'M117 103 L127 113 M127 103 L117 113'],
    info: ['var(--color-dark)', 'M122 107 V114 M122 101.6 V102.2'],
    warn: ['var(--ink-orange)', 'M122 101 V110 M122 114.2 V114.8'],
}

// Se redondea para que el servidor y el navegador produzcan exactamente el mismo HTML.
const r2 = (n) => Math.round(n * 100) / 100

function calcularMarcas(forma) {
    return Array.from({ length: forma.n }, (_, i) => {
        const a = (i / forma.n) * Math.PI * 2 - Math.PI / 2
        // La marca sale perpendicular al contorno, también cuando el contorno es un óvalo.
        const nx = Math.cos(a) / forma.rx
        const ny = Math.sin(a) / forma.ry
        const norma = Math.hypot(nx, ny)
        const ux = nx / norma
        const uy = ny / norma
        const px = forma.cx + forma.rx * Math.cos(a)
        const py = forma.cy + forma.ry * Math.sin(a)
        return {
            i, g: i % 12,
            x1: r2(px + ux * forma.sep), y1: r2(py + uy * forma.sep),
            x2: r2(px + ux * (forma.sep + forma.largo)), y2: r2(py + uy * (forma.sep + forma.largo)),
            dx: r2(ux * forma.largo * 1.8), dy: r2(uy * forma.largo * 1.8),
        }
    })
}

const MARCAS = { circulo: calcularMarcas(FORMAS.circulo), ovalo: calcularMarcas(FORMAS.ovalo) }

export default function MarcasRadiales({ estado = 'idle', forma = 'circulo', persona = false, insignia = null, className = '' }) {
    const reducido = useReducedMotion()
    const f = FORMAS[forma]
    const [color, trazo] = INSIGNIAS[insignia] || []

    return <svg className={`${styles.marcas} ${className}`} data-estado={estado} viewBox={`0 0 ${f.w} ${f.h}`}
        role="img" aria-hidden="true" focusable="false">
        {MARCAS[forma].map(m => <line key={m.i} className={styles.marca} x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2}
            style={{ '--i': String(m.i), '--g': String(m.g), '--dx': `${m.dx}px`, '--dy': `${m.dy}px` }} />)}

        {persona && <g className={styles.persona}>
            <circle cx="80" cy="58" r="13" />
            <path d="M54 108 Q80 72 106 108" />
        </g>}

        {!reducido && estado === 'ok' && <motion.circle key="onda-ok" cx={f.cx} cy={f.cy} r={f.rx + 6} className={styles.onda}
            initial={{ scale: 0.7, opacity: 0.7 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ duration: 0.8, delay: 0.3, ease: SALIDA }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />}

        {!reducido && estado === 'bad' && forma === 'circulo' && <g key="chispas">
            <motion.circle cx={f.cx} cy={f.cy} r="30" className={styles.onda}
                initial={{ scale: 0.5, opacity: 0.7 }} animate={{ scale: 2.1, opacity: 0 }} transition={{ duration: 0.8, delay: 0.3, ease: SALIDA }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
            {PARTICULAS.map((p, i) => <motion.circle key={i} cx={f.cx} cy={f.cy} r={p.r} className={styles.particula}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }} animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
                transition={{ duration: 0.7, delay: 0.32, ease: SALIDA }} />)}
        </g>}

        {insignia && forma === 'circulo' && <motion.g key={insignia}
            initial={reducido ? { opacity: 0 } : { scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={reducido ? { duration: 0.2 } : { ...RESORTE, delay: 0.35 }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
            <circle cx="122" cy="108" r="14" style={{ fill: color }} />
            <path d={trazo} className={styles.signo} />
        </motion.g>}
    </svg>
}
