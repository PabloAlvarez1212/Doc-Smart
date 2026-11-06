'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Crop, RotateCcw, RotateCw, Sparkles, Undo2 } from 'lucide-react'
import Modal from '../../ui/Modal/Modal'
import Button from '../../ui/Button/Button'
import styles from './EditorDocumento.module.css'

// Edición de la imagen del documento en el mismo paso: girar, enderezar, recortar y ajustar luz, sin tener que
// volver a elegir otro archivo. Todo ocurre en el navegador; solo se envía el resultado cuando se verifica.
const LADO_MAX = 2200
const VISTA_MAX = 560
const MAX_BYTES = 8 * 1024 * 1024
const MINIMO = 0.12
const RECORTE_COMPLETO = { x: 0, y: 0, w: 1, h: 1 }

const limitar = (valor, minimo, maximo) => Math.min(maximo, Math.max(minimo, valor))

async function abrirImagen(archivo) {
    try {
        return await createImageBitmap(archivo, { imageOrientation: 'from-image' })
    } catch {
        return await new Promise((resolver, rechazar) => {
            const url = URL.createObjectURL(archivo)
            const imagen = new Image()
            imagen.onload = () => { URL.revokeObjectURL(url); resolver(imagen) }
            imagen.onerror = () => { URL.revokeObjectURL(url); rechazar(new Error('imagen')) }
            imagen.src = url
        })
    }
}

const medidas = (imagen) => ({ ancho: imagen.width || imagen.naturalWidth, alto: imagen.height || imagen.naturalHeight })

// Lienzo con la imagen girada (90° por pasos y un ajuste fino); `escala` lo reduce para la vista previa.
function girada(imagen, giro, angulo, escala) {
    const { ancho, alto } = medidas(imagen)
    const k = Math.min(1, LADO_MAX / Math.max(ancho, alto)) * escala
    const radianes = ((giro * 90 + angulo) * Math.PI) / 180
    const c = Math.abs(Math.cos(radianes))
    const s = Math.abs(Math.sin(radianes))
    const lienzo = document.createElement('canvas')
    lienzo.width = Math.max(1, Math.round((ancho * c + alto * s) * k))
    lienzo.height = Math.max(1, Math.round((ancho * s + alto * c) * k))
    const ctx = lienzo.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, lienzo.width, lienzo.height)
    ctx.translate(lienzo.width / 2, lienzo.height / 2)
    ctx.rotate(radianes)
    ctx.drawImage(imagen, (-ancho * k) / 2, (-alto * k) / 2, ancho * k, alto * k)
    return lienzo
}

// Luz y contraste por píxel (no depende de `ctx.filter`, que no existe en todos los navegadores).
function ajustarLuz(ctx, ancho, alto, brillo, contraste) {
    if (brillo === 1 && contraste === 1) return
    const datos = ctx.getImageData(0, 0, ancho, alto)
    const p = datos.data
    for (let i = 0; i < p.length; i += 4) {
        p[i] = (p[i] * brillo - 128) * contraste + 128
        p[i + 1] = (p[i + 1] * brillo - 128) * contraste + 128
        p[i + 2] = (p[i + 2] * brillo - 128) * contraste + 128
    }
    ctx.putImageData(datos, 0, 0)
}

// Brillo y contraste que llevan la imagen a un rango parecido al de una foto bien iluminada.
function ajusteAutomatico(lienzo) {
    const chico = document.createElement('canvas')
    chico.width = 160
    chico.height = Math.max(1, Math.round((160 * lienzo.height) / lienzo.width))
    const ctx = chico.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(lienzo, 0, 0, chico.width, chico.height)
    const p = ctx.getImageData(0, 0, chico.width, chico.height).data
    const luces = []
    for (let i = 0; i < p.length; i += 4) luces.push(0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2])
    luces.sort((a, b) => a - b)
    const media = luces.reduce((a, b) => a + b, 0) / luces.length
    const brillo = limitar(125 / Math.max(20, media), 0.7, 1.6)
    const rango = (luces[Math.floor(luces.length * 0.98)] - luces[Math.floor(luces.length * 0.02)]) * brillo
    return { brillo: Math.round(brillo * 20) / 20, contraste: Math.round(limitar(190 / Math.max(40, rango), 1, 1.8) * 20) / 20 }
}

export default function EditorDocumento({ abierto, archivo, etiqueta, onCerrar, onAplicar }) {
    const [imagen, setImagen] = useState(null)
    const [error, setError] = useState('')
    const [giro, setGiro] = useState(0)
    const [angulo, setAngulo] = useState(0)
    const [recorte, setRecorte] = useState(RECORTE_COMPLETO)
    const [brillo, setBrillo] = useState(1)
    const [contraste, setContraste] = useState(1)
    const [trabajando, setTrabajando] = useState(false)
    const vista = useRef(null)
    const area = useRef(null)
    const arrastre = useRef(null)

    const restablecer = useCallback(() => {
        setGiro(0); setAngulo(0); setRecorte(RECORTE_COMPLETO); setBrillo(1); setContraste(1)
    }, [])

    // Carga la imagen cada vez que se abre el editor.
    useEffect(() => {
        if (!abierto || !archivo) return undefined
        let vigente = true
        setImagen(null); setError(''); restablecer()
        abrirImagen(archivo).then(i => { if (vigente) setImagen(i) }).catch(() => { if (vigente) setError('No pudimos abrir esta imagen. Elige otra.') })
        return () => { vigente = false }
    }, [abierto, archivo, restablecer])

    // Vista previa: la imagen girada, reducida; la luz se ve con un filtro CSS y se aplica de verdad al guardar.
    useEffect(() => {
        if (!imagen || !vista.current) return
        const grande = girada(imagen, giro, angulo, 1)
        const k = Math.min(1, VISTA_MAX / Math.max(grande.width, grande.height))
        const destino = vista.current
        destino.width = Math.max(1, Math.round(grande.width * k))
        destino.height = Math.max(1, Math.round(grande.height * k))
        destino.getContext('2d').drawImage(grande, 0, 0, destino.width, destino.height)
    }, [imagen, giro, angulo, abierto])

    // Al girar de 90° en 90° el recorte anterior ya no corresponde: se vuelve al encuadre completo.
    const girar = (paso) => { setGiro(g => (g + paso + 4) % 4); setRecorte(RECORTE_COMPLETO) }
    const enderezar = (valor) => { setAngulo(valor); setRecorte(RECORTE_COMPLETO) }

    const mover = (modo, evento) => {
        const caja = area.current?.getBoundingClientRect()
        if (!caja) return
        const base = arrastre.current
        const dx = (evento.clientX - base.x) / caja.width
        const dy = (evento.clientY - base.y) / caja.height
        const r = { ...base.recorte }
        if (modo === 'mover') {
            r.x = limitar(base.recorte.x + dx, 0, 1 - r.w)
            r.y = limitar(base.recorte.y + dy, 0, 1 - r.h)
        } else {
            const izquierda = modo.includes('i')
            const arriba = modo.includes('s')
            if (izquierda) { const nx = limitar(base.recorte.x + dx, 0, base.recorte.x + base.recorte.w - MINIMO); r.w = base.recorte.x + base.recorte.w - nx; r.x = nx }
            else r.w = limitar(base.recorte.w + dx, MINIMO, 1 - base.recorte.x)
            if (arriba) { const ny = limitar(base.recorte.y + dy, 0, base.recorte.y + base.recorte.h - MINIMO); r.h = base.recorte.y + base.recorte.h - ny; r.y = ny }
            else r.h = limitar(base.recorte.h + dy, MINIMO, 1 - base.recorte.y)
        }
        setRecorte(r)
    }

    const empezar = (modo) => (evento) => {
        evento.preventDefault()
        evento.stopPropagation()
        evento.currentTarget.setPointerCapture(evento.pointerId)
        arrastre.current = { x: evento.clientX, y: evento.clientY, recorte }
        evento.currentTarget.onpointermove = (e) => mover(modo, e)
        evento.currentTarget.onpointerup = (e) => { e.currentTarget.onpointermove = null; e.currentTarget.onpointerup = null; arrastre.current = null }
    }

    // Con el teclado, cada esquina se mueve con las flechas (Mayús = pasos grandes).
    const teclear = (modo) => (evento) => {
        const paso = evento.shiftKey ? 0.05 : 0.01
        const mapa = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] }
        const delta = mapa[evento.key]
        if (!delta) return
        evento.preventDefault()
        arrastre.current = { x: 0, y: 0, recorte }
        const caja = area.current?.getBoundingClientRect()
        if (!caja) return
        mover(modo, { clientX: delta[0] * caja.width, clientY: delta[1] * caja.height })
        arrastre.current = null
    }

    const automatico = () => {
        if (!imagen) return
        const { brillo: b, contraste: c } = ajusteAutomatico(girada(imagen, giro, angulo, 0.3))
        setBrillo(b); setContraste(c)
    }

    const aplicar = async () => {
        if (!imagen || trabajando) return
        setTrabajando(true)
        setError('')
        try {
            const completa = girada(imagen, giro, angulo, 1)
            const sx = Math.round(recorte.x * completa.width)
            const sy = Math.round(recorte.y * completa.height)
            const sw = Math.max(1, Math.round(recorte.w * completa.width))
            const sh = Math.max(1, Math.round(recorte.h * completa.height))
            const salida = document.createElement('canvas')
            salida.width = sw
            salida.height = sh
            const ctx = salida.getContext('2d', { willReadFrequently: true })
            ctx.drawImage(completa, sx, sy, sw, sh, 0, 0, sw, sh)
            ajustarLuz(ctx, sw, sh, brillo, contraste)
            let blob = null
            for (const calidad of [0.92, 0.85, 0.75]) {
                blob = await new Promise(resolver => salida.toBlob(resolver, 'image/jpeg', calidad))
                if (blob && blob.size <= MAX_BYTES) break
            }
            if (!blob || blob.size > MAX_BYTES) throw new Error('tamano')
            const base = (archivo?.name || 'documento').replace(/\.[^.]+$/, '')
            onAplicar(new File([blob], `${base}-editado.jpg`, { type: 'image/jpeg', lastModified: Date.now() }))
            onCerrar()
        } catch {
            setError('No pudimos guardar los cambios. Intenta de nuevo o elige otra imagen.')
        } finally {
            setTrabajando(false)
        }
    }

    const sinCambios = giro === 0 && angulo === 0 && brillo === 1 && contraste === 1 && recorte.w === 1 && recorte.h === 1

    return <Modal abierto={abierto} onCerrar={onCerrar} titulo={`Editar ${etiqueta.toLowerCase()} del documento`} width="680px"
        text="Endereza, recorta o aclara la foto aquí mismo. No tienes que volver a elegir el archivo."
        footer={<>
            <Button variant="secondary" onClick={onCerrar} disabled={trabajando}>Cancelar</Button>
            <Button variant="primary" onClick={aplicar} disabled={!imagen || trabajando}>{trabajando ? 'Guardando…' : sinCambios ? 'Usar la imagen' : 'Aplicar cambios'}</Button>
        </>}>
        <div className={styles.editor}>
            <div className={styles.escena}>
                {!imagen && !error && <p className={styles.estado} role="status">Abriendo la imagen…</p>}
                {imagen && <div ref={area} className={styles.area}>
                    <canvas ref={vista} className={styles.lienzo} style={{ filter: `brightness(${brillo}) contrast(${contraste})` }}
                        role="img" aria-label={`Vista previa de la ${etiqueta.toLowerCase()} del documento`} />
                    <div className={styles.recorte} style={{ left: `${recorte.x * 100}%`, top: `${recorte.y * 100}%`, width: `${recorte.w * 100}%`, height: `${recorte.h * 100}%` }}
                        onPointerDown={empezar('mover')} data-completo={recorte.w === 1 && recorte.h === 1}>
                        {[['si', 'arriba a la izquierda'], ['sd', 'arriba a la derecha'], ['ii', 'abajo a la izquierda'], ['id', 'abajo a la derecha']].map(([modo, nombre]) =>
                            <button key={modo} type="button" className={`${styles.esquina} ${styles[modo]}`} onPointerDown={empezar(modo)} onKeyDown={teclear(modo)}
                                aria-label={`Ajustar el recorte: esquina ${nombre}. Usa las flechas del teclado`} />)}
                    </div>
                </div>}
            </div>
            {error && <p className={styles.error} role="alert">{error}</p>}

            <div className={styles.controles}>
                <div className={styles.fila}>
                    <span className={styles.titulo}><Crop size={15} aria-hidden="true" /> Posición</span>
                    <Button variant="secondary" size="sm" onClick={() => girar(-1)} disabled={!imagen} aria-label="Girar a la izquierda"><RotateCcw size={16} aria-hidden="true" /> Girar</Button>
                    <Button variant="secondary" size="sm" onClick={() => girar(1)} disabled={!imagen} aria-label="Girar a la derecha"><RotateCw size={16} aria-hidden="true" /> Girar</Button>
                    <Button variant="secondary" size="sm" onClick={() => setRecorte(RECORTE_COMPLETO)} disabled={!imagen || (recorte.w === 1 && recorte.h === 1)}>Quitar recorte</Button>
                </div>
                <label className={styles.deslizador}>
                    <span>Enderezar</span>
                    <input type="range" min="-15" max="15" step="0.5" value={angulo} onChange={e => enderezar(Number(e.target.value))} disabled={!imagen} />
                    <output>{angulo > 0 ? '+' : ''}{angulo}°</output>
                </label>
                <label className={styles.deslizador}>
                    <span>Brillo</span>
                    <input type="range" min="0.6" max="1.6" step="0.05" value={brillo} onChange={e => setBrillo(Number(e.target.value))} disabled={!imagen} />
                    <output>{Math.round(brillo * 100)} %</output>
                </label>
                <label className={styles.deslizador}>
                    <span>Contraste</span>
                    <input type="range" min="0.7" max="1.8" step="0.05" value={contraste} onChange={e => setContraste(Number(e.target.value))} disabled={!imagen} />
                    <output>{Math.round(contraste * 100)} %</output>
                </label>
                <div className={styles.fila}>
                    <Button variant="secondary" size="sm" onClick={automatico} disabled={!imagen}><Sparkles size={16} aria-hidden="true" /> Mejorar luz</Button>
                    <Button variant="secondary" size="sm" onClick={() => { restablecer() }} disabled={!imagen || sinCambios}><Undo2 size={16} aria-hidden="true" /> Restablecer</Button>
                </div>
                <p className={styles.consejo}>Arrastra las esquinas del recuadro para recortar. Deja visible todo el documento, sin reflejos ni dedos sobre la foto.</p>
            </div>
        </div>
    </Modal>
}
