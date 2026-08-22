"use client";

import Swal from "sweetalert2";
import { useEffect, useState } from "react";
import Button from "../../../ui/Button/Button";
import Input from "../../../ui/Input/Input";
import styles from "./PersonalInfo.module.css";

export default function PersonalInfo({
    perfil,
    actualizarPerfilMedico,
    guardando
}) {
    // Información personal
    const [nombre, setNombre] = useState("");
    const [apellido, setApellido] = useState("");
    const [fechaNacimiento, setFechaNacimiento] = useState("");
    const [telefono, setTelefono] = useState("");
    const [correo, setCorreo] = useState("");

    // Información profesional
    const [direccion, setDireccion] = useState("");
    const [ciudad, setCiudad] = useState("");
    const [especialidad, setEspecialidad] = useState("");

    useEffect(() => {
        if (!perfil) return;

        setNombre(perfil.nombre ?? "");
        setApellido(perfil.apellido ?? "");
        setFechaNacimiento(perfil.fecha_nacimiento ?? "");
        setTelefono(perfil.telefono ?? "");
        setCorreo(perfil.correo ?? "");

        setDireccion(perfil.direccion ?? "");
        setCiudad(perfil.ciudad ?? "");
        setEspecialidad(perfil.especialidad ?? "");
    }, [perfil]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const formData = {
            nombre,
            apellido,
            fecha_nacimiento: fechaNacimiento,
            telefono,
            correo,
            direccion
        };

        const result = await Swal.fire({
            title: "¿Actualizar información?",
            text: "Se guardarán los cambios realizados en tu perfil.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, actualizar",
            cancelButtonText: "Cancelar",
            reverseButtons: true
        });

        if (result.isConfirmed) {
            await actualizarPerfilMedico(formData);
        }
    };

    return (
        <form
            className={styles.containerPersonalInfo}
            onSubmit={handleSubmit}
        >
            <div className={styles.infoSection}>

                <div className={styles.title}>
                    <h2>Información Personal</h2>

                    <p>
                        Actualiza tu información personal
                    </p>
                </div>

                <div className={styles.inputs}>

                    <div className={styles.itemInput}>
                        <label htmlFor="nombre">
                            Nombre
                        </label>

                        <Input
                            id="nombre"
                            name="nombre"
                            value={nombre}
                            onChange={(e) =>
                                setNombre(e.target.value)
                            }
                        />
                    </div>

                    <div className={styles.itemInput}>
                        <label htmlFor="apellido">
                            Apellido
                        </label>

                        <Input
                            id="apellido"
                            name="apellido"
                            value={apellido}
                            onChange={(e) =>
                                setApellido(e.target.value)
                            }
                        />
                    </div>

                    <div className={styles.itemInput}>
                        <label htmlFor="fechaNacimiento">
                            Fecha de Nacimiento
                        </label>

                        <Input
                            id="fechaNacimiento"
                            name="fechaNacimiento"
                            type="date"
                            value={fechaNacimiento}
                            onChange={(e) =>
                                setFechaNacimiento(e.target.value)
                            }
                        />
                    </div>

                    <div className={styles.itemInput}>
                        <label htmlFor="cedula">
                            Cédula
                        </label>

                        <Input
                            id="cedula"
                            name="cedula"
                            value={perfil?.cedula ?? ""}
                            readOnly
                        />
                    </div>

                    <div className={styles.itemInput}>
                        <label htmlFor="telefono">
                            Teléfono
                        </label>

                        <Input
                            id="telefono"
                            name="telefono"
                            value={telefono}
                            onChange={(e) =>
                                setTelefono(e.target.value)
                            }
                        />
                    </div>

                    <div className={styles.itemInput}>
                        <label htmlFor="correo">
                            Correo
                        </label>

                        <Input
                            id="correo"
                            name="correo"
                            type="email"
                            value={correo}
                            onChange={(e) =>
                                setCorreo(e.target.value)
                            }
                        />
                    </div>

                </div>

            </div>
            <div className={styles.infoSection}>

                <div className={styles.title}>
                    <h2>Información Profesional</h2>

                    <p>
                        Actualiza tu información profesional
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
                        <label htmlFor="ciudad">
                            Ciudad
                        </label>

                        <Input
                            id="ciudad"
                            name="ciudad"
                            value={ciudad}
                            readOnly
                        />
                    </div>

                    <div className={styles.itemInput}>
                        <label htmlFor="direccion">
                            Dirección
                        </label>

                        <Input
                            id="direccion"
                            name="direccion"
                            value={direccion}
                            onChange={(e) =>
                                setDireccion(e.target.value)
                            }
                        />
                    </div>

                </div>

            </div>
            <div className={styles.btn}>
                <Button className={styles.btnGreen}
                    type="submit"
                    disabled={guardando}
                >
                    {guardando
                        ? "Guardando..."
                        : "Guardar cambios" 
                    }
                </Button>
            </div>

        </form>
    );
}