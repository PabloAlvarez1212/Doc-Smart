"use client";

import { ArrowRight, Eye, EyeOff, HeartPulse, Info, LoaderCircle, LockKeyhole, Mail, Save, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Modal from "../../../ui/Modal/Modal";
import Button from "../../../ui/Button/Button";
import Input from "../../../ui/Input/Input";
import InfoSalud from "./InfoSalud";
import styles from "./PersonalInfo.module.css";

export default function PersonalInfo({perfil, actualizarPerfilPaciente, guardando, onCambiarCorreo, ocupadoCorreo=false, datosSalud=[], onAgregarSalud, onEditarSalud, onEliminarSalud}) {
    const [nombre,setNombre]=useState(""),[apellido,setApellido]=useState(""),[fechaNacimiento,setFechaNacimiento]=useState(""),[telefono,setTelefono]=useState(""),[peso,setPeso]=useState(""),[estatura,setEstatura]=useState("");
    const [verCedula,setVerCedula]=useState(false);
    const [pendiente,setPendiente]=useState(null);
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

    const GENEROS={M:"Masculino",F:"Femenino",OTRO:"Otro",PREFIERO_NO_DECIR:"Prefiero no decir"};
    const vacio=valor=>String(valor??"").trim()===""?"Sin dato":String(valor);

    // Lo que cambia respecto a lo guardado: se muestra antes de confirmar.
    const cambios=useMemo(()=>{
        const lista=[];
        if(telefono!==(perfil?.telefono??""))lista.push(["Teléfono",vacio(perfil?.telefono),vacio(telefono)]);
        if(String(peso)!==String(perfil?.peso??""))lista.push(["Peso",perfil?.peso!=null?`${perfil.peso} kg`:"Sin dato",peso!==""?`${peso} kg`:"Sin dato"]);
        if(String(estatura)!==String(perfil?.estatura??""))lista.push(["Estatura",perfil?.estatura!=null?`${perfil.estatura} m`:"Sin dato",estatura!==""?`${estatura} m`:"Sin dato"]);
        if(genero!==(perfil?.genero??""))lista.push(["Género",GENEROS[perfil?.genero]||"Sin dato",GENEROS[genero]||"Sin dato"]);
        if(tipoSangre!==(perfil?.tipo_sangre??""))lista.push(["Tipo de sangre",vacio(perfil?.tipo_sangre),vacio(tipoSangre)]);
        return lista;
    },[telefono,peso,estatura,genero,tipoSangre,perfil?.telefono,perfil?.peso,perfil?.estatura,perfil?.genero,perfil?.tipo_sangre]);

    const handleSubmit=async event=>{
        event.preventDefault();
        if (guardando || ocupadoCorreo || !cambios.length) return;
        const formData={nombre,apellido,fecha_nacimiento:fechaNacimiento,telefono,peso,estatura};
        if (genero) formData.genero=genero;
        if (tipoSangre) formData.tipo_sangre=tipoSangre;
        setPendiente(formData);
    };

    const confirmar=async()=>{
        if(!pendiente)return;
        const ok=await actualizarPerfilPaciente(pendiente);
        if(ok!==false)setPendiente(null);
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
                        <div className={styles.secretField}>
                            <Input id="cedula" aria-label="Cédula" name="cedula" value={verCedula ? (perfil?.cedula??"") : ocultarDocumento(perfil?.cedula)} readOnly/>
                            <button type="button" className={styles.revealButton} onClick={()=>setVerCedula(v=>!v)} aria-pressed={verCedula} aria-label={verCedula?"Ocultar cédula":"Mostrar cédula"}>
                                {verCedula ? <EyeOff size={18} aria-hidden="true"/> : <Eye size={18} aria-hidden="true"/>}
                            </button>
                        </div>
                    </ProfileField>

                    <ProfileField label="Correo electrónico" htmlFor="correo" locked>
                        <Input id="correo" aria-label="Correo electrónico" name="correo" value={perfil?.correo??""} readOnly/>
                    </ProfileField>

                    <ProfileField label="Teléfono" htmlFor="telefono">
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

            <Modal
                abierto={Boolean(pendiente)}
                onCerrar={()=>{if(!guardando)setPendiente(null);}}
                titulo="¿Guardar los cambios?"
                text="Revisa lo que se va a actualizar en tu perfil."
                width="520px"
                icon={<ShieldCheck size={22} aria-hidden="true"/>}
                footer={<>
                    <button type="button" className={styles.modalCancel} onClick={()=>setPendiente(null)} disabled={guardando}>Seguir editando</button>
                    <button type="button" className={styles.modalSave} onClick={confirmar} disabled={guardando}>
                        {guardando?<><LoaderCircle size={17} className={styles.spinner} aria-hidden="true"/>Guardando...</>:<><Save size={17} aria-hidden="true"/>Confirmar y guardar</>}
                    </button>
                </>}
            >
                <ul className={styles.changeList}>
                    {cambios.map(([campo,antes,despues])=>(
                        <li key={campo}>
                            <strong>{campo}</strong>
                            <span className={styles.before}>{antes}</span>
                            <ArrowRight size={15} aria-hidden="true"/>
                            <span className={styles.after}>{despues}</span>
                        </li>
                    ))}
                </ul>
                <p className={styles.modalNote}><Info size={15} aria-hidden="true"/>Tu nombre, apellido, fecha de nacimiento y cédula no cambian desde aquí porque ya están verificados.</p>
            </Modal>
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

// Muestra solo los últimos dígitos hasta que la persona decida revelar su documento.
function ocultarDocumento(valor){
    const texto=String(valor??"");
    if(!texto)return "";
    return texto.length<=3?"•".repeat(texto.length):`${"•".repeat(Math.min(texto.length-3,8))}${texto.slice(-3)}`;
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
