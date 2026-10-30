'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ScanFace, Camera, ShieldCheck, RefreshCw } from 'lucide-react'
import Button from '../../ui/Button/Button'
import { registroService } from '@/app/services/authService'
import styles from './ValidacionFacial.module.css'

const FOTOGRAMAS = 3
const INTERVALO_MS = 350
const ANCHO_MAX = 640

const textosRevision = {
    rostro_documento_no_detectado: 'No pudimos detectar la fotografía de tu documento, por lo que no fue posible compararla con tu rostro. Un integrante del equipo de DocSmart revisará tu caso.',
    intentos_agotados: 'Alcanzaste el máximo de intentos de verificación. Un integrante del equipo de DocSmart revisará tu caso.',
    similitud_intermedia: 'No pudimos confirmar la coincidencia de forma automática. Un integrante del equipo de DocSmart la revisará.',
}

const esperar = ms => new Promise(resolve => setTimeout(resolve, ms))
const primerMensaje = errores => {
    if (!errores) return ''
    const valor = Object.values(errores).flat().find(v => typeof v === 'string')
    return valor || ''
}

export default function ValidacionFacial({ role, procesoId, onListo }) {
    const [fase, setFase] = useState('consentimiento')
    const [acepta, setAcepta] = useState(false)
    const [cargando, setCargando] = useState(false)
    const [mensaje, setMensaje] = useState('')
    const [desafio, setDesafio] = useState('')
    const [motivo, setMotivo] = useState('')
    const [correo, setCorreo] = useState('')
    const [correoGuardado, setCorreoGuardado] = useState('')
    const videoRef = useRef(null)
    const streamRef = useRef(null)

    const detenerCamara = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
    }, [])
    useEffect(() => detenerCamara, [detenerCamara])

    const finalizar = useCallback((estado, motivoEstado = '') => {
        detenerCamara()
        if (estado === 'aprobado' || estado === 'alternativa') return onListo(estado)
        setMotivo(motivoEstado)
        setFase('revision')
    }, [detenerCamara, onListo])

    const llamar = (ruta, datos) => registroService(role, `facial/${ruta}`, datos)

    const abrirCamara = async () => {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('camara')
        detenerCamara()
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: ANCHO_MAX }, height: { ideal: 480 } }, audio: false,
        })
        streamRef.current = stream
        setFase('camara')
        // El <video> se monta al cambiar de fase.
        requestAnimationFrame(() => {
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.play().catch(() => {})
            }
        })
    }

    const iniciar = async () => {
        if (cargando) return
        if (!acepta) return setMensaje('Debes aceptar el tratamiento de tu imagen para usar la cámara, o elegir otra opción.')
        setCargando(true)
        setMensaje('')
        try {
            const respuesta = await llamar('desafio', { proceso_id: procesoId, consentimiento: true })
            const datos = respuesta.data || {}
            if (datos.estado === 'aprobado' || datos.estado === 'alternativa' || datos.estado === 'revision') {
                return finalizar(datos.estado, datos.motivo)
            }
            setDesafio(datos.desafio)
            try {
                await abrirCamara()
            } catch {
                setFase('sin_camara')
                setMensaje('No pudimos acceder a la cámara. Revisa los permisos del navegador o elige otra opción.')
            }
        } catch (error) {
            setMensaje(primerMensaje(error.response?.data?.errores) || 'No fue posible iniciar la verificación. Inténtalo de nuevo.')
        } finally {
            setCargando(false)
        }
    }

    const capturarFotogramas = async () => {
        const video = videoRef.current
        if (!video?.videoWidth) throw new Error('video')
        const escala = Math.min(1, ANCHO_MAX / video.videoWidth)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(video.videoWidth * escala)
        canvas.height = Math.round(video.videoHeight * escala)
        const ctx = canvas.getContext('2d')
        const blobs = []
        for (let i = 0; i < FOTOGRAMAS; i++) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            blobs.push(await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.85)))
            if (i < FOTOGRAMAS - 1) await esperar(INTERVALO_MS)
        }
        return blobs
    }

    const capturar = async () => {
        if (cargando) return
        setCargando(true)
        setMensaje('')
        try {
            const blobs = await capturarFotogramas()
            const formData = new FormData()
            formData.append('proceso_id', procesoId)
            formData.append('desafio', desafio)
            blobs.forEach((b, i) => formData.append('fotogramas', b, `fotograma-${i + 1}.jpg`))
            setFase('procesando')
            const respuesta = await llamar('verificar', formData)
            finalizar(respuesta.data?.estado, respuesta.data?.motivo)
        } catch (error) {
            const datos = error.response?.data
            const detalle = datos?.errores
            setDesafio('')
            if (detalle?.reintentar) {
                setFase('reintento')
                setMensaje(primerMensaje(detalle) + (detalle.intentos_restantes != null ? ` Intentos restantes: ${detalle.intentos_restantes}.` : ''))
            } else if (error.response?.status === 409) {
                finalizar('revision')
            } else {
                setFase('reintento')
                setMensaje(primerMensaje(detalle) || 'No fue posible procesar la imagen. Inténtalo de nuevo.')
            }
        } finally {
            setCargando(false)
        }
    }

    const omitir = async motivo => {
        if (cargando) return
        setCargando(true)
        setMensaje('')
        try {
            const respuesta = await llamar('omitir', { proceso_id: procesoId, motivo })
            finalizar(respuesta.data?.estado)
        } catch (error) {
            setMensaje(primerMensaje(error.response?.data?.errores) || 'No fue posible registrar tu solicitud. Inténtalo de nuevo.')
        } finally {
            setCargando(false)
        }
    }

    const guardarCorreo = async () => {
        if (cargando) return
        const valor = correo.trim()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) return setMensaje('Ingresa un correo válido para avisarte el resultado.')
        setCargando(true)
        setMensaje('')
        try {
            const respuesta = await llamar('contacto', { proceso_id: procesoId, correo: valor })
            setCorreoGuardado(respuesta.data?.correo_contacto || valor)
        } catch (error) {
            setMensaje(primerMensaje(error.response?.data?.errores) || 'No fue posible guardar el correo. Inténtalo de nuevo.')
        } finally {
            setCargando(false)
        }
    }

    const alternativas = <div className={styles.alternativas}>
        <p>¿No puedes usar la cámara o prefieres otra opción?</p>
        <div className={styles.fila}>
            <Button type="button" variant="secondary" onClick={() => omitir('camara_no_disponible')} disabled={cargando}>No puedo usar la cámara</Button>
            <Button type="button" variant="secondary" onClick={() => omitir('accesibilidad')} disabled={cargando}>Necesito otra alternativa</Button>
        </div>
        <p className={styles.nota}>Un integrante del equipo de DocSmart revisará tu caso de forma manual.</p>
    </div>

    return <section className={styles.panel} aria-labelledby="facial-titulo">
        <div className={styles.encabezado}>
            <span className={styles.icono}><ScanFace size={28} aria-hidden="true" /></span>
            <div>
                <strong id="facial-titulo">Verificación facial</strong>
                <p>Confirmamos que quien se registra es el titular del documento.</p>
            </div>
        </div>

        {fase === 'consentimiento' && <>
            <div className={styles.texto}>
                <p>Para proteger tu cuenta, compararemos tu rostro con la fotografía de tu documento de identidad. Para ello tomaremos unas fotografías breves con la cámara de tu dispositivo.</p>
                <ul>
                    <li><strong>Finalidad:</strong> verificar tu identidad durante el registro. No se utilizan para ningún otro propósito.</li>
                    <li><strong>Conservación:</strong> las imágenes se guardan de forma privada, solo accede a ellas el equipo autorizado de DocSmart cuando se requiere una revisión manual, y se eliminan automáticamente a los 30 días.</li>
                    <li><strong>Tus derechos:</strong> puedes solicitar la eliminación de tus imágenes en cualquier momento a través de los canales de soporte de DocSmart.</li>
                    <li><strong>Intentos:</strong> tienes 3 intentos de comparación. Si no se logra confirmar tu identidad, un integrante del equipo de DocSmart revisará tu caso y te avisará por correo.</li>
                    <li><strong>Es opcional:</strong> si no aceptas, puedes elegir una alternativa de verificación y tu solicitud no será rechazada por ello.</li>
                </ul>
            </div>
            <label className={styles.consentimiento}>
                <input type="checkbox" checked={acepta} onChange={e => setAcepta(e.target.checked)} disabled={cargando} />
                <span>He leído y autorizo el tratamiento de mi imagen para esta verificación.</span>
            </label>
            <div className={styles.fila}>
                <Button type="button" variant="primary" onClick={iniciar} disabled={cargando || !acepta}>
                    <Camera size={17} aria-hidden="true" /> {cargando ? 'Preparando…' : 'Activar cámara'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => omitir('sin_consentimiento')} disabled={cargando}>No acepto</Button>
            </div>
        </>}

        {(fase === 'camara' || fase === 'procesando') && <>
            <div className={styles.visor}>
                <video ref={videoRef} playsInline muted autoPlay aria-label="Vista previa de tu cámara" />
                <span className={styles.guia} aria-hidden="true" />
            </div>
            <p className={styles.ayuda} role="status" aria-live="polite">
                {fase === 'procesando' ? 'Verificando tu rostro…' : 'Ubica tu rostro dentro del óvalo, de frente, con buena luz y sin gafas oscuras ni gorra. Mueve ligeramente la cabeza al capturar.'}
            </p>
            <div className={styles.fila}>
                <Button type="button" variant="primary" onClick={capturar} disabled={cargando || fase === 'procesando'}>
                    <Camera size={17} aria-hidden="true" /> {fase === 'procesando' ? 'Verificando…' : 'Capturar y verificar'}
                </Button>
            </div>
        </>}

        {fase === 'reintento' && <div className={styles.fila}>
            <Button type="button" variant="primary" onClick={iniciar} disabled={cargando}>
                <RefreshCw size={17} aria-hidden="true" /> Intentar de nuevo
            </Button>
        </div>}

        {fase === 'revision' && <div className={styles.revision} role="status">
            <ShieldCheck size={22} aria-hidden="true" />
            <div>
                <strong>Tu verificación pasó a revisión manual</strong>
                <p>{textosRevision[motivo] || 'Un integrante del equipo de DocSmart revisará tu caso.'}</p>
            </div>
            {correoGuardado ? <p>
                Te enviaremos el resultado a <strong>{correoGuardado}</strong>. Si es aprobado, el correo incluirá el botón
                «Terminar proceso de registro» para continuar desde el siguiente paso. Ya puedes cerrar esta página.
            </p> : <div className={styles.correoForm} role="group" aria-labelledby="facial-correo-etiqueta">
                <label id="facial-correo-etiqueta" htmlFor="facial-correo">Correo para avisarte el resultado</label>
                <input id="facial-correo" type="email" inputMode="email" autoComplete="email" value={correo}
                    onChange={e => setCorreo(e.target.value)} placeholder="tucorreo@ejemplo.com" disabled={cargando}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); guardarCorreo() } }}
                    aria-describedby="facial-correo-ayuda" />
                <small id="facial-correo-ayuda">Puede ser un correo temporal; el correo de tu cuenta lo configurarás más adelante.</small>
                <Button type="button" variant="primary" onClick={guardarCorreo} disabled={cargando}>{cargando ? 'Guardando…' : 'Enviar a revisión'}</Button>
            </div>}
        </div>}

        {mensaje && <p className={styles.mensaje} role="alert">{mensaje}</p>}
        {(fase === 'reintento' || fase === 'camara' || fase === 'sin_camara') && alternativas}
    </section>
}
