// El porcentaje es la similitud coseno entre los embeddings de dos rostros (SFace) multiplicada por 100. Sirve para
// comparar un caso con los umbrales del servidor; no es la probabilidad de que sea la misma persona.
const porcentaje = valor => `${Math.round(Math.max(0, Number(valor)) * 100)} %`

export function formatearSimilitud(valor) {
    return valor == null ? null : porcentaje(valor)
}

export function describirSimilitud(valor, umbrales) {
    if (valor == null) return null
    const base = porcentaje(valor)
    if (!umbrales) return base
    const { aprobado, revision } = umbrales
    const zona = valor >= aprobado ? 'sobre el umbral de aprobación'
        : valor >= revision ? 'zona intermedia, requiere revisión'
            : 'bajo el umbral de coincidencia'
    return `${base} · ${zona} (aprobación ${porcentaje(aprobado)}, mínimo ${porcentaje(revision)})`
}
