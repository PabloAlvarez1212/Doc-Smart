"use client";
import Swal from "sweetalert2";
import { useEffect, useState } from "react";
import Button from "../../../ui/Button/Button";
import Input from "../../../ui/Input/Input";
import styles from "./PersonalInfo.module.css";

export default function PersonalInfo({
    perfil,
    actualizarPerfilPaciente,
    guardando
}) {

    const [nombre, setNombre] = useState("");
    const [apellido, setApellido] = useState("");
    const [fechaNacimiento, setFechaNacimiento] = useState("");
    const [telefono, setTelefono] = useState("");
    const [peso, setPeso] = useState("");
    const [estatura, setEstatura] = useState("");

    useEffect(() => {

        if (!perfil) return;

        setNombre(perfil.nombre ?? "");
        setApellido(perfil.apellido ?? "");
        setFechaNacimiento(
            perfil.fecha_nacimiento ?? ""
        );
        setTelefono(perfil.telefono ?? "");
        setPeso(perfil.peso ?? "");
        setEstatura(perfil.estatura ?? "");

    }, [perfil]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const formData = {
            nombre,
            apellido,
            fecha_nacimiento: fechaNacimiento,
            telefono,
            peso,
            estatura
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
            await actualizarPerfilPaciente(formData);
        }
    };

    return (

        <form
            className={styles.containerPersonalInfo}
            onSubmit={handleSubmit}
        >

            <div className={styles.inputsInfoPersonal}>

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
                                setFechaNacimiento(
                                    e.target.value
                                )
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

                </div>

            </div>

            <div className={styles.inputsInfoMedica}>

                <div className={styles.title}>

                    <h2>Información Médica</h2>

                    <p>
                        Actualiza tus datos médicos
                    </p>

                </div>

                <div className={styles.inputs}>

                    <div className={styles.itemInput}>

                        <label htmlFor="peso">
                            Peso (kg)
                        </label>

                        <Input
                            id="peso"
                            name="peso"
                            type="number"
                            min="20"
                            max="300"
                            step="0.1"
                            value={peso}
                            onChange={(e) =>
                                setPeso(e.target.value)
                            }
                        />

                    </div>

                    <div className={styles.itemInput}>

                        <label htmlFor="estatura">
                            Estatura (metros)
                        </label>

                        <Input
                            id="estatura"
                            name="estatura"
                            type="number"
                            step="0.01"
                            value={estatura}
                            onChange={(e) =>
                                setEstatura(e.target.value)
                            }
                        />

                    </div>

                </div>

            </div>

            <div className={styles.btn}>

                <Button
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