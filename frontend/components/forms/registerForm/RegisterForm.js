'use client'

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CreditCard, FileUp, FileText, RefreshCw, CheckCircle2, MailCheck, Check, X } from 'lucide-react'
import VerificationStatus from '../../ui/VerificationStatus/VerificationStatus'
import Input from '../../ui/Input/Input'
import Button from '../../ui/Button/Button'
import { useRegister } from './UseRegister'
import styles from './RegisterForm.module.css'

function Field({name,label,form,errors,handleChange,locked,feedback,type='text',options,autoComplete}) {
    const id=`register-${name}`
    const error=errors[name]
    const reduced=useReducedMotion()
    const props={id,name,'aria-label':label,value:form[name],onChange:handleChange,'aria-invalid':Boolean(error),'aria-describedby':error?`${id}-error`:undefined}
    return <div className={styles.fieldFull}>
        <label className={styles.fieldLabel} htmlFor={id}>{label}</label>
        {options ? <select {...props} disabled={locked} className={styles.select}>
            <option value="">Seleccionar</option>{options.map(([value,text])=><option key={value} value={value}>{text}</option>)}
        </select> : <Input {...props} placeholder={label} type={type} autoComplete={autoComplete} readOnly={locked} validationAttempt={feedback.kind==='error'?feedback.revision:0} />}
        {error && <motion.p key={`${name}-${feedback.revision}`} animate={{x:reduced?0:[0,-3,3,0]}} transition={{duration:.18}} id={`${id}-error`} className={styles.error}>{error}</motion.p>}
    </div>
}

function VerificationHeader({Icon,title,children}) {
    return <div className={styles.verificationHeader}>
        <div className={styles.verificationIcon}><Icon size={28} aria-hidden="true" /></div>
        <div className={styles.verificationText}><strong>{title}</strong><p>{children}</p></div>
    </div>
}

const formatFileSize=bytes=>bytes<1024?`${bytes} B`:bytes<1024*1024?`${Math.round(bytes/1024)} KB`:`${(bytes/1024/1024).toFixed(1)} MB`

// Recupera la presentación original del paciente para todas las cargas del registro.
function Upload({id,label,file,onChange,accept,disabled,error,help,verified=false}) {
    const isPDF=accept==='application/pdf'
    const StatusIcon=verified?CheckCircle2:FileText
    return <div className={styles.resumeUpload}>
        <input id={id} className={styles.fileInput} type="file" accept={accept} disabled={disabled} onChange={onChange} aria-label={label} aria-invalid={Boolean(error)} aria-describedby={`${id}-help${error?' '+id+'-error':''}`} />
        {file ? <div className={`${styles.uploadSurface} ${styles.selectedFile}`} data-verified={verified}>
            <span className={styles.fileIcon}><FileText size={25} aria-hidden="true" /></span>
            <div className={styles.fileDetails}>
                <span className={styles.fileRole}>{label}</span>
                <div className={styles.fileNameRow}><strong title={file.name}>{file.name}</strong><StatusIcon size={17} aria-label={verified?'Documento verificado':'Archivo seleccionado, pendiente de verificación'}/></div>
                <span id={`${id}-help`}>{formatFileSize(file.size)} · {verified?'Verificado':'Seleccionado'}</span>
            </div>
            <label className={styles.changeFile} htmlFor={id}><RefreshCw size={15} aria-hidden="true" />Cambiar{isPDF?' PDF':''}</label>
        </div> : <div className={styles.uploadSurface}>
            <span className={styles.uploadIcon}><FileUp size={28} aria-hidden="true" /></span>
            <div className={styles.uploadCopy}><strong>{label}</strong><p id={`${id}-help`}>{help}</p></div>
            <label className={styles.selectFile} htmlFor={id}><FileUp size={17} aria-hidden="true" />Seleccionar {isPDF?'PDF':'imagen'}</label>
        </div>}
        {error && <p className={styles.error} id={`${id}-error`}>{error}</p>}
    </div>
}

const documentos=[['CC','Cédula de ciudadanía'],['TI','Tarjeta de identidad'],['PASAPORTE','Pasaporte'],['RC','Registro civil']]
const generos=[['M','Masculino'],['F','Femenino'],['OTRO','Otro'],['PREFIERO_NO_DECIR','Prefiero no decir']]
const sangre=['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v=>[v,v])

export default function RegisterForm({role,setRole}) {
    const state=useRegister(role,setRole)
    const {form,feedback,step,loading,errors,especialidades,departamentos,ciudades,handleChange,
        handleSubmit,handleBack,handleReenviarOtp,otp,setOtp,documentoFrente,setDocumentoFrente,
        documentoReverso,setDocumentoReverso,procesoId,documentoVerificado,correoConfigurado,correoVerificado,comparaciones}=state
    const reduced=useReducedMotion()
    const titleRef=useRef(null)
    const previousStep=useRef(step)
    useEffect(()=>{if(previousStep.current!==step){previousStep.current=step;titleRef.current?.focus()}},[step])
    const medical=role==='medico'
    const labels=['Datos personales','Documento de identidad',medical?'Datos profesionales':'Datos adicionales','Correo y contraseña','Verificación de correo']
    const locked=loading || (step===1?Boolean(procesoId):correoConfigurado)
    const field=(name,label,props={})=><Field key={name} {...{name,label,form,errors,handleChange,locked,feedback}} {...props} />
    return <form className={styles.form} onSubmit={handleSubmit} aria-busy={loading} noValidate>
        <VerificationStatus state={feedback} />
        <div className={styles.progress} role="progressbar" aria-valuemin={1} aria-valuemax={5} aria-valuenow={step} aria-valuetext={labels[step-1]} aria-label="Progreso del registro">
            {labels.map((label,i)=><span key={label} data-complete={i<step} />)}
        </div>
        <AnimatePresence initial={false} mode="wait" onExitComplete={()=>titleRef.current?.focus()}>
            <motion.div className={styles.inputs} key={step} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:reduced?0:.18}} onAnimationComplete={()=>{if(step>1)titleRef.current?.focus()}}>
                <h3 ref={titleRef} tabIndex={-1} className={styles.stepTitle}>Paso {step} de 5 · {labels[step-1]}</h3>
                {((step===1&&procesoId)||([3,4].includes(step)&&correoConfigurado))&&<p className={styles.savedNotice}>Estos datos ya están guardados y se muestran solo para consulta.</p>}
                {step===1&&<>
                    {field('nombre','Nombre',{autoComplete:'given-name'})}
                    {field('apellido','Apellido',{autoComplete:'family-name'})}
                    {field('tipo_documento','Tipo de documento',{options:documentos})}
                    {field('numero_documento','Número de documento')}
                    {field('fecha_nacimiento','Fecha de nacimiento',{type:'date',autoComplete:'bday'})}
                    {medical&&<p className={styles.savedNotice}>El registro profesional requiere ser mayor de edad.</p>}
                </>}
                {step===2&&<>
                    <VerificationHeader Icon={CreditCard} title="Verifica tu identidad">Carga imágenes claras de tu documento.</VerificationHeader>
                    <Upload id="documento-frente" label="Frente del documento" file={documentoFrente} onChange={e=>setDocumentoFrente(e.target.files?.[0]??null)} accept="image/jpeg,image/png,image/webp" disabled={loading||documentoVerificado} verified={documentoVerificado} help="JPG, PNG o WEBP · máximo 8 MB · imagen completa y legible" error={errors.documento_frente||errors.documento} />
                    {form.tipo_documento==='CC'&&<Upload id="documento-reverso" label="Reverso del documento" file={documentoReverso} onChange={e=>setDocumentoReverso(e.target.files?.[0]??null)} accept="image/jpeg,image/png,image/webp" disabled={loading||documentoVerificado} verified={documentoVerificado} help="JPG, PNG o WEBP · máximo 8 MB" error={errors.documento_reverso} />}
                    {comparaciones&&<ul className={styles.comparisons} aria-label="Comparación de los datos del documento" aria-live="polite">{[['nombre','Nombre'],['apellido','Apellido'],['numero_documento','Número de documento'],['fecha_nacimiento','Fecha de nacimiento']].map(([key,label])=><li key={key}><span>{label}</span><span data-match={comparaciones[key]}>{comparaciones[key]?<Check size={16}/>:<X size={16}/>} {comparaciones[key]?'Coincide':'No coincide'}</span></li>)}</ul>}
                    {['nombre','apellido','numero_documento','fecha_nacimiento'].filter(key=>errors[key]).map(key=><p key={key} className={styles.error}>{errors[key]}</p>)}
                </>}
                {step===3&&<>
                    {comparaciones&&<ul className={styles.comparisons} aria-label="Comparación de los datos del documento" aria-live="polite">{[['nombre','Nombre'],['apellido','Apellido'],['numero_documento','Número de documento'],['fecha_nacimiento','Fecha de nacimiento']].map(([key,label])=><li key={key}><span>{label}</span><span data-match={comparaciones[key]}>{comparaciones[key]?<Check size={16}/>:<X size={16}/>} {comparaciones[key]?'Coincide':'No coincide'}</span></li>)}</ul>}
                    {field('telefono','Teléfono celular',{type:'tel',autoComplete:'tel'})}
                    {medical?<>
                        {field('direccion','Dirección',{autoComplete:'street-address'})}
                        {field('departamento_filtro','Departamento',{options:departamentos.map(d=>[String(d.id_departamento??d.id),d.nombre_departamento??d.nombre])})}
                        {field('id_ciudad','Ciudad',{options:ciudades.map(c=>[String(c.id_ciudad??c.id),c.nombre_ciudad??c.nombre]),locked:locked||!form.departamento_filtro})}
                        {field('id_especialidad','Especialidad',{options:especialidades.map(e=>[String(e.id),e.nombre])})}
                        <Upload id="hoja-vida" label="Hoja de vida profesional" file={form.hoja_vida} onChange={e=>handleChange({target:{name:'hoja_vida',files:e.target.files}})} accept="application/pdf" disabled={locked} help="PDF · máximo 5 MB · será revisado por el equipo de DocSmart" error={errors.hoja_vida} />
                        <p className={styles.savedNotice}>Tu cuenta quedará pendiente de aprobación profesional. Las herramientas médicas se habilitan después de la revisión.</p>
                    </>:<>
                        <div className={styles.twoColumns}>{field('estatura','Estatura (m)')}{field('peso','Peso (kg)')}</div>
                        <div className={styles.twoColumns}>{field('genero','Género',{options:generos})}{field('tipo_sangre','Tipo de sangre',{options:sangre})}</div>
                    </>}
                </>}
                {step===4&&<>
                    {field('correo','Correo electrónico',{type:'email',autoComplete:'email'})}
                    {field('contraseña','Contraseña',{type:'password',autoComplete:'new-password'})}
                    <p className={styles.savedNotice}>Al menos 8 caracteres, mayúscula, minúscula, número y carácter especial (por ejemplo !). No uses comillas, &amp;, &lt;, &gt; o barra invertida.</p>
                    {field('confirmar_contraseña','Confirmar contraseña',{type:'password',autoComplete:'new-password'})}
                </>}
                {step===5&&<>
                    <VerificationHeader Icon={MailCheck} title="Verifica tu correo">Ingresa el código enviado a {form.correo}</VerificationHeader>
                    <Button type="button" variant="secondary" onClick={handleReenviarOtp} disabled={loading||correoVerificado}>Reenviar código</Button>
                    <label htmlFor="register-codigo" className={styles.fieldLabel}>Código de verificación</label>
                    <Input placeholder="Código de verificación" id="register-codigo" aria-label="Código de verificación" name="codigo" value={otp} onChange={e=>setOtp(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} readOnly={loading||correoVerificado} aria-invalid={Boolean(errors.codigo)} aria-describedby={errors.codigo?'register-codigo-error':undefined} validationAttempt={feedback.kind==='error'?feedback.revision:0}/>
                    {errors.codigo&&<p id="register-codigo-error" className={styles.error}>{errors.codigo}</p>}

                </>}
                {errors.general&&<p className={styles.error} role="alert">{errors.general}</p>}
                <div className={styles.buttons}>
                    <Button type="button" variant="secondary" onClick={handleBack} disabled={loading}>Atrás</Button>
                    <Button type="submit" variant="primary" disabled={loading}>{loading?'Verificando…':step===2?(documentoVerificado?'Continuar':'Verificar documento'):step===4?'Enviar código':step===5?(correoVerificado?'Completar registro':'Verificar y completar'):'Continuar'}</Button>
                </div>
            </motion.div>
        </AnimatePresence>
    </form>
}
