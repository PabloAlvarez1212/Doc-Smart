"use client";

import Swal from "sweetalert2";
import { useEffect, useState } from "react";
import Button from "../../../ui/Button/Button";
import Input from "../../../ui/Input/Input";
import ConsultorioMap from "../../../ui/ConsultorioMap/ConsultorioMap";
import styles from "./PersonalInfo.module.css";

export default function PersonalInfo({
    perfil,
    actualizarPerfilMedico,
    guardando,
}) {
    const [nombre, setNombre] = useState("");
    const [apellido, setApellido] = useState("");
    const [fechaNacimiento, setFechaNacimiento] = useState("");
    const [telefono, setTelefono] = useState("");
    const [correo, setCorreo] = useState("");

    const [direccion, setDireccion] = useState("");
    const [latitud, setLatitud] = useState("");
    const [longitud, setLongitud] = useState("");
    const [ciudad, setCiudad] = useState("");
    const [especialidad, setEspecialidad] = useState("");
    const [errorUbicacion, setErrorUbicacion] = useState("");

    useEffect(() => {
        if (!perfil) return;

        setNombre(perfil.nombre ?? "");
        setApellido(perfil.apellido ?? "");
        setFechaNacimiento(perfil.fecha_nacimiento ?? "");
        setTelefono(perfil.telefono ?? "");
        setCorreo(perfil.correo ?? "");

        setDireccion(perfil.direccion ?? "");
        setLatitud(perfil.latitud ?? "");
        setLongitud(perfil.longitud ?? "");
        setCiudad(perfil.ciudad ?? "");
        setEspecialidad(perfil.especialidad ?? "");
        setErrorUbicacion("");
    }, [perfil]);

    const handleUbicacion = (ubicacion) => {
        if (guardando) return;

        setDireccion(ubicacion.direccion);
        setLatitud(ubicacion.latitud);
        setLongitud(ubicacion.longitud);
        setErrorUbicacion("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (guardando) return;

        const tieneValor = (valor) =>
            valor != null && String(valor).trim() !== "";

        const tieneLatitud = tieneValor(latitud);
        const tieneLongitud = tieneValor(longitud);

        const ubicacionValida =
            tieneLatitud &&
            tieneLongitud &&
            Number.isFinite(Number(latitud)) &&
            Number.isFinite(Number(longitud)) &&
            Math.abs(Number(latitud)) <= 90 &&
            Math.abs(Number(longitud)) <= 180;

        const cambioDireccion =
            direccion !== (perfil?.direccion ?? "");

        if (
            !ubicacionValida &&
            (cambioDireccion || tieneLatitud || tieneLongitud)
        ) {
            setErrorUbicacion(
                "Selecciona una dirección de las sugerencias del mapa."
            );
            return;
        }

        if (
            ubicacionValida &&
            (!direccion.trim() || direccion.length > 100)
        ) {
            setErrorUbicacion(
                "La dirección debe tener entre 1 y 100 caracteres."
            );
            return;
        }

        const formData = {
            nombre,
            apellido,
            fecha_nacimiento: fechaNacimiento,
            telefono,
            correo,
        };

        if (ubicacionValida) {
            formData.direccion = direccion;
            formData.latitud = Number(latitud).toFixed(7);
            formData.longitud = Number(longitud).toFixed(7);
        }

        const result = await Swal.fire({
            title: "¿Actualizar información?",
            text: "Se guardarán tus datos y la ubicación del consultorio.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, actualizar",
            cancelButtonText: "Cancelar",
            reverseButtons: true,
        });

        if (result.isConfirmed) {
            await actualizarPerfilMedico(formData);
        }
    };

    return (
        <form
            className={styles.containerPersonalInfo}
            onSubmit={handleSubmit}
            aria-busy={guardando}
        >
            <div className={styles.infoSection}>
                <div className={styles.title}>
                    <h2>Información Personal</h2>
                    <p>Consulta y actualiza tus datos personales.</p>
                </div>

                <div className={`${styles.inputs} ${styles.professionalGrid}`}>
                    <div className={styles.itemInput}>
                        <label htmlFor="nombre">Nombre</label>
                        <Input
                            id="nombre"
                            name="nombre"
                            value={nombre}
                            onChange={(event) =>
                                setNombre(event.target.value)
                            }
                            disabled={guardando}
                        />
                    </div>

                    <div className={styles.itemInput}>
                        <label htmlFor="apellido">Apellido</label>
                        <Input
                            id="apellido"
                            name="apellido"
                            value={apellido}
                            onChange={(event) =>
                                setApellido(event.target.value)
                            }
                            disabled={guardando}
                        />
                    </div>

                    <div className={styles.itemInput}>
                        <label htmlFor="fechaNacimiento">
                            Fecha de nacimiento
                        </label>
                        <Input
                            id="fechaNacimiento"
                            name="fechaNacimiento"
                            type="date"
                            value={fechaNacimiento}
                            onChange={(event) =>
                                setFechaNacimiento(event.target.value)
                            }
                            disabled={guardando}
                        />
                    </div>

                    <div className={styles.itemInput}>
                        <label htmlFor="cedula">Cédula</label>
                        <Input
                            id="cedula"
                            name="cedula"
                            value={perfil?.cedula ?? ""}
                            readOnly
                        />
                    </div>

                    <div className={styles.itemInput}>
                        <label htmlFor="telefono">Teléfono</label>
                        <Input
                            id="telefono"
                            name="telefono"
                            type="tel"
                            value={telefono}
                            onChange={(event) =>
                                setTelefono(event.target.value)
                            }
                            disabled={guardando}
                        />
                    </div>

                    <div className={styles.itemInput}>
                        <label htmlFor="correo">Correo</label>
                        <Input
                            id="correo"
                            name="correo"
                            type="email"
                            value={correo}
                            onChange={(event) =>
                                setCorreo(event.target.value)
                            }
                            disabled={guardando}
                        />
                    </div>
                </div>
            </div>

            <div className={styles.infoSection}>
                <div className={styles.title}>
                    <h2>Información Profesional</h2>
                    <p>
                        Configura dónde atiendes para que los pacientes
                        puedan encontrar tu consultorio.
                    </p>
                </div>

                <div className={styles.inputs}>
                    <div className={styles.itemInput}>
                        <label htmlFor="especialidad">
                            Especialidad
                        </label>
                        <Input
                            id="especialidad"
                            name="especialidad"
                            value={especialidad}
                            readOnly
                        />
                    </div>

                    <div className={styles.itemInput}>
                        <label htmlFor="ciudad">Ciudad</label>
                        <Input
                            id="ciudad"
                            name="ciudad"
                            value={ciudad}
                            readOnly
                        />
                    </div>

                    <div className={styles.itemInput}>
                        <label htmlFor="direccion">Dirección del consultorio</label>

                        <Input
                            id="direccion"
                            name="direccion"
                            value={direccion}
                            placeholder="Selecciona la dirección en el mapa"
                            readOnly
                        />
                    </div>
                </div>

                <div className={styles.mapContainer}>
                    <ConsultorioMap
                        direccion={direccion}
                        latitud={latitud}
                        longitud={longitud}
                        onChange={handleUbicacion}
                        disabled={guardando}
                        error={errorUbicacion}
                    />
                </div>
            </div>

            <div className={styles.btn}>
                <Button
                    className={styles.btnGreen}
                    type="submit"
                    disabled={guardando}
                >
                    {guardando ? "Guardando..." : "Guardar cambios"}
                </Button>
            </div>
        </form>
    );
}