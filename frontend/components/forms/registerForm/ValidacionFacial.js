'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BadgeCheck, Camera, Fingerprint, LockKeyhole, Scale, ScanFace, ScanLine, ShieldQuestion, Target, UserCheck } from 'lucide-react'
import Button from '../../ui/Button/Button'
import { registroService } from '@/app/services/authService'
import IntentoFallido from './IntentoFallido'
import MarcasRadiales from './MarcasRadiales'
import CapaRostro from './CapaRostro'
import usePrevisualizacionFacial, { INSTRUCCIONES, PROBLEMAS_ALINEACION } from './usePrevisualizacionFacial'
import styles from './ValidacionFacial.module.css'

const FOTOGRAMAS = 5
const INTERVALO_MS = 250
const ANCHO_MAX = 640

const textosRevision = {
    rostro_documento_no_detectado: 'No pudimos detectar la fotografía de tu documento, por lo que no fue posible compararla con tu rostro. Un integrante del equipo de DocSmart revisará tu caso.',
    intentos_agotados: 'Alcanzaste el máximo de intentos de verificación. Un integrante del equipo de DocSmart revisará tu caso.',
    similitud_intermedia: 'No pudimos confirmar la coincidencia de forma automática. Un integrante del equipo de DocSmart la revisará.',
    alineacion_documento_dudosa: 'El rostro de tu documento aparece girado o poco claro, por lo que la comparación automática no es concluyente. Un integrante del equipo de DocSmart revisará tu caso.',
    foto_documento_poco_nitida: 'La fotografía de tu documento es pequeña o poco nítida, por lo que la comparación automática no es concluyente. Un integrante del equipo de DocSmart revisará tu caso.',
    captura_reutilizada: 'Detectamos que se envió una imagen ya usada en un intento anterior. Un integrante del equipo de DocSmart revisará tu caso.',
}

// Información previa a la autorización (Ley 1581 de 2012, tratamiento de datos sensibles).
const PUNTOS = [
    [Target, 'Finalidad', 'Verificar que la persona que se registra es la titular del documento. Es el único uso de tus imágenes: no se emplean para publicidad, perfilamiento ni otros fines, ni se ceden o comercializan con terceros.'],
    [Fingerprint, 'Tipo de dato', 'Tu imagen facial es un dato biométrico y, según la Ley 1581 de 2012, un dato sensible. Solo lo tratamos con tu autorización previa, expresa e informada.'],
    [Camera, 'Qué recolectamos', 'Algunos fotogramas tomados con tu cámara en este momento y el recorte de la fotografía de tu documento. La comparación se realiza en los servidores de DocSmart, sin servicios externos de reconocimiento facial.'],
    [LockKeyhole, 'Seguridad y conservación', 'Se almacenan de forma privada, con acceso restringido al personal autorizado y solo cuando se requiere una revisión manual. Se eliminan automáticamente a los 30 días, salvo que haya una revisión en curso.'],
    [UserCheck, 'Revisión humana', 'La comparación es automática. Si no se logra confirmar tu identidad en 3 intentos, una persona del equipo de DocSmart revisará tu caso y te avisará por correo.'],
    [Scale, 'Tus derechos', 'Como titular puedes conocer, actualizar, rectificar y suprimir tus datos, y revocar esta autorización en cualquier momento, a través de los canales de atención de DocSmart.'],
    [BadgeCheck, 'Es voluntario', 'No estás obligado a autorizarlo. Si prefieres no hacerlo, puedes elegir una alternativa de verificación revisada por una persona, sin que tu solicitud sea rechazada por ello.'],
]

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
    const [fallo, setFallo] = useState(null)
    const [perdidos, setPerdidos] = useState(0)
    // Corona de marcas del visor: idle -> escaneando -> ok (ola verde antes de pasar al siguiente paso).
    const [marcas, setMarcas] = useState('idle')
    const [desafio, setDesafio] = useState('')
    const [motivo, setMotivo] = useState('')
    const [correo, setCorreo] = useState('')
    const [correoGuardado, setCorreoGuardado] = useState('')
    // Rostro y puntos reales que el servidor detectó en el documento, y proporción real del video.
    const [documentoRostro, setDocumentoRostro] = useState(null)
    // El rostro del documento no se pudo leer: la selfie se toma igual y una persona la compara con el documento.
    const [sinRostroDocumento, setSinRostroDocumento] = useState(false)
    const [aspecto, setAspecto] = useState(4 / 3)
    const videoRef = useRef(null)
    const streamRef = useRef(null)

    const detenerCamara = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
    }, [])
    useEffect(() => detenerCamara, [detenerCamara])

    const { analisis, disponible } = usePrevisualizacionFacial({
        activa: fase === 'camara' && !cargando, role, procesoId, desafio, videoRef,
    })

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
        setFallo(null)
        try {
            const respuesta = await llamar('desafio', { proceso_id: procesoId, consentimiento: true })
            const datos = respuesta.data || {}
            if (datos.estado === 'aprobado' || datos.estado === 'alternativa' || datos.estado === 'revision') {
                return finalizar(datos.estado, datos.motivo)
            }
            setDesafio(datos.desafio)
            setDocumentoRostro(datos.documento_rostro || null)
            setSinRostroDocumento(Boolean(datos.sin_rostro_documento))
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
            setMarcas('escaneando')
            const respuesta = await llamar('verificar', formData)
            if (respuesta.data?.estado === 'aprobado') {
                setMarcas('ok')
                await esperar(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 250 : 1000)
            }
            finalizar(respuesta.data?.estado, respuesta.data?.motivo)
        } catch (error) {
            setMarcas('idle')
            const datos = error.response?.data
            const detalle = datos?.errores
            if (error.response?.status === 503) {
                // El servidor no pudo ni evaluar la solicitud: no se gastó intento ni desafío, se puede repetir.
                setFase('camara')
                setMensaje(primerMensaje(detalle) || 'El servicio no está disponible por el momento. Inténtalo de nuevo en unos segundos.')
                return
            }
            setDesafio('')
            if (detalle?.reintentar) {
                // Solo el desacierto de la comparación gasta un intento; la mala imagen se repite sin costo.
                const gasta = ['no_coincide', 'similitud_baja'].includes(detalle.codigo)
                const acumulados = perdidos + (gasta ? 1 : 0)
                setPerdidos(acumulados)
                setFallo({ id: Date.now(), codigo: detalle.codigo, restantes: detalle.intentos_restantes ?? null, perdidos: acumulados, mensaje: primerMensaje(detalle) })
                setFase('reintento')
            } else if (error.response?.status === 409) {
                finalizar('revision')
            } else {
                setFallo({ id: Date.now(), codigo: 'error', restantes: null, perdidos, mensaje: primerMensaje(detalle) || 'No fue posible procesar la imagen. Inténtalo de nuevo.' })
                setFase('reintento')
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

    // Estado de la guía en vivo: sale solo de lo que devolvió el servidor, nunca de una animación.
    const rostro = analisis?.rostro?.caja ? analisis.rostro : null
    const problemas = analisis?.problemas || []
    const primero = (alineacion) => problemas.find(p => PROBLEMAS_ALINEACION.has(p) === alineacion)
    const guia = (() => {
        if (fase === 'procesando') return { tono: 'neutro', titulo: 'Procesando…', detalle: 'Comparando tu rostro con el documento' }
        if (cargando) return { tono: 'neutro', titulo: 'Capturando…', detalle: 'Mueve ligeramente la cabeza, sin dejar de mirar la cámara' }
        if (!disponible) return { tono: 'neutro', titulo: 'Guía en vivo no disponible', detalle: 'Ubícate de frente y captura; el servidor revisará la imagen' }
        if (!analisis || analisis.estado === 'buscando') return { tono: 'neutro', titulo: 'Buscando tu rostro…', detalle: analisis ? INSTRUCCIONES.sin_rostro : '' }
        if (analisis.estado === 'varios') return { tono: 'ajusta', titulo: 'Ajusta tu posición', detalle: INSTRUCCIONES.varios_rostros }
        // Si la captura ya se puede comparar, la guía sugiere mejoras pero no bloquea: el servidor decide.
        const aviso = analisis.capturable ? '. Puedes capturar igualmente' : ''
        if (analisis.alineacion === 'ajustar') return { tono: 'ajusta', titulo: analisis.capturable ? 'Casi listo' : 'Ajusta tu posición', detalle: (INSTRUCCIONES[primero(true)] || '') + aviso }
        if (analisis.calidad === 'ajustar') return { tono: 'ajusta', titulo: analisis.capturable ? 'Casi listo' : 'Mejora la imagen', detalle: (INSTRUCCIONES[primero(false)] || '') + aviso }
        return { tono: 'ok', titulo: 'Calidad adecuada', detalle: 'Puedes capturar' }
    })()
    // Tres etapas distintas. La tercera solo la decide el servidor, con la captura que envías; la guía nunca la completa.
    const etapas = [
        { id: 'deteccion', Icono: ScanFace, titulo: 'Rostro detectado',
            estado: !analisis || analisis.deteccion === 'no_detectado' ? 'pendiente' : analisis.deteccion === 'varios' ? 'ajustar' : 'ok',
            ayuda: 'El servidor encontró un único rostro en la imagen.' },
        { id: 'alineacion', Icono: ScanLine, titulo: 'Alineación adecuada',
            estado: !analisis || analisis.alineacion === 'sin_evaluar' ? 'pendiente' : analisis.alineacion === 'ajustar' ? 'ajustar' : 'ok',
            ayuda: 'La postura y el encuadre son adecuados para comparar.' },
        { id: 'identidad', Icono: ShieldQuestion, titulo: 'Verificación de identidad',
            estado: fase === 'procesando' ? 'proceso' : 'pendiente',
            ayuda: 'La decide el servidor al comparar tu captura con el documento.' },
    ]

    return <section className={styles.panel} aria-labelledby="facial-titulo">
        <div className={styles.encabezado}>
            <span className={styles.icono}><ScanFace size={28} aria-hidden="true" /></span>
            <div>
                <strong id="facial-titulo">Verificación facial</strong>
                <p>Confirmamos que quien se registra es el titular del documento.</p>
            </div>
        </div>

        {fase === 'consentimiento' && <>
            <div className={styles.autorizacion}>
                <p className={styles.introduccion}>
                    Para proteger tu cuenta y la información de salud que administrarás en DocSmart, necesitamos comparar tu rostro con la
                    fotografía de tu documento de identidad. Antes de activar la cámara, te informamos cómo trataremos esa información.
                </p>
                <ul className={styles.puntos}>
                    {PUNTOS.map(([Icono, titulo, texto]) => <li key={titulo}>
                        <span className={styles.puntoIcono}><Icono size={18} aria-hidden="true" /></span>
                        <div><strong>{titulo}</strong><p>{texto}</p></div>
                    </li>)}
                </ul>
            </div>
            <label className={styles.consentimiento}>
                <input type="checkbox" checked={acepta} onChange={e => setAcepta(e.target.checked)} disabled={cargando} />
                <span>
                    Declaro que soy el titular del documento cargado y autorizo de forma previa, expresa e informada a DocSmart para tratar
                    mi imagen facial (dato biométrico) con la finalidad indicada, conforme a la Ley 1581 de 2012.
                </span>
            </label>
            <p className={styles.constancia}>Registraremos la fecha y la hora de tu autorización.</p>
            <div className={styles.fila}>
                <Button type="button" variant="primary" onClick={iniciar} disabled={cargando || !acepta}>
                    <Camera size={17} aria-hidden="true" /> {cargando ? 'Preparando…' : 'Autorizar y activar cámara'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => omitir('sin_consentimiento')} disabled={cargando}>No autorizo</Button>
            </div>
        </>}

        {(fase === 'camara' || fase === 'procesando') && <>
            <div className={styles.visor} style={{ aspectRatio: aspecto, maxWidth: aspecto < 1 ? 300 : 420 }}>
                <video ref={videoRef} playsInline muted autoPlay aria-label="Vista previa de tu cámara"
                    onLoadedMetadata={e => {
                        const { videoWidth, videoHeight } = e.currentTarget
                        if (videoWidth && videoHeight) setAspecto(videoWidth / videoHeight)
                    }} />
                {!rostro && <span className={styles.guia} aria-hidden="true" />}
                <CapaRostro ancho={rostro?.ancho} alto={rostro?.alto} rostro={rostro} tono={guia.tono} espejo />
                <MarcasRadiales className={styles.marcasVisor} forma="ovalo" estado={marcas} />
            </div>
            <ul className={styles.etapas} aria-label="Etapas de la verificación">
                {etapas.map(({ id, Icono, titulo, estado, ayuda }) => <li key={id} data-estado={estado} title={ayuda}>
                    <Icono size={15} aria-hidden="true" />
                    <span>{titulo}</span>
                    <small>{{ ok: 'Listo', ajustar: 'Ajustar', pendiente: id === 'identidad' ? 'Pendiente' : 'En espera', proceso: 'En curso' }[estado]}</small>
                </li>)}
            </ul>
            <div className={styles.estadoGuia} data-tono={guia.tono}>
                {documentoRostro && <figure className={styles.documentoCara}>
                    <div className={styles.documentoMarco} style={{ aspectRatio: `${documentoRostro.ancho} / ${documentoRostro.alto}` }}>
                        <img src={documentoRostro.imagen} alt="Fotografía detectada en tu documento" />
                        <CapaRostro ancho={documentoRostro.ancho} alto={documentoRostro.alto}
                            rostro={{ caja: documentoRostro.caja, puntos: documentoRostro.puntos, grupos: documentoRostro.grupos }}
                            tono={documentoRostro.alineacion === 'dudosa' ? 'ajusta' : 'ok'} />
                    </div>
                    <figcaption>Tu documento</figcaption>
                </figure>}
                <div className={styles.textoGuia} role="status" aria-live="polite">
                    <strong>{guia.titulo}</strong>
                    {guia.detalle && <span>{guia.detalle}</span>}
                </div>
            </div>
            {sinRostroDocumento && <p className={styles.nota}>
                No pudimos leer el rostro de la fotografía de tu documento. Toma tu selfie igualmente: es obligatoria, y una persona del equipo la comparará con tu documento.
            </p>}
            {documentoRostro?.alineacion === 'dudosa' && <p className={styles.nota}>
                El rostro de tu documento aparece girado o poco claro. Puedes continuar, pero es posible que una persona del equipo deba revisar tu caso.
            </p>}
            {documentoRostro?.calidad_baja && <p className={styles.nota}>
                La fotografía de tu documento es pequeña o poco nítida. Puedes continuar, pero es posible que una persona del equipo deba revisar tu caso.
            </p>}
            <p className={styles.ayuda}>
                Ubica tu rostro de frente, con buena luz y sin gafas oscuras ni gorra. Mueve ligeramente la cabeza al capturar.
                Los puntos son detecciones reales de tu imagen y sirven de apoyo: no verifican tu identidad. La decisión final la toma el servidor.
            </p>
            <div className={styles.fila}>
                <Button type="button" variant="primary" onClick={capturar} disabled={cargando || fase === 'procesando'}>
                    <Camera size={17} aria-hidden="true" /> {fase === 'procesando' ? 'Procesando…' : 'Capturar y verificar'}
                </Button>
            </div>
        </>}

        {fase === 'reintento' && fallo && <IntentoFallido key={fallo.id} fallo={fallo} onReintentar={iniciar} ocupado={cargando} />}

        {fase === 'revision' && role === 'medico' && <div className={styles.revision} role="status">
            <MarcasRadiales className={styles.escenaRevision} estado="ultimo" persona insignia="warn" />
            <div>
                <strong>Tu identidad quedó pendiente de revisión</strong>
                <p>{textosRevision[motivo] || 'No pudimos confirmar tu identidad de forma automática.'} No tienes que esperar:
                    continúa con tu registro. El equipo de DocSmart revisará tu identidad junto con tu hoja de vida y
                    tu solicitud profesional, en una sola revisión.</p>
            </div>
            <Button type="button" variant="primary" onClick={() => onListo('revision')}>Continuar con mi registro</Button>
        </div>}

        {fase === 'revision' && role !== 'medico' && <div className={styles.revision} role="status">
            <MarcasRadiales className={styles.escenaRevision} estado="ultimo" persona insignia="warn" />
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
