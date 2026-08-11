'use client';

import { useState } from "react";
import Button from "../../../ui/Button/Button";
import Input from "../../../ui/Input/Input";
import styles from "./PersonalInfo.module.css";

export default function PersonalInfo() {

    const [nombre, setNombre] = useState("Juan");
    const [apellido, setApellido] = useState("Alvarez");
    const [fechaNacimiento, setFechaNacimiento] = useState("2007-11-25");
    const [cedula, setCedula] = useState("10231321");
    const [telefono, setTelefono] = useState("320982372");
    const [peso, setPeso] = useState("70");
    const [estatura, setEstatura] = useState("1.67");

    return (
        <div className={styles.containerPersonalInfo}>

            <div className={styles.inputsInfoPersonal}>

                <div className={styles.title}>
                    <h2>Información Personal</h2>
                    <p>Actualiza tu información personal</p>
                </div>

                <div className={styles.inputs}>

                    <div className={styles.itemInput}>
                        <label htmlFor="nombre">Nombre</label>
                        <Input
                            id="nombre"
                            name="nombre"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                        />
                    </div>

                    <div className={styles.itemInput}>
                        <label htmlFor="apellido">Apellido</label>
                        <Input
                            id="apellido"
                            name="apellido"
                            value={apellido}
                            onChange={(e) => setApellido(e.target.value)}
                        />
                    </div>

                    <div className={styles.itemInput}>
                        <label htmlFor="fechaNacimiento">Fecha de Nacimiento</label>
                        <Input
                            id="fechaNacimiento"
                            name="fechaNacimiento"
                            type="date"
                            value={fechaNacimiento}
                            onChange={(e) => setFechaNacimiento(e.target.value)}
                        />
                    </div>

                    <div className={styles.itemInput}>
                        <label htmlFor="cedula">Cedula</label>
                        <Input
                            id="cedula"
                            name="cedula"
                            value={cedula}
                            readOnly
                            disable
                        />
                    </div>

                    <div className={styles.itemInput}>
                        <label htmlFor="telefono">Télefono</label>
                        <Input
                            id="telefono"
                            name="telefono"
                            value={telefono}
                            onChange={(e) => setTelefono(e.target.value)}
                        />
                    </div>

                </div>
            </div>

            <div className={styles.inputsInfoMedica}>

                <div className={styles.title}>
                    <h2>Información Médica</h2>
                    <p>Actualiza tus datos médicos</p>
                </div>

                <div className={styles.inputs}>

                    <div className={styles.itemInput}>
                        <label htmlFor="peso">Peso (kg)</label>
                        <Input
                            id="peso"
                            name="peso"
                            type="number"
                            min="20"
                            max="300"
                            step="0.1"
                            value={peso}
                            onChange={(e) => setPeso(e.target.value)}
                        />
                    </div>

                    <div className={styles.itemInput}>
                        <label htmlFor="estatura">Estatura (metros)</label>
                        <Input
                            id="estatura"
                            name="estatura"
                            type="number"
                            value={estatura}
                            onChange={(e) => setEstatura(e.target.value)}
                        />
                    </div>

                </div>
            </div>

            <div className={styles.btn}>
                <Button>Guardar cambios</Button>
            </div>

        </div>
    );
}