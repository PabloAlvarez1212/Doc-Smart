"use client";

import { HeartPulse, LockKeyhole, Save, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import Button from "../../../ui/Button/Button";
import Input from "../../../ui/Input/Input";
import InfoSalud from "./InfoSalud";
import styles from "./PersonalInfo.module.css";

export default function PersonalInfo({perfil, actualizarPerfilPaciente, guardando, datosSalud = [], onAgregarSalud, onEditarSalud, onEliminarSalud}) {
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
        setFechaNacimiento(perfil.fecha_nacimiento ?? "");
        setTelefono(perfil.telefono ?? "");
        setPeso(perfil.peso ?? "");
        setEstatura(perfil.estatura ?? "");
    }, [perfil]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        const formData = {
            nombre,
            apellido,
            fecha_nacimiento: fechaNacimiento,
            telefono,
            peso,
            estatura,
        };
        const result = await Swal.fire({
            title: "¿Actualizar información?",
            text: "Se guardarán los cambios realizados en tu perfil.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, actualizar",
            cancelButtonText: "Cancelar",
            reverseButtons: true,
        });

        if (result.isConfirmed) await actualizarPerfilPaciente(formData);
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit} aria-busy={guardando}>
            <ProfileSection
                icon={UserRound}
                title="Información personal"
                description="Datos que utilizamos para identificarte y mantenernos en contacto."
            >
                <div className={styles.fieldsGrid}>
                    <ProfileField label="Nombre" htmlFor="nombre" locked>
                        <Input id="nombre" readOnly name="nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} />
                    </ProfileField>

                    <ProfileField label="Apellido" htmlFor="apellido" locked>
                        <Input id="apellido" readOnly name="apellido" value={apellido} onChange={(event) => setApellido(event.target.value)} />
                    </ProfileField>

                    <ProfileField label="Fecha de nacimiento" htmlFor="fechaNacimiento" locked>
                        <Input id="fechaNacimiento" readOnly name="fechaNacimiento" type="date" value={fechaNacimiento} onChange={(event) => setFechaNacimiento(event.target.value)} />
                    </ProfileField>

                    <ProfileField label="Cédula" htmlFor="cedula" locked>
                        <Input id="cedula" name="cedula" value={perfil?.cedula ?? ""} readOnly />
                    </ProfileField>

                    <ProfileField label="Teléfono" htmlFor="telefono" className={styles.wideField}>
                        <Input id="telefono" name="telefono" value={telefono} onChange={(event) => setTelefono(event.target.value)} />
                    </ProfileField>
                </div>
            </ProfileSection>

            <ProfileSection
                icon={HeartPulse}
                title="Información de salud"
                description="Medidas básicas y antecedentes asociados a tu perfil."
                medical
            >
                <div className={styles.medicalGrid}>
                    <ProfileField label="Peso" htmlFor="peso" unit="kg">
                        <Input id="peso" name="peso" type="number" min="20" max="300" step="0.1" value={peso} onChange={(event) => setPeso(event.target.value)} />
                    </ProfileField>

                    <ProfileField label="Estatura" htmlFor="estatura" unit="metros">
                        <Input id="estatura" name="estatura" type="number" step="0.01" value={estatura} onChange={(event) => setEstatura(event.target.value)} />
                    </ProfileField>
                </div>

                <InfoSalud
                    registros={datosSalud}
                    onAgregar={onAgregarSalud}
                    onEditar={onEditarSalud}
                    onEliminar={onEliminarSalud}
                />
            </ProfileSection>

            <footer className={styles.actions}>
                <div>
                    <strong>Guarda tus cambios</strong>
                    <span>Confirma la actualización antes de enviar tus datos.</span>
                </div>
                <Button type="submit" disabled={guardando} className={styles.saveButton}>
                    <Save size={17} aria-hidden="true" />
                    {guardando ? "Guardando..." : "Guardar cambios"}
                </Button>
            </footer>
        </form>
    );
}

function ProfileSection({ icon: Icon, title, description, medical = false, children }) {
    return (
        <section className={`${styles.section} ${medical ? styles.medicalSection : ""}`}>
            <header className={styles.sectionHeader}>
                <span aria-hidden="true"><Icon size={20} /></span>
                <div>
                    <h2>{title}</h2>
                    <p>{description}</p>
                </div>
            </header>
            {children}
        </section>
    );
}

function ProfileField({ label, htmlFor, locked = false, unit, className = "", children }) {
    return (
        <div className={`${styles.field} ${locked ? styles.lockedField : ""} ${className}`}>
            <div className={styles.labelRow}>
                <label htmlFor={htmlFor}>{label}</label>
                {locked && <span><LockKeyhole size={12} aria-hidden="true" /> Verificado</span>}
                {unit && <span>{unit}</span>}
            </div>
            {children}
        </div>
    );
}
