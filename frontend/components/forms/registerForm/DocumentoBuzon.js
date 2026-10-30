'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Check, FileUp, X } from 'lucide-react'
import styles from './DocumentoBuzon.module.css'

// Carga en "buzón": cada imagen viaja a su casilla. Mientras el servidor lee el documento, un haz láser
// recorre las imágenes; al terminar se sellan en verde o se marcan en rojo.
const TIPOS = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 8 * 1024 * 1024
const RESORTE = { type: 'spring', stiffness: 420, damping: 24 }
const SALIDA = [0.23, 1, 0.32, 1]

const tamano = (bytes) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

function Casilla({ id, etiqueta, ayuda, archivo, onArchivo, estado, deshabilitado, error, reducido }) {
    const [vista, setVista] = useState(null)
    const [rechazo, setRechazo] = useState('')
    const [vibracion, setVibracion] = useState(0)
    const mensaje = rechazo || error

    useEffect(() => {
        if (!archivo) { setVista(null); return undefined }
        const url = URL.createObjectURL(archivo)
        setVista(url)
        return () => URL.revokeObjectURL(url)
    }, [archivo])

    // Un resultado negativo del servidor también hace vibrar la casilla.
    useEffect(() => { if (estado === 'error' && archivo) setVibracion(n => n + 1) }, [estado, archivo])

    const elegir = (evento) => {
        const nuevo = evento.target.files?.[0]
        evento.target.value = ''
        if (!nuevo) return
        if (!TIPOS.includes(nuevo.type) || !nuevo.size || nuevo.size > MAX_BYTES) {
            setRechazo('Solo JPG, PNG o WEBP · máx. 8 MB')
            setVibracion(n => n + 1)
            return
        }
        setRechazo('')
        onArchivo(nuevo)
    }

    const verificado = estado === 'verificado'
    const visual = archivo ? estado : (verificado ? 'verificado' : 'vacio')

    return <div className={styles.casilla} data-estado={visual} data-error={Boolean(mensaje)}>
        <input id={id} className={styles.entrada} type="file" accept={TIPOS.join(',')} disabled={deshabilitado} onChange={elegir}
            aria-label={etiqueta} aria-invalid={Boolean(mensaje)} aria-describedby={mensaje ? `${id}-error` : undefined} />

        <motion.div key={vibracion} className={styles.marco}
            animate={vibracion && !reducido ? { x: [0, -8, 7, -4, 2, 0] } : undefined} transition={{ duration: 0.44, ease: 'easeOut' }}>
            {archivo && vista
                ? <motion.div key={vista} className={styles.tarjeta}
                    initial={reducido ? { opacity: 0 } : { opacity: 0, y: -48, scale: 0.7, rotate: -5 }}
                    animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                    transition={reducido ? { duration: 0.15 } : RESORTE}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={vista} alt={`Vista previa: ${etiqueta}`} />
                    {estado === 'validando' && <>
                        <span className={styles.escaner} aria-hidden="true" />
                        {['sa', 'sb', 'ia', 'ib'].map(c => <motion.span key={c} className={`${styles.esquina} ${styles[c]}`} aria-hidden="true"
                            initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 1.5 }} animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, ease: SALIDA }} />)}
                    </>}
                </motion.div>
                : <label htmlFor={id} className={styles.vacio}>
                    {verificado ? <Check size={26} aria-hidden="true" /> : <FileUp size={26} aria-hidden="true" />}
                    <strong>{verificado ? 'Verificado' : etiqueta}</strong>
                    {!verificado && <small>{ayuda}</small>}
                </label>}

            {archivo && (estado === 'verificado' || estado === 'error') && <motion.span key={estado} className={styles.insignia} data-tipo={estado}
                initial={reducido ? { opacity: 0 } : { scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={reducido ? { duration: 0.2 } : { type: 'spring', stiffness: 460, damping: 17, delay: 0.1 }}>
                {estado === 'verificado' ? <Check size={17} strokeWidth={3} aria-hidden="true" /> : <X size={17} strokeWidth={3} aria-hidden="true" />}
            </motion.span>}
            {archivo && estado === 'verificado' && !reducido && <span className={styles.onda} aria-hidden="true" />}
        </motion.div>

        <div className={styles.pie}>
            <span className={styles.nombre}>{etiqueta}{archivo ? ` · ${tamano(archivo.size)}` : ''}</span>
            {archivo && !deshabilitado && <label htmlFor={id} className={styles.cambiar}>Cambiar</label>}
        </div>
        {mensaje && <p id={`${id}-error`} className={styles.error} role="alert">{mensaje}</p>}
    </div>
}

export default function DocumentoBuzon({ conReverso, frente, reverso, onFrente, onReverso, estado, deshabilitado, errorFrente, errorReverso }) {
    const reducido = useReducedMotion()
    const comunes = { estado, deshabilitado, reducido }
    return <div className={styles.buzon} role="group" aria-label="Imágenes del documento" data-dos={conReverso}>
        <div className={styles.casillas}>
            <Casilla {...comunes} id="documento-frente" etiqueta="Frente" ayuda="JPG, PNG o WEBP · máx. 8 MB" archivo={frente} onArchivo={onFrente} error={errorFrente} />
            {conReverso && <Casilla {...comunes} id="documento-reverso" etiqueta="Reverso" ayuda="JPG, PNG o WEBP · máx. 8 MB" archivo={reverso} onArchivo={onReverso} error={errorReverso} />}
        </div>
        <p className={styles.estado} role="status" aria-live="polite">
            {estado === 'validando' ? 'Leyendo tu documento…' : estado === 'verificado' ? 'Documento verificado' : ''}
        </p>
    </div>
}
