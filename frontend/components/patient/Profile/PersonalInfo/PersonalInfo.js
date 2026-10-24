"use client";

import { HeartPulse, LoaderCircle, LockKeyhole, Mail, Save, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import Button from "../../../ui/Button/Button";
import Input from "../../../ui/Input/Input";
import InfoSalud from "./InfoSalud";
import styles from "./PersonalInfo.module.css";

export default function PersonalInfo({perfil, actualizarPerfilPaciente, guardando, onCambiarCorreo, ocupadoCorreo=false, datosSalud=[], onAgregarSalud, onEditarSalud, onEliminarSalud}) {
    const [nombre,setNombre]=useState(""),[apellido,setApellido]=useState(""),[fechaNacimiento,setFechaNacimiento]=useState(""),[telefono,setTelefono]=useState(""),[peso,setPeso]=useState(""),[estatura,setEstatura]=useState("");
    const [genero,setGenero]=useState(perfil?.genero ?? '');
    const [tipoSangre,setTipoSangre]=useState(perfil?.tipo_sangre ?? '');

    useEffect(()=>{
        if(!perfil)return;
        setNombre(perfil.nombre??"");
        setApellido(perfil.apellido??"");
        setFechaNacimiento(perfil.fecha_nacimiento??"");
        setTelefono(perfil.telefono??"");
        setPeso(perfil.peso??"");
        setEstatura(perfil.estatura??"");
        setGenero(perfil.genero ?? '');
        setTipoSangre(perfil.tipo_sangre ?? '');
    },[perfil?.id,perfil?.nombre,perfil?.apellido,perfil?.fecha_nacimiento,perfil?.telefono,perfil?.peso,perfil?.estatura,perfil?.genero,perfil?.tipo_sangre]);

    const handleSubmit=async event=>{
        event.preventDefault();
        if (guardando || ocupadoCorreo) return;
        const formData={nombre,apellido,fecha_nacimiento:fechaNacimiento,telefono,peso,estatura};
        if (genero) formData.genero=genero;
        if (tipoSangre) formData.tipo_sangre=tipoSangre;
        const result=await Swal.fire({
            title:"¿Actualizar información?",
            text:"Se guardarán los cambios realizados en tu perfil.",
            icon:"question",
            showCancelButton:true,
            confirmButtonText:"Sí, actualizar",
            cancelButtonText:"Cancelar",
            reverseButtons:true,
        });
        if(result.isConfirmed)await actualizarPerfilPaciente(formData);
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit} aria-busy={guardando}>
            <ProfileSection icon={UserRound} title="Información personal" description="Datos que utilizamos para identificarte y mantenernos en contacto.">
                <div className={styles.fieldsGrid}>
                    <ProfileField label="Nombre" htmlFor="nombre" locked>
                        <Input id="nombre" aria-label="Nombre" readOnly name="nombre" value={nombre} onChange={e=>setNombre(e.target.value)}/>
                    </ProfileField>

                    <ProfileField label="Apellido" htmlFor="apellido" locked>
                        <Input id="apellido" aria-label="Apellido" readOnly name="apellido" value={apellido} onChange={e=>setApellido(e.target.value)}/>
                    </ProfileField>

                    <ProfileField label="Fecha de nacimiento" htmlFor="fechaNacimiento" locked>
                        <Input id="fechaNacimiento" aria-label="Fecha de nacimiento" readOnly name="fechaNacimiento" type="date" value={fechaNacimiento} onChange={e=>setFechaNacimiento(e.target.value)}/>
                    </ProfileField>

                    <ProfileField label="Cédula" htmlFor="cedula" locked>
                        <Input id="cedula" aria-label="Cédula" name="cedula" value={perfil?.cedula??""} readOnly/>
                    </ProfileField>

                    <ProfileField label="Teléfono" htmlFor="telefono" className={styles.wideField}>
                        <Input id="telefono" aria-label="Teléfono" name="telefono" value={telefono} onChange={e=>setTelefono(e.target.value)}/>
                    </ProfileField>
                </div>
            </ProfileSection>

            <ProfileSection icon={HeartPulse} title="Información de salud" description="Medidas básicas y antecedentes asociados a tu perfil." medical>
                <div className={styles.medicalGrid}>
                    <ProfileField label="Peso" htmlFor="peso" unit="kg">
                        <Input id="peso" aria-label="Peso" name="peso" type="number" min="20" max="300" step="0.1" value={peso} onChange={e=>setPeso(e.target.value)}/>
                    </ProfileField>

                    <ProfileField label="Estatura" htmlFor="estatura" unit="metros">
                        <Input id="estatura" aria-label="Estatura" name="estatura" type="number" step="0.01" value={estatura} onChange={e=>setEstatura(e.target.value)}/>
                    </ProfileField>
                    <ProfileField label="Género" htmlFor="genero">
                        <select id="genero" name="genero" aria-label="Género" value={genero} onChange={e=>setGenero(e.target.value)} disabled={guardando}>
                            <option value="" disabled>Sin registrar</option>
                            <option value="M">Masculino</option><option value="F">Femenino</option>
                            <option value="OTRO">Otro</option><option value="PREFIERO_NO_DECIR">Prefiero no decir</option>
                        </select>
                    </ProfileField>
                    <ProfileField label="Tipo de sangre" htmlFor="tipo_sangre">
                        <select id="tipo_sangre" name="tipo_sangre" aria-label="Tipo de sangre" value={tipoSangre} onChange={e=>setTipoSangre(e.target.value)} disabled={guardando}>
                            <option value="" disabled>Sin registrar</option>
                            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(tipo=><option key={tipo} value={tipo}>{tipo}</option>)}
                        </select>
                    </ProfileField>
                </div>

                <InfoSalud registros={datosSalud} onAgregar={onAgregarSalud} onEditar={onEditarSalud} onEliminar={onEliminarSalud}/>
            </ProfileSection>

            <footer className={styles.profileActions}>
                <div>
                    <strong>Guarda tus cambios</strong>
                    <span>Confirma la actualización antes de enviar tus datos.</span>
                </div>

                <div className={styles.actionButtons}>
                    <Button
                        type="button"
                        variant="secondary"
                        disabled={guardando||ocupadoCorreo}
                        className={styles.emailButton}
                        onClick={onCambiarCorreo}
                    >
                        <Mail size={17} aria-hidden="true"/>
                        Cambiar correo
                    </Button>

                    <Button
                        type="submit"
                        disabled={guardando||ocupadoCorreo}
                        className={styles.saveButton}
                    >
                        {guardando ? <LoaderCircle size={17} className={styles.spinner} aria-hidden="true"/> : <Save size={17} aria-hidden="true"/>}
                        {guardando?"Guardando...":"Guardar cambios"}
                    </Button>
                </div>
            </footer>
        </form>
    );
}

function ProfileSection({icon:Icon,title,description,medical=false,children}){
    return(
        <section className={`${styles.section} ${medical?styles.medicalSection:""}`}>
            <header className={styles.sectionHeader}>
                <span aria-hidden="true"><Icon size={20}/></span>
                <div><h2>{title}</h2><p>{description}</p></div>
            </header>
            {children}
        </section>
    );
}

function ProfileField({label,htmlFor,locked=false,unit,className="",children}){
    return(
        <div className={`${styles.field} ${locked?styles.lockedField:""} ${className}`}>
            <div className={styles.labelRow}>
                <label htmlFor={htmlFor}>{label}</label>
                {locked&&<span><LockKeyhole size={12} aria-hidden="true"/> Verificado</span>}
                {unit&&<span>{unit}</span>}
            </div>
            {children}
        </div>
    );
}
