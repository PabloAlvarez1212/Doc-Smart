'use client'

import styles from './CapaRostro.module.css'

// Con la malla, el servidor entrega los puntos agrupados ([inicio, fin) por grupo). Las líneas solo unen puntos
// consecutivos reales de cada grupo; no se agrega ninguno.
const CERRADOS = ['ojo_derecho', 'ojo_izquierdo']
const ABIERTOS = ['ceja_derecha', 'ceja_izquierda', 'contorno']
// Sin malla solo hay 5 puntos del detector: ojo derecho, ojo izquierdo, nariz, comisura derecha, comisura izquierda.
const UNIONES_BASICAS = [[0, 1], [3, 4], [2, 3], [2, 4]]

const cadena = pts => pts.map(([x, y]) => `${x},${y}`).join(' ')

/**
 * Dibuja sobre una imagen los puntos del rostro que detectó el servidor. Las coordenadas vienen en el sistema de
 * la imagen analizada (`ancho` x `alto`); el SVG usa esas mismas medidas como viewBox, por lo que coincide con la
 * imagen aunque cambie de tamaño. Con `espejo` se voltea igual que el video de la cámara. Los puntos son apoyo
 * visual: no indican que la persona esté verificada.
 */
export default function CapaRostro({ ancho, alto, rostro, tono = 'neutro', espejo = false, className = '' }) {
    if (!ancho || !alto || !rostro?.caja) return null
    const puntos = rostro.puntos || []
    const grupos = rostro.grupos
    const malla = Boolean(grupos) && puntos.length > 5
    const [x, y, w, h] = rostro.caja
    const clases = `${styles.capa} ${styles[tono] || ''} ${espejo ? styles.espejo : ''} ${malla ? styles.malla : ''} ${className}`

    return <svg className={clases} viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        {malla ? <>
            {CERRADOS.map(g => <polygon key={g} className={styles.linea} points={cadena(puntos.slice(...grupos[g]))} />)}
            {ABIERTOS.map(g => <polyline key={g} className={styles.linea} points={cadena(puntos.slice(...grupos[g]))} />)}
            <polygon className={styles.linea} points={cadena(puntos.slice(grupos.boca[0], grupos.boca[0] + 4))} />
            <polyline className={styles.linea} points={cadena(puntos.slice(grupos.nariz[0], grupos.nariz[0] + 3))} />
        </> : <>
            <g className={styles.mover} style={{ transform: `translate(${x + w / 2}px, ${y + h / 2}px)` }}>
                <ellipse className={styles.ovalo} rx={w / 2} ry={h / 2 * 1.08} />
            </g>
            {puntos.length === 5 && UNIONES_BASICAS.map(([a, b]) => <line key={`${a}-${b}`} className={styles.union}
                x1={puntos[a][0]} y1={puntos[a][1]} x2={puntos[b][0]} y2={puntos[b][1]} />)}
        </>}
        {puntos.map(([px, py], i) => <line key={i} className={styles.punto} x1={px} y1={py} x2={px} y2={py} />)}
    </svg>
}
