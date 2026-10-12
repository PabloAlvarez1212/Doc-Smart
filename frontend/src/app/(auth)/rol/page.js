'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowUpRight, CalendarDays, UserRound, Stethoscope, HeartPulse, MessageCircle, ClipboardList, UsersRound } from 'lucide-react'
import styles from './page.module.css'

const roles=[
    {id:'paciente',title:'Paciente',Icon:UserRound,description:'Gestiona tus citas, consulta tu información y utiliza Bymax para acompañarte en tu experiencia de salud.',features:[[CalendarDays,'Tus citas, en un solo lugar'],[HeartPulse,'Tu información de salud'],[MessageCircle,'Asistencia con Bymax']],action:'Crear cuenta de paciente'},
    {id:'medico',title:'Médico',Icon:Stethoscope,description:'Gestiona tus pacientes, citas y herramientas profesionales dentro de DocSmart.',features:[[UsersRound,'Gestión de pacientes'],[CalendarDays,'Agenda y disponibilidad'],[ClipboardList,'Información clínica']],action:'Iniciar registro médico'}
]

export default function RolPage() {
    const reduced=useReducedMotion()
    return <main className={styles.main}>
        <div className={styles.topbar}>
            <Link href="/" className={styles.back}><ArrowLeft size={18} aria-hidden="true"/> Volver al inicio</Link>
            <Link href="/" className={styles.brand} aria-label="DocSmart, inicio"><Image src="/images/logoCara.png" alt="" width={30} height={30}/><span>Doc<span>Smart</span></span></Link>
        </div>
        <header className={styles.header}>
            <h1>Tu espacio en <span>DocSmart.</span></h1>
            <p>Elige cómo quieres usar DocSmart.<br/>Te acompañamos paso a paso para crear tu cuenta.</p>
        </header>
        <div className={styles.cards}>
            {roles.map(({id,title,Icon,description,features,action},index)=><motion.div key={id} className={styles.cardWrap} initial={{opacity:1,y:10}} animate={{y:0}} transition={{duration:reduced?0:.32,delay:reduced?0:index*.05,ease:[.16,1,.3,1]}}>
                <Link href={`/register?role=${id}`} className={styles.card} data-role={id} aria-labelledby={`role-${id}-title role-${id}-action`} aria-describedby={`role-${id}-description`}>
                    <div className={styles.cardTop}><span className={styles.icon}><Icon size={31} strokeWidth={1.65} aria-hidden="true"/></span>{id==='medico'&&<span className={styles.badge}>Requiere verificación</span>}</div>
                    <h2 id={`role-${id}-title`}>{title}</h2>
                    <p id={`role-${id}-description`} className={styles.description}>{description}</p>
                    <ul className={styles.features}>{features.map(([Feature,text])=><li key={text}><Feature size={18} strokeWidth={1.7} aria-hidden="true"/>{text}</li>)}</ul>
                    <span id={`role-${id}-action`} className={styles.action}>{action}<ArrowUpRight size={20} aria-hidden="true"/></span>
                </Link>
            </motion.div>)}
        </div>
        <footer className={styles.footer}><p>¿Ya tienes una cuenta? <Link href="/login">Inicia sesión</Link></p><span>La identidad y el correo se verifican durante el registro.</span></footer>
    </main>
}
