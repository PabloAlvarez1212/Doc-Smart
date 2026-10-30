'use client'

import { useEffect, useRef, useState } from 'react'
import { registroService } from '@/app/services/authService'

const ANCHO_ANALISIS = 320
const PAUSA_MS = 450
const PAUSA_LIMITE_MS = 3000
const FALLOS_MAX = 3

// Instrucciones concretas para cada problema. La vista de la cámara está en espejo (como un espejo real), así
// que "izquierda" y "derecha" se dicen desde el punto de vista de quien se mira: si el servidor ve el rostro
// en el lado izquierdo de la imagen real, en pantalla aparece a la derecha y hay que moverse a la izquierda.
export const INSTRUCCIONES = {
    sin_rostro: 'Ubícate de frente a la cámara',
    varios_rostros: 'Debes aparecer solo frente a la cámara',
    rostro_cortado: 'Tu rostro queda cortado: céntralo en la imagen',
    rostro_pequeno: 'Acércate un poco a la cámara',
    rostro_grande: 'Aléjate un poco de la cámara',
    rostro_a_la_izquierda: 'Muévete un poco hacia la izquierda',
    rostro_a_la_derecha: 'Muévete un poco hacia la derecha',
    rostro_arriba: 'Sube un poco la cámara o baja el rostro',
    rostro_abajo: 'Baja un poco la cámara o sube el rostro',
    inclinado: 'Endereza la cabeza, sin inclinarla',
    no_frontal: 'Mira de frente a la cámara',
    cabeza_levantada: 'Baja un poco la barbilla',
    cabeza_baja: 'Levanta un poco la barbilla',
    luz_baja: 'Hay poca luz: busca un lugar más iluminado',
    luz_excesiva: 'Hay demasiada luz: evita ventanas o focos detrás de ti',
    luz_desigual: 'La luz cae de un solo lado: busca luz suave de frente',
    imagen_borrosa: 'Imagen borrosa: mantén el dispositivo firme',
    posible_oclusion: 'Quita gafas oscuras, mascarilla o gorra',
    alineacion_dudosa: 'Mira de frente, con el rostro completo visible',
    sin_movimiento: 'Mueve ligeramente la cabeza mientras se toma la captura',
    pocos_fotogramas: 'Busca buena luz y vuelve a capturar',
}

// Problemas de encuadre y postura (los demás son de calidad de imagen). Solo sirve para elegir el mensaje:
// la clasificación real la hace el servidor.
export const PROBLEMAS_ALINEACION = new Set([
    'rostro_cortado', 'rostro_pequeno', 'rostro_grande', 'rostro_a_la_izquierda', 'rostro_a_la_derecha',
    'rostro_arriba', 'rostro_abajo', 'inclinado', 'no_frontal', 'cabeza_levantada', 'cabeza_baja', 'alineacion_dudosa',
])

/**
 * Guía en vivo de la captura. Cada cierto tiempo envía UN fotograma reducido al servidor, que detecta el rostro,
 * sus puntos y la calidad con el mismo motor que luego decide. El navegador no calcula ni envía puntos ni
 * puntajes: solo dibuja lo que devuelve el servidor. Una petición a la vez, con pausa entre ellas, y se detiene
 * al desmontarse, al pasar a procesar o si el servicio falla (la captura sigue disponible sin guía).
 */
export default function usePrevisualizacionFacial({ activa, role, procesoId, desafio, videoRef }) {
    const [analisis, setAnalisis] = useState(null)
    const [disponible, setDisponible] = useState(true)
    const cargaRef = useRef({ role, procesoId, desafio })
    cargaRef.current = { role, procesoId, desafio }

    useEffect(() => {
        if (!activa || !desafio) return undefined
        let vivo = true
        let temporizador = null
        let control = null
        let fallos = 0
        const canvas = document.createElement('canvas')
        setDisponible(true)
        setAnalisis(null)

        const programar = ms => { if (vivo) temporizador = setTimeout(ciclo, ms) }

        const ciclo = async () => {
            const video = videoRef.current
            if (!vivo) return
            if (document.hidden || !video || video.readyState < 2 || !video.videoWidth) return programar(PAUSA_MS)
            const escala = Math.min(1, ANCHO_ANALISIS / video.videoWidth)
            canvas.width = Math.round(video.videoWidth * escala)
            canvas.height = Math.round(video.videoHeight * escala)
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.7))
            if (!vivo || !blob) return programar(PAUSA_MS)

            const datos = new FormData()
            datos.append('proceso_id', cargaRef.current.procesoId)
            datos.append('desafio', cargaRef.current.desafio)
            datos.append('fotograma', blob, 'fotograma.jpg')
            control = new AbortController()
            try {
                const respuesta = await registroService(cargaRef.current.role, 'facial/previsualizar', datos, { signal: control.signal })
                if (!vivo) return
                fallos = 0
                setAnalisis(respuesta.data)
                programar(PAUSA_MS)
            } catch (error) {
                if (!vivo || error?.code === 'ERR_CANCELED') return
                const estado = error?.response?.status
                // 400: el desafío ya no sirve. 404/422: no hay guía. En ambos casos se deja de insistir.
                if (estado === 400 || estado === 404 || estado === 422) { setDisponible(false); return }
                if (estado === 429) return programar(PAUSA_LIMITE_MS)
                fallos += 1
                if (fallos >= FALLOS_MAX) { setDisponible(false); return }
                programar(PAUSA_LIMITE_MS)
            }
        }

        programar(PAUSA_MS)
        return () => {
            vivo = false
            clearTimeout(temporizador)
            control?.abort()
        }
    }, [activa, desafio, videoRef])

    return { analisis, disponible }
}
