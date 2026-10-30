'use client'

import { motion, useReducedMotion } from 'motion/react'
import { Focus, RefreshCw, ShieldCheck, ShieldX, Sun, UserRound } from 'lucide-react'
import Button from '../../ui/Button/Button'
import MarcasRadiales from './MarcasRadiales'
import { INSTRUCCIONES } from './usePrevisualizacionFacial'
import styles from './IntentoFallido.module.css'

// Curvas del proyecto: salida fuerte para lo que entra, resorte corto para lo que "golpea".
const SALIDA = [0.23, 1, 0.32, 1]

// Problemas de la captura (no de la identidad): se repiten sin gastar uno de los intentos de comparación.
const CALIDAD = new Set([
    'sin_rostro', 'varios_rostros', 'rostro_cortado', 'rostro_pequeno', 'rostro_grande',
    'rostro_a_la_izquierda', 'rostro_a_la_derecha', 'rostro_arriba', 'rostro_abajo',
    'inclinado', 'no_frontal', 'cabeza_levantada', 'cabeza_baja',
    'luz_baja', 'luz_excesiva', 'luz_desigual', 'mala_iluminacion', 'imagen_borrosa', 'posible_oclusion', 'alineacion_dudosa',
    'sin_movimiento', 'pocos_fotogramas',
])

// Título de cada caso; la indicación concreta es la que envía el servidor (con la dirección vista en el espejo
// para los desplazamientos, que se resuelve en la guía en vivo).
const DESPLAZADO = ['Rostro fuera de posición', 'Céntralo dentro del óvalo y vuelve a intentarlo.']
const TEXTOS = {
    no_coincide: ['No coincidió esta vez', 'Tu rostro no coincide con la foto de tu documento.'],
    similitud_baja: ['Casi lo logramos', 'No pudimos confirmar tu identidad con esa captura.'],
    sin_rostro: ['No alcanzamos a verte', 'Asegúrate de que tu rostro esté dentro del óvalo.'],
    varios_rostros: ['Aparecen varias personas', 'Debes estar solo frente a la cámara.'],
    rostro_cortado: ['Tu rostro queda cortado', 'Céntralo dentro de la imagen, sin salir por los bordes.'],
    rostro_pequeno: ['Estás un poco lejos', 'Acércate un poco más a la cámara.'],
    rostro_grande: ['Estás muy cerca', 'Aléjate un poco de la cámara.'],
    rostro_a_la_izquierda: DESPLAZADO,
    rostro_a_la_derecha: DESPLAZADO,
    rostro_arriba: DESPLAZADO,
    rostro_abajo: DESPLAZADO,
    inclinado: ['Cabeza inclinada', 'Mantén la cabeza recta, sin inclinarla hacia un lado.'],
    no_frontal: ['Mira de frente', 'Gira la cabeza hacia la cámara, sin mirar a un lado.'],
    cabeza_levantada: ['Cabeza muy levantada', 'Baja un poco la barbilla y mira de frente.'],
    cabeza_baja: ['Cabeza muy baja', 'Levanta un poco la barbilla y mira de frente.'],
    luz_baja: ['Falta luz', 'Busca un lugar más iluminado, con la luz frente a ti.'],
    luz_excesiva: ['Demasiada luz', 'Evita ventanas, focos o brillos directos detrás de ti.'],
    luz_desigual: ['La luz cae de un lado', 'Busca una luz suave y uniforme de frente.'],
    mala_iluminacion: ['Falta luz uniforme', 'Busca un lugar con luz suave frente a ti.'],
    imagen_borrosa: ['La imagen salió borrosa', 'Mantén el dispositivo firme y vuelve a intentarlo.'],
    posible_oclusion: ['Algo cubre tu rostro', 'Quita gafas oscuras, mascarilla o gorra y vuelve a intentarlo.'],
    sin_movimiento: ['Necesitamos ver que eres tú en vivo', 'Mueve ligeramente la cabeza mientras se toma la captura, sin dejar de mirar la cámara.'],
    pocos_fotogramas: ['Faltaron imágenes claras', 'Busca buena luz y vuelve a capturar; no cuenta como intento.'],
    alineacion_dudosa: ['No ubicamos bien tus rasgos', 'Mira de frente, con el rostro completo visible y sin nada que lo cubra.'],
}

const CONSEJOS = [
    [Sun, 'Luz suave de frente'],
    [UserRound, 'Sin gorra ni gafas oscuras'],
    [Focus, 'Rostro dentro del óvalo'],
]

function Escudo({ perdido, nuevo, reducido }) {
    return <motion.span className={`${styles.escudo} ${perdido ? styles.escudoPerdido : ''}`}
        animate={nuevo && !reducido ? { rotate: [0, -14, 12, -6, 0], scale: [1, 1.22, 0.9, 1] } : undefined}
        transition={{ duration: 0.55, delay: 0.7, ease: 'easeOut' }}>
        {nuevo ? <>
            <motion.span className={styles.capa} animate={{ opacity: [1, 1, 0] }} transition={{ duration: 0.6, delay: 0.7, times: [0, 0.6, 1] }}>
                <ShieldCheck size={19} aria-hidden="true" />
            </motion.span>
            <motion.span className={styles.capa} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 1.0 }}>
                <ShieldX size={19} aria-hidden="true" />
            </motion.span>
        </> : perdido
            ? <ShieldX size={19} aria-hidden="true" />
            : <ShieldCheck size={19} aria-hidden="true" />}
    </motion.span>
}

export default function IntentoFallido({ fallo, onReintentar, ocupado }) {
    const reducido = useReducedMotion()
    const { codigo, restantes, perdidos, mensaje } = fallo
    const calidad = CALIDAD.has(codigo)
    const [titulo, cuerpoBase] = TEXTOS[codigo] || ['No pudimos completar la verificación', mensaje]
    // Los desplazamientos se dicen desde el espejo de la cámara, igual que en la guía en vivo.
    const cuerpo = (TEXTOS[codigo] === DESPLAZADO && INSTRUCCIONES[codigo]) || cuerpoBase
    const total = restantes == null ? 0 : perdidos + restantes

    return <motion.div
        className={`${styles.card} ${calidad ? styles.suave : styles.perdido}`}
        role="status" aria-live="polite"
        initial={reducido ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={reducido ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 26 }}
    >
        <MarcasRadiales className={styles.escena} estado={calidad ? 'calidad' : 'bad'} persona insignia={calidad ? 'info' : 'bad'} />

        <motion.div className={styles.textos}
            initial={reducido ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: reducido ? 0 : 0.3, ease: SALIDA }}>
            <h4>{titulo}</h4>
            <p>{cuerpo}</p>
        </motion.div>

        {total > 0 && <motion.div className={styles.intentos}
            initial={reducido ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: reducido ? 0 : 0.4, ease: SALIDA }}>
            <div className={styles.escudos} aria-hidden="true">
                {Array.from({ length: total }, (_, i) => {
                    const perdido = i < perdidos
                    return <Escudo key={i} perdido={perdido} nuevo={perdido && i === perdidos - 1 && !calidad} reducido={reducido} />
                })}
            </div>
            <p>
                {calidad
                    ? <>Esta captura <strong>no cuenta</strong> como intento.</>
                    : restantes > 0
                        ? <>Te {restantes === 1 ? 'queda' : 'quedan'} <strong>{restantes}</strong> de {total} intentos.</>
                        : <>Agotaste tus intentos.</>}
            </p>
        </motion.div>}

        <motion.ul className={styles.consejos} initial="oculto" animate="visible"
            variants={{ oculto: {}, visible: { transition: { staggerChildren: reducido ? 0 : 0.06, delayChildren: reducido ? 0 : 0.5 } } }}>
            {CONSEJOS.map(([Consejo, texto]) => <motion.li key={texto}
                variants={{ oculto: reducido ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.94 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.24, ease: SALIDA } } }}>
                <Consejo size={15} aria-hidden="true" />{texto}
            </motion.li>)}
        </motion.ul>

        <Button type="button" variant="primary" onClick={onReintentar} disabled={ocupado} autoFocus className={styles.reintentar}>
            <RefreshCw size={17} aria-hidden="true" /> Intentar de nuevo
        </Button>
    </motion.div>
}
