"use client";

import { useState } from "react";
import styles from "../../patient/Profile/PersonalInfo/PersonalInfo.module.css";


export default function FormInfoSalud({
    tipos,
    datoInicial = null,
    onGuardar,
    onCancelar,
}) {
    const [datos, setDatos] = useState({
        id_tipo: datoInicial?.id_tipo ?? "",
        nombre: datoInicial?.nombre ?? "",
        descripcion: datoInicial?.descripcion ?? "",
        fecha_inicio: datoInicial?.fecha_inicio ?? "",
        fecha_fin: datoInicial?.fecha_fin ?? "",
        reaccion: datoInicial?.reaccion ?? "",
        dosis: datoInicial?.dosis ?? "",
        frecuencia: datoInicial?.frecuencia ?? "",
        via_administracion: datoInicial?.via_administracion ?? "",
        es_permanente: datoInicial?.es_permanente ?? false,
        estado: datoInicial?.estado ?? "vigente",
    });
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");

    const codigo = tipos.find(
        (tipo) => String(tipo.id) === String(datos.id_tipo)
    )?.codigo;

    function cambiar(event) {
        const { name, value, type, checked } = event.target;
        setDatos((actual) => ({
            ...actual,
            [name]: type === "checkbox" ? checked : value,
            ...(name === "id_tipo" ? {
                reaccion: "",
                dosis: "",
                frecuencia: "",
                via_administracion: "",
            } : {}),
        }));
    }

    async function guardar(event) {
        event.preventDefault();
        if (guardando) return;

        setError("");
        if (!datos.id_tipo || !datos.nombre.trim()) {
            setError("Selecciona un tipo y escribe el nombre.");
            return;
        }
        if (datos.fecha_inicio && datos.fecha_fin &&
            datos.fecha_fin < datos.fecha_inicio) {
            setError("La fecha final no puede ser anterior a la inicial.");
            return;
        }

        setGuardando(true);
        try {
            await onGuardar({
                ...datos,
                id_tipo: Number(datos.id_tipo),
                nombre: datos.nombre.trim(),
                fecha_inicio: datos.fecha_inicio || null,
                fecha_fin: datos.fecha_fin || null,
                reaccion: codigo === "alergia" ? datos.reaccion : "",
                dosis: codigo === "medicamento" ? datos.dosis : "",
                frecuencia: codigo === "medicamento" ? datos.frecuencia : "",
                via_administracion: codigo === "medicamento"
                    ? datos.via_administracion : "",
            });
        } catch (e) {
            const respuesta = e.response?.data;
            setError(
                respuesta?.detail ||
                (respuesta && Object.entries(respuesta)
                    .map(([campo, valor]) =>
                        `${campo}: ${[].concat(valor).join(" ")}`)
                    .join(" · ")) ||
                "No se pudo guardar. Inténtalo nuevamente."
            );
        } finally {
            setGuardando(false);
        }
    }

    function campo(nombre, etiqueta, maxLength, type = "text") {
        return (
            <label>
                {etiqueta}
                <input
                    name={nombre}
                    type={type}
                    value={datos[nombre]}
                    onChange={cambiar}
                    maxLength={maxLength}
                    required={nombre === "nombre"}
                />
            </label>
        );
    }

    return (
        <form className={styles.editor} onSubmit={guardar}
            aria-busy={guardando}>

            <fieldset disabled={guardando}>
                <div className={styles.formGrid}>
                    <label>
                        Tipo
                        <select name="id_tipo" value={datos.id_tipo}
                            onChange={cambiar} required>
                            <option value="">Selecciona un tipo</option>
                            {tipos.map((tipo) => (
                                <option key={tipo.id} value={tipo.id}>
                                    {tipo.nombre}
                                </option>
                            ))}
                        </select>
                    </label>

                    {campo("nombre", "Nombre", 150)}
                    {campo("fecha_inicio", "Fecha de inicio", undefined, "date")}
                    {campo("fecha_fin", "Fecha de finalización", undefined, "date")}

                    {codigo === "alergia" &&
                        campo("reaccion", "Reacción reportada", 250)}

                    {codigo === "medicamento" && (
                        <>
                            {campo("dosis", "Dosis", 80)}
                            {campo("frecuencia", "Frecuencia", 100)}
                            {campo("via_administracion", "Vía de administración", 60)}
                        </>
                    )}

                    <label>
                        Estado
                        <select name="estado" value={datos.estado}
                            onChange={cambiar}>
                            <option value="vigente">Vigente</option>
                            <option value="resuelto">Resuelto</option>
                            <option value="inactivo">Inactivo</option>
                        </select>
                    </label>

                    <label>
                        Descripción
                        <textarea name="descripcion" rows={3}
                            value={datos.descripcion} onChange={cambiar} />
                    </label>
                </div>

                <label className={styles.check}>
                    <input type="checkbox" name="es_permanente"
                        checked={datos.es_permanente} onChange={cambiar} />
                    Uso o condición permanente
                </label>

                {error && <p role="alert" className={styles.error}>{error}</p>}

                <div className={styles.formActions}>
                    <button type="button" onClick={onCancelar}>
                        Cancelar
                    </button>
                    <button type="submit" className={styles.addButton}>
                        {guardando ? "Guardando…" : "Guardar dato"}
                    </button>
                </div>
            </fieldset>
        </form>
    );
}