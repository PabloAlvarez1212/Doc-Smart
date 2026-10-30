'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import styles from './OtpInput.module.css'

// Curvas del proyecto: salida fuerte para lo que entra y un resorte con rebote para el "clic" del candado.
const SALIDA = [0.23, 1, 0.32, 1]
const REBOTE = [0.34, 1.56, 0.64, 1]
const SEPARACION = 52 // ancho de casilla + espacio, para que se recojan hacia el centro

const SACUDIDA = [
    { transform: 'translateX(0)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(9px)' },
    { transform: 'translateX(-6px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' },
]

function Candado({ reducido }) {
    return <motion.svg className={styles.candado} viewBox="0 0 72 72" width="64" height="64" aria-hidden="true" focusable="false"
        initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.26, ease: SALIDA }}>
        <motion.path d="M24 32 V22 a12 12 0 0 1 24 0 V32" className={styles.arco}
            style={{ transformBox: 'fill-box', transformOrigin: 'left bottom' }}
            initial={{ y: 0, rotate: 0 }}
            animate={reducido ? { y: -9, rotate: -26 } : { y: [0, -9, -9], rotate: [0, 0, -26] }}
            transition={{ duration: reducido ? 0 : 0.52, delay: reducido ? 0 : 0.42, ease: REBOTE, times: [0, 0.5, 1] }} />
        <rect x="14" y="32" width="44" height="34" rx="8" className={styles.cuerpo} />
        <circle cx="36" cy="49" r="4.5" className={styles.llave} />
    </motion.svg>
}

// Código de un solo uso en casillas: cada "x" marca dónde va un dígito. Al verificarse, las casillas se
// recogen en un candado que se abre; si el código es incorrecto, vibran y se limpian.
export default function OtpInput({ value, onChange, onLimpiar, disabled = false, invalid = false, exito = false, length = 6, labelledBy, describedBy }) {
    const reducido = useReducedMotion()
    const grupo = useRef(null)
    const casillas = useRef([])
    const [candado, setCandado] = useState(false)
    const digitos = Array.from({ length }, (_, i) => value[i] || '')

    // Valor más reciente, actualizado al instante: el foco se mueve antes de que React vuelva a pintar y,
    // con el valor de la última pintura, cada segundo dígito se perdía o se sobrescribía.
    const actual = useRef(value)
    actual.current = value

    const cambiar = (siguiente) => {
        const limpio = siguiente.replace(/\D/g, '').slice(0, length)
        actual.current = limpio
        onChange(limpio)
    }
    const enfocar = (i) => casillas.current[Math.max(0, Math.min(length - 1, i))]?.focus()

    // Éxito: las casillas se recogen hacia el centro y aparece el candado.
    useEffect(() => {
        if (!exito) return undefined
        if (reducido) { setCandado(true); return undefined }
        casillas.current.forEach((casilla, i) => casilla?.animate(
            [{ transform: 'translate(0,0) scale(1)', opacity: 1 },
                { transform: `translate(${(2.5 - i) * SEPARACION}px,6px) scale(0.35)`, opacity: 0 }],
            { duration: 380, delay: i * 20, easing: 'cubic-bezier(0.77,0,0.175,1)', fill: 'forwards' }))
        const espera = setTimeout(() => setCandado(true), 380)
        return () => clearTimeout(espera)
    }, [exito, reducido])

    // Error con el código completo: vibra, deja ver el error un momento y se limpia para volver a escribir.
    useEffect(() => {
        if (!invalid || exito || value.length < length) return undefined
        if (!reducido) grupo.current?.animate(SACUDIDA, { duration: 420, easing: 'ease-out' })
        const espera = setTimeout(() => { onLimpiar?.(); casillas.current[0]?.focus() }, 900)
        return () => clearTimeout(espera)
        // Solo debe reaccionar cuando aparece el error, no cada vez que cambia lo escrito.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [invalid])

    const escribir = (i, evento) => {
        const nuevos = evento.target.value.replace(/\D/g, '')
        const base = actual.current
        if (!nuevos) return cambiar(base.slice(0, i) + base.slice(i + 1))
        // También cubre el autocompletado del código recibido por correo o SMS.
        const posicion = Math.min(i, base.length)
        cambiar(base.slice(0, posicion) + nuevos + base.slice(posicion + nuevos.length))
        enfocar(posicion + nuevos.length)
    }

    const teclear = (i, evento) => {
        if (evento.key === 'Backspace' && !actual.current[i] && i > 0) {
            evento.preventDefault()
            cambiar(actual.current.slice(0, i - 1) + actual.current.slice(i))
            enfocar(i - 1)
        } else if (evento.key === 'ArrowLeft') {
            evento.preventDefault()
            enfocar(i - 1)
        } else if (evento.key === 'ArrowRight') {
            evento.preventDefault()
            enfocar(i + 1)
        }
    }

    const pegar = (evento) => {
        evento.preventDefault()
        const pegado = evento.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
        if (!pegado) return
        cambiar(pegado)
        enfocar(pegado.length)
    }

    return <div className={styles.contenedor}>
        <div ref={grupo} className={styles.grupo} role="group" aria-labelledby={labelledBy} aria-describedby={describedBy} data-invalid={invalid}>
            {digitos.map((digito, i) => <input
                key={i}
                ref={(el) => { casillas.current[i] = el }}
                className={styles.casilla}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                aria-label={`Dígito ${i + 1} de ${length}`}
                aria-invalid={invalid}
                placeholder="x"
                value={digito}
                disabled={disabled}
                data-llena={Boolean(digito)}
                data-exito={exito}
                onChange={(evento) => escribir(i, evento)}
                onKeyDown={(evento) => teclear(i, evento)}
                onPaste={pegar}
                onFocus={(evento) => {
                    if (i > actual.current.length) return enfocar(actual.current.length)
                    evento.target.select()
                }}
            />)}
            {exito && candado && <div className={styles.escena}>
                {!reducido && <motion.span className={styles.onda} aria-hidden="true"
                    initial={{ scale: 0.4, opacity: 0.8 }} animate={{ scale: 1.9, opacity: 0 }}
                    transition={{ duration: 0.8, delay: 0.5, ease: SALIDA }} />}
                <Candado reducido={reducido} />
            </div>}
        </div>
        {exito && candado && <motion.p className={styles.exito} role="status"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: reducido ? 0 : 0.7, ease: SALIDA }}>
            Correo verificado
        </motion.p>}
    </div>
}
