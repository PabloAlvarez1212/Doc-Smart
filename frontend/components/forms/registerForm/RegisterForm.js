'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import VerificationStatus from '../../ui/VerificationStatus/VerificationStatus'
import { CheckCircle2, FileText, FileUp, RefreshCw, MailCheck, CreditCard } from 'lucide-react'
import Input from '../../ui/Input/Input.js'
import Button from '../../ui/Button/Button.js'
import styles from './RegisterForm.module.css'
import { useRegister } from './UseRegister'

const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Componente de formulario de registro por pasos, adaptado según el rol (paciente o médico)
export default function RegisterForm({ role, setRole }) {

    // Obtiene estado, datos y manejadores desde el hook personalizado
    const {
        form,
        feedback,
        step,
        setStep,
        loading,
        errors,
        especialidades,
        departamentos,
        ciudades,
        handleChange,
        handleNextStep,
        handleSubmit,
        otp,
        setOtp,
        documentoFrente,
        setDocumentoFrente,
        documentoReverso,
        setDocumentoReverso,
        handleVerificarOtp,
        handleDocumento,
        handleBack,
        handleReenviarOtp,
        procesoId,
        documentoVerificado,
        correoConfigurado,
        correoVerificado,
    } = useRegister(role, setRole)

    const reduced = useReducedMotion()
    const totalSteps = role === "paciente" ? 5 : 3

    return (
        <form className={styles.form} onSubmit={handleSubmit} aria-busy={loading} noValidate>

            <VerificationStatus state={feedback} />

            <div
                className={styles.progress}
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={totalSteps}
                aria-valuenow={step}
                aria-label="Progreso del registro"
            >
                {Array.from({ length: totalSteps }, (_, i) => (
                    <span
                        key={`${role}-progress-${i}`}
                        data-complete={i < step}
                    />
                ))}
            </div>

            <AnimatePresence initial={false} mode="wait">
                <motion.div
                    key={step}
                    className={styles.inputs}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: reduced ? 0 : .2 }}
                >

                    {role === 'medico' && (
                        <p className={styles.stepTitle}>
                            Paso {step} de 3 · {[
                                'Datos personales',
                                'Ubicación y especialidad',
                                'Credenciales y hoja de vida'
                            ][step - 1]}
                        </p>
                    )}

                    {role === 'paciente' && (
                        <p className={styles.stepTitle}>
                            Paso {step} de 5 · {[
                                'Datos personales',
                                'Documento de identidad',
                                'Datos adicionales',
                                'Correo y contraseña',
                                'Verificación de correo'
                            ][step - 1]}
                        </p>
                    )}

                    {role === 'paciente' &&
                        ((step === 1 && procesoId) || ([3, 4].includes(step) && correoConfigurado)) && (
                            <p className={styles.savedNotice}>
                                Estos datos ya están guardados y se muestran solo para consulta.
                            </p>
                        )
                    }

                    {/* ── FORMULARIO PARA PACIENTE ───────────────────── */}

                    {role === 'paciente' && (
                        <>

                            {/* Paso 1 — Datos personales */}
                            {step === 1 && (
                                <>
                                    <label htmlFor="register-nombre" className={styles.fieldLabel}>
                                        Nombre
                                    </label>

                                    <Input
                                        validationAttempt={feedback.kind === "error" ? feedback.revision : 0}
                                        id="register-nombre"
                                        name="nombre"
                                        placeholder="Nombre"
                                        onChange={handleChange}
                                        value={form.nombre}
                                        readOnly={Boolean(procesoId) || loading}
                                        aria-invalid={Boolean(errors.nombre)}
                                        aria-describedby={errors.nombre ? "register-nombre-error" : undefined}
                                    />

                                    {errors.nombre && (
                                        <motion.p
                                            key={`${role}-nombre-${feedback.revision}`}
                                            animate={{ x: reduced ? 0 : [0, -3, 3, 0] }}
                                            transition={{ duration: .18 }}
                                            id="register-nombre-error"
                                            className={styles.error}
                                        >
                                            {errors.nombre}
                                        </motion.p>
                                    )}

                                    <label htmlFor="register-apellido" className={styles.fieldLabel}>
                                        Apellido
                                    </label>

                                    <Input
                                        validationAttempt={feedback.kind === "error" ? feedback.revision : 0}
                                        id="register-apellido"
                                        name="apellido"
                                        placeholder="Apellido"
                                        onChange={handleChange}
                                        value={form.apellido}
                                        readOnly={Boolean(procesoId) || loading}
                                        aria-invalid={Boolean(errors.apellido)}
                                        aria-describedby={errors.apellido ? "register-apellido-error" : undefined}
                                    />

                                    {errors.apellido && (
                                        <motion.p
                                            key={`${role}-apellido-${feedback.revision}`}
                                            animate={{ x: reduced ? 0 : [0, -3, 3, 0] }}
                                            transition={{ duration: .18 }}
                                            id="register-apellido-error"
                                            className={styles.error}
                                        >
                                            {errors.apellido}
                                        </motion.p>
                                    )}

                                    <select
                                        aria-label="Tipo de documento"
                                        disabled={Boolean(procesoId) || loading}
                                        name="tipo_documento"
                                        value={form.tipo_documento}
                                        onChange={handleChange}
                                        className={styles.select}
                                    >
                                        <option value="CC">Cédula de ciudadanía</option>
                                        <option value="TI">Tarjeta de identidad</option>
                                        <option value="PASAPORTE">Pasaporte</option>
                                        <option value="RC">Registro civil</option>
                                    </select>

                                    {errors.tipo_documento && (
                                        <motion.p
                                            key={`${role}-tipo_documento-${feedback.revision}`}
                                            animate={{ x: reduced ? 0 : [0, -3, 3, 0] }}
                                            transition={{ duration: .18 }}
                                            id="register-tipo_documento-error"
                                            className={styles.error}
                                        >
                                            {errors.tipo_documento}
                                        </motion.p>
                                    )}

                                    <label htmlFor="register-numero_documento" className={styles.fieldLabel}>
                                        Número de documento
                                    </label>

                                    <Input
                                        validationAttempt={feedback.kind === "error" ? feedback.revision : 0}
                                        id="register-numero_documento"
                                        name="numero_documento"
                                        placeholder="Número de documento"
                                        onChange={handleChange}
                                        value={form.numero_documento}
                                        readOnly={Boolean(procesoId) || loading}
                                        aria-invalid={Boolean(errors.numero_documento)}
                                        aria-describedby={errors.numero_documento ? "register-numero_documento-error" : undefined}
                                    />

                                    {errors.numero_documento && (
                                        <motion.p
                                            key={`${role}-numero_documento-${feedback.revision}`}
                                            animate={{ x: reduced ? 0 : [0, -3, 3, 0] }}
                                            transition={{ duration: .18 }}
                                            id="register-numero_documento-error"
                                            className={styles.error}
                                        >
                                            {errors.numero_documento}
                                        </motion.p>
                                    )}

                                    <label htmlFor="register-fecha_nacimiento" className={styles.fieldLabel}>
                                        Fecha de nacimiento
                                    </label>

                                    <Input
                                        validationAttempt={feedback.kind === "error" ? feedback.revision : 0}
                                        id="register-fecha_nacimiento"
                                        type="date"
                                        name="fecha_nacimiento"
                                        placeholder="Fecha de nacimiento"
                                        onChange={handleChange}
                                        value={form.fecha_nacimiento}
                                        readOnly={Boolean(procesoId) || loading}
                                        aria-invalid={Boolean(errors.fecha_nacimiento)}
                                        aria-describedby={errors.fecha_nacimiento ? "register-fecha_nacimiento-error" : undefined}
                                    />

                                    {errors.fecha_nacimiento && (
                                        <motion.p
                                            key={`${role}-fecha_nacimiento-${feedback.revision}`}
                                            animate={{ x: reduced ? 0 : [0, -3, 3, 0] }}
                                            transition={{ duration: .18 }}
                                            id="register-fecha_nacimiento-error"
                                            className={styles.error}
                                        >
                                            {errors.fecha_nacimiento}
                                        </motion.p>
                                    )}

                                    <div className={styles.buttons}>
                                        <Button
                                            type="button"
                                            disabled={loading}
                                            variant="secondary"
                                            onClick={handleBack}
                                        >
                                            Atrás
                                        </Button>

                                        <Button
                                            type="button"
                                            disabled={loading}
                                            variant="primary"
                                            onClick={handleNextStep}
                                        >
                                            Siguiente
                                        </Button>
                                    </div>
                                </>
                            )}

                            {/* Paso 3 — Datos adicionales */}
                            {step === 3 && (
                                <div className={styles.additionalStep}>

                                    <div className={styles.fieldFull}>
                                        <label htmlFor="register-telefono" className={styles.fieldLabel}>
                                            Teléfono
                                        </label>

                                        <Input
                                            validationAttempt={feedback.kind === "error" ? feedback.revision : 0}
                                            id="register-telefono"
                                            name="telefono"
                                            placeholder="Teléfono"
                                            onChange={handleChange}
                                            value={form.telefono}
                                            readOnly={correoConfigurado || loading}
                                            aria-invalid={Boolean(errors.telefono)}
                                            aria-describedby={errors.telefono ? "register-telefono-error" : undefined}
                                        />

                                        {errors.telefono && (
                                            <motion.p
                                                key={`${role}-telefono-${feedback.revision}`}
                                                animate={{ x: reduced ? 0 : [0, -3, 3, 0] }}
                                                transition={{ duration: .18 }}
                                                id="register-telefono-error"
                                                className={styles.error}
                                            >
                                                {errors.telefono}
                                            </motion.p>
                                        )}
                                    </div>

                                    <div className={styles.twoColumns}>

                                        <div>
                                            <label htmlFor="register-estatura" className={styles.fieldLabel}>
                                                Estatura (metros)
                                            </label>

                                            <Input
                                                validationAttempt={feedback.kind === "error" ? feedback.revision : 0}
                                                id="register-estatura"
                                                type="text"
                                                name="estatura"
                                                placeholder="Ej: 1.75"
                                                onChange={handleChange}
                                                value={form.estatura}
                                                readOnly={correoConfigurado || loading}
                                                aria-invalid={Boolean(errors.estatura)}
                                            />

                                            {errors.estatura && (
                                                <p className={styles.error}>
                                                    {errors.estatura}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="register-peso" className={styles.fieldLabel}>
                                                Peso (kg)
                                            </label>

                                            <Input
                                                validationAttempt={feedback.kind === "error" ? feedback.revision : 0}
                                                id="register-peso"
                                                type="text"
                                                name="peso"
                                                placeholder="Ej: 70"
                                                onChange={handleChange}
                                                value={form.peso}
                                                readOnly={correoConfigurado || loading}
                                                aria-invalid={Boolean(errors.peso)}
                                            />

                                            {errors.peso && (
                                                <p className={styles.error}>
                                                    {errors.peso}
                                                </p>
                                            )}
                                        </div>

                                    </div>

                                    <div className={styles.twoColumns}>

                                        <div>
                                            <label htmlFor="register-genero" className={styles.fieldLabel}>
                                                Género
                                            </label>

                                            <select
                                                id="register-genero"
                                                name="genero"
                                                value={form.genero || ""}
                                                onChange={handleChange}
                                                disabled={correoConfigurado || loading}
                                                className={styles.select}
                                                aria-invalid={Boolean(errors.genero)}
                                            >
                                                <option value="">Selecciona tu género</option>
                                                <option value="M">Masculino</option>
                                                <option value="F">Femenino</option>
                                                <option value="OTRO">Otro</option>
                                                <option value="PREFIERO_NO_DECIR">Prefiero no decir</option>
                                            </select>

                                            {errors.genero && (
                                                <p className={styles.error}>
                                                    {errors.genero}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="register-tipo_sangre" className={styles.fieldLabel}>
                                                Tipo de sangre
                                            </label>

                                            <select
                                                id="register-tipo_sangre"
                                                name="tipo_sangre"
                                                value={form.tipo_sangre || ""}
                                                onChange={handleChange}
                                                disabled={correoConfigurado || loading}
                                                className={styles.select}
                                                aria-invalid={Boolean(errors.tipo_sangre)}
                                            >
                                                <option value="">Selecciona tu tipo</option>
                                                <option value="A+">A+</option>
                                                <option value="A-">A-</option>
                                                <option value="B+">B+</option>
                                                <option value="B-">B-</option>
                                                <option value="AB+">AB+</option>
                                                <option value="AB-">AB-</option>
                                                <option value="O+">O+</option>
                                                <option value="O-">O-</option>
                                            </select>

                                            {errors.tipo_sangre && (
                                                <p className={styles.error}>
                                                    {errors.tipo_sangre}
                                                </p>
                                            )}
                                        </div>

                                    </div>

                                    <div className={styles.buttons}>
                                        <Button
                                            type="button"
                                            disabled={loading}
                                            variant="secondary"
                                            onClick={handleBack}
                                        >
                                            Atrás
                                        </Button>

                                        <Button
                                            type="button"
                                            disabled={loading}
                                            variant="primary"
                                            onClick={handleNextStep}
                                        >
                                            Siguiente
                                        </Button>
                                    </div>

                                </div>
                            )}

                            {/* Paso 4 — Credenciales */}
                            {step === 4 && (
                                <>
                                    <label htmlFor="register-correo" className={styles.fieldLabel}>
                                        Correo electrónico
                                    </label>

                                    <Input
                                        validationAttempt={feedback.kind === "error" ? feedback.revision : 0}
                                        id="register-correo"
                                        name="correo"
                                        placeholder="Correo"
                                        onChange={handleChange}
                                        value={form.correo}
                                        readOnly={correoConfigurado || loading}
                                        aria-invalid={Boolean(errors.correo)}
                                        aria-describedby={errors.correo ? "register-correo-error" : undefined}
                                    />

                                    {errors.correo && (
                                        <motion.p
                                            key={`${role}-correo-${feedback.revision}`}
                                            animate={{ x: reduced ? 0 : [0, -3, 3, 0] }}
                                            transition={{ duration: .18 }}
                                            id="register-correo-error"
                                            className={styles.error}
                                        >
                                            {errors.correo}
                                        </motion.p>
                                    )}

                                    <label htmlFor="register-contraseña" className={styles.fieldLabel}>
                                        Contraseña
                                    </label>

                                    <Input
                                        validationAttempt={feedback.kind === "error" ? feedback.revision : 0}
                                        id="register-contraseña"
                                        type="password"
                                        name="contraseña"
                                        placeholder="Contraseña"
                                        onChange={handleChange}
                                        value={form.contraseña}
                                        readOnly={correoConfigurado || loading}
                                        aria-invalid={Boolean(errors.contraseña)}
                                        aria-describedby={errors.contraseña ? "register-contraseña-error" : undefined}
                                    />

                                    {errors.contraseña && (
                                        <motion.p
                                            key={`${role}-contraseña-${feedback.revision}`}
                                            animate={{ x: reduced ? 0 : [0, -3, 3, 0] }}
                                            transition={{ duration: .18 }}
                                            id="register-contraseña-error"
                                            className={styles.error}
                                        >
                                            {errors.contraseña}
                                        </motion.p>
                                    )}

                                    <label htmlFor="register-confirmar_contraseña" className={styles.fieldLabel}>
                                        Confirmar contraseña
                                    </label>

                                    <Input
                                        validationAttempt={feedback.kind === "error" ? feedback.revision : 0}
                                        id="register-confirmar_contraseña"
                                        type="password"
                                        name="confirmar_contraseña"
                                        placeholder="Confirmar contraseña"
                                        onChange={handleChange}
                                        value={form.confirmar_contraseña}
                                        readOnly={correoConfigurado || loading}
                                        aria-invalid={Boolean(errors.confirmar_contraseña)}
                                        aria-describedby={errors.confirmar_contraseña ? "register-confirmar_contraseña-error" : undefined}
                                    />

                                    {errors.confirmar_contraseña && (
                                        <motion.p
                                            key={`${role}-confirmar_contraseña-${feedback.revision}`}
                                            animate={{ x: reduced ? 0 : [0, -3, 3, 0] }}
                                            transition={{ duration: .18 }}
                                            id="register-confirmar_contraseña-error"
                                            className={styles.error}
                                        >
                                            {errors.confirmar_contraseña}
                                        </motion.p>
                                    )}

                                    <div className={styles.buttons}>
                                        <Button
                                            type="button"
                                            disabled={loading}
                                            variant="secondary"
                                            onClick={handleBack}
                                        >
                                            Atrás
                                        </Button>

                                        <Button
                                            type="submit"
                                            variant="primary"
                                            disabled={loading}
                                        >
                                            {loading ? 'Enviando código...' : 'Siguiente'}
                                        </Button>
                                    </div>
                                </>
                            )}

                            {/* Paso 5 — Verificación de correo */}
                            {step === 5 && (
                                <>
                                    <div className={styles.verificationHeader}>
                                        <div className={styles.verificationIcon}>
                                            <MailCheck size={28} />
                                        </div>

                                        <div className={styles.verificationText}>
                                            <strong>Verifica tu correo</strong>
                                            <p>Ingresa el código enviado a {form.correo}</p>
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={handleReenviarOtp}
                                        disabled={loading || correoVerificado}
                                    >
                                        Reenviar código
                                    </Button>

                                    <label htmlFor="register-otp" className={styles.fieldLabel}>
                                        Código de verificación
                                    </label>

                                    <Input
                                        validationAttempt={feedback.kind === "error" ? feedback.revision : 0}
                                        id="register-otp"
                                        name="otp"
                                        placeholder="Código de verificación"
                                        value={otp}
                                        readOnly={correoVerificado || loading}
                                        autoComplete="one-time-code"
                                        onChange={(e) => setOtp(e.target.value)}
                                    />

                                    <div className={styles.buttons}>
                                        <Button
                                            type="button"
                                            disabled={loading}
                                            variant="secondary"
                                            onClick={handleBack}
                                        >
                                            Atrás
                                        </Button>

                                        <Button
                                            type="button"
                                            disabled={loading}
                                            variant="primary"
                                            onClick={handleVerificarOtp}
                                        >
                                            {loading
                                                ? 'Completando registro...'
                                                : correoVerificado
                                                    ? 'Completar registro'
                                                    : 'Verificar y completar'
                                            }
                                        </Button>
                                    </div>
                                </>
                            )}

                            {/* Paso 2 — Documento de identidad */}
                            {step === 2 && (
                                <>
                                    <div className={styles.verificationHeader}>
                                        <div className={styles.verificationIcon}>
                                            <CreditCard size={28} />
                                        </div>

                                        <div className={styles.verificationText}>
                                            <strong>Verifica tu identidad</strong>
                                            <p>Carga imágenes claras de tu documento.</p>
                                        </div>
                                    </div>

                                    <div className={styles.resumeUpload}>
                                        <input
                                            disabled={documentoVerificado || loading}
                                            id="documento-frente"
                                            className={styles.fileInput}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            onChange={(e) => setDocumentoFrente(e.target.files?.[0] ?? null)}
                                        />

                                        {documentoFrente ? (
                                            <div className={`${styles.uploadSurface} ${styles.selectedFile}`}>
                                                <span className={styles.fileIcon}>
                                                    <FileText size={25} />
                                                </span>

                                                <div className={styles.fileDetails}>
                                                    <div className={styles.fileNameRow}>
                                                        <strong>{documentoFrente.name}</strong>
                                                        <FileText
                                                            size={17}
                                                            aria-label="Imagen seleccionada, pendiente de verificación"
                                                        />
                                                    </div>

                                                    <span>
                                                        {formatFileSize(documentoFrente.size)}
                                                    </span>
                                                </div>

                                                <label
                                                    className={styles.changeFile}
                                                    htmlFor="documento-frente"
                                                >
                                                    <RefreshCw size={15} /> Cambiar
                                                </label>
                                            </div>
                                        ) : (
                                            <div className={styles.uploadSurface}>
                                                <span className={styles.uploadIcon}>
                                                    <FileUp size={28} />
                                                </span>

                                                <div className={styles.uploadCopy}>
                                                    <strong>Frente del documento</strong>
                                                    <p>JPG, PNG o WEBP · máximo 8 MB</p>
                                                </div>

                                                <label
                                                    className={styles.selectFile}
                                                    htmlFor="documento-frente"
                                                >
                                                    <FileUp size={17} /> Seleccionar imagen
                                                </label>
                                            </div>
                                        )}
                                    </div>

                                    {form.tipo_documento === 'CC' && (
                                        <div className={styles.resumeUpload}>
                                            <input
                                                disabled={documentoVerificado || loading}
                                                id="documento-reverso"
                                                className={styles.fileInput}
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                onChange={(e) => setDocumentoReverso(e.target.files?.[0] ?? null)}
                                            />

                                            {documentoReverso ? (
                                                <div className={`${styles.uploadSurface} ${styles.selectedFile}`}>
                                                    <span className={styles.fileIcon}>
                                                        <FileText size={25} />
                                                    </span>

                                                    <div className={styles.fileDetails}>
                                                        <div className={styles.fileNameRow}>
                                                            <strong>{documentoReverso.name}</strong>
                                                            <FileText
                                                                size={17}
                                                                aria-label="Imagen seleccionada, pendiente de verificación"
                                                            />
                                                        </div>

                                                        <span>
                                                            {formatFileSize(documentoReverso.size)}
                                                        </span>
                                                    </div>

                                                    <label
                                                        className={styles.changeFile}
                                                        htmlFor="documento-reverso"
                                                    >
                                                        <RefreshCw size={15} /> Cambiar
                                                    </label>
                                                </div>
                                            ) : (
                                                <div className={styles.uploadSurface}>
                                                    <span className={styles.uploadIcon}>
                                                        <FileUp size={28} />
                                                    </span>

                                                    <div className={styles.uploadCopy}>
                                                        <strong>Reverso del documento</strong>
                                                        <p>JPG, PNG o WEBP · máximo 8 MB</p>
                                                    </div>

                                                    <label
                                                        className={styles.selectFile}
                                                        htmlFor="documento-reverso"
                                                    >
                                                        <FileUp size={17} /> Seleccionar imagen
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className={styles.buttons}>
                                        <Button
                                            type="button"
                                            disabled={loading}
                                            variant="secondary"
                                            onClick={handleBack}
                                        >
                                            Atrás
                                        </Button>

                                        <Button
                                            type="button"
                                            disabled={loading}
                                            variant="primary"
                                            onClick={handleDocumento}
                                        >
                                            {loading
                                                ? 'Verificando identidad...'
                                                : documentoVerificado
                                                    ? 'Siguiente'
                                                    : 'Verificar y continuar'
                                            }
                                        </Button>
                                    </div>
                                </>
                            )}

                        </>
                    )}

                    {/* ── FORMULARIO PARA MÉDICO ─────────────────────── */}

                    {role === 'medico' && (
                        <>

                            {/* Paso 1 — Datos personales */}
                            {step === 1 && (
                                <>
                                    <label htmlFor="register-nombre" className={styles.fieldLabel}>
                                        Nombre
                                    </label>

                                    <Input
                                        readOnly={loading}
                                        validationAttempt={feedback.kind === "error" ? feedback.revision : 0}
                                        id="register-nombre"
                                        name="nombre"
                                        placeholder="Nombre"
                                        onChange={handleChange}
                                        value={form.nombre}
                                        aria-invalid={Boolean(errors.nombre)}
                                        aria-describedby={errors.nombre ? "register-nombre-error" : undefined}
                                    />

                                    {errors.nombre && (
                                        <motion.p
                                            key={`${role}-nombre-${feedback.revision}`}
                                            animate={{ x: reduced ? 0 : [0, -3, 3, 0] }}
                                            transition={{ duration: .18 }}
                                            id="register-nombre-error"
                                            className={styles.error}
                                        >
                                            {errors.nombre}
                                        </motion.p>
                                    )}

                                    <label htmlFor="register-apellido" className={styles.fieldLabel}>
                                        Apellido
                                    </label>

                                    <Input
                                        readOnly={loading}
                                        validationAttempt={feedback.kind === "error" ? feedback.revision : 0}
                                        id="register-apellido"
                                        name="apellido"
                                        placeholder="Apellido"
                                        onChange={handleChange}
                                        value={form.apellido}
                                        aria-invalid={Boolean(errors.apellido)}
                                        aria-describedby={errors.apellido ? "register-apellido-error" : undefined}
                                    />

                                    {errors.apellido && (
                                        <motion.p
                                            key={`${role}-apellido-${feedback.revision}`}
                                            animate={{ x: reduced ? 0 : [0, -3, 3, 0] }}
                                            transition={{ duration: .18 }}
                                            id="register-apellido-error"
                                            className={styles.error}
                                        >
                                            {errors.apellido}
                                        </motion.p>
                                    )}

                                    <label htmlFor="register-cedula" className={styles.fieldLabel}>
                                        Cédula
                                    </label>

                                    <Input
                                        readOnly={loading}
                                        validationAttempt={feedback.kind === "error" ? feedback.revision : 0}
                                        id="register-cedula"
                                        name="cedula"
                                        placeholder="Cédula"
                                        onChange={handleChange}
                                        value={form.cedula}
                                        aria-invalid={Boolean(errors.cedula)}
                                        aria-describedby={errors.cedula ? "register-cedula-error" : undefined}
                                    />

                                    {errors.cedula && (
                                        <motion.p
                                            key={`${role}-cedula-${feedback.revision}`}
                                            animate={{ x: reduced ? 0 : [0, -3, 3, 0] }}
                                            transition={{ duration: .18 }}
                                            id="register-cedula-error"
                                            className={styles.error}
                                        >
                                            {errors.cedula}
                                        </motion.p>
                                    )}

                                    <label htmlFor="register-fecha_nacimiento" className={styles.fieldLabel}>
                                        Fecha de nacimiento
                                    </label>

                                    <Input
                                        readOnly={loading}
                                        validationAttempt={feedback.kind === "error" ? feedback.revision : 0}
                                        id="register-fecha_nacimiento"
                                        type="date"
                                        name="fecha_nacimiento"
                                        placeholder="Fecha de nacimiento"
                                        onChange={handleChange}
                                        value={form.fecha_nacimiento}
                                        aria-invalid={Boolean(errors.fecha_nacimiento)}
                                        aria-describedby={errors.fecha_nacimiento ? "register-fecha_nacimiento-error" : undefined}
                                    />

                                    {errors.fecha_nacimiento && (
                                        <motion.p
                                            key={`${role}-fecha_nacimiento-${feedback.revision}`}
                                            animate={{ x: reduced ? 0 : [0, -3, 3, 0] }}
                                            transition={{ duration: .18 }}
                                            id="register-fecha_nacimiento-error"
                                            className={styles.error}
                                        >
                                            {errors.fecha_nacimiento}
                                        </motion.p>
                                    )}

                                    <div className={styles.buttons}>
                                        <Button
                                            disabled={loading}
                                            type="button"
                                            variant="secondary"
                                            onClick={() => setRole(null)}
                                        >
                                            Atrás
                                        </Button>

                                        <Button
                                            disabled={loading}
                                            type="button"
                                            variant="primary"
                                            onClick={handleNextStep}
                                        >
                                            Siguiente
                                        </Button>
                                    </div>
                                </>
                            )}

                            {/* Paso 2 — Ubicación y especialidad */}
                            {step === 2 && (
                                <>
                                    <label htmlFor="register-telefono" className={styles.fieldLabel}>
                                        Teléfono
                                    </label>

                                    <Input
                                        readOnly={loading}
                                        validationAttempt={feedback.kind === "error" ? feedback.revision : 0}
                                        id="register-telefono"
                                        name="telefono"
                                        placeholder="Teléfono"
                                        onChange={handleChange}
                                        value={form.telefono}
                                        aria-invalid={Boolean(errors.telefono)}
                                        aria-describedby={errors.telefono ? "register-telefono-error" : undefined}
                                    />

                                    {errors.telefono && (
                                        <motion.p
                                            key={`${role}-telefono-${feedback.revision}`}
                                            animate={{ x: reduced ? 0 : [0, -3, 3, 0] }}
                                            transition={{ duration: .18 }}
                                            id="register-telefono-error"
                                            className={styles.error}
                                        >
                                            {errors.telefono}
                                        </motion.p>
                                    )}

                                    <label htmlFor="register-direccion" className={styles.fieldLabel}>
                                        Dirección
                                    </label>

                                    <Input
                                        readOnly={loading}
                                        validationAttempt={feedback.kind === "error" ? feedback.revision : 0}
                                        id="register-direccion"
                                        name="direccion"
                                        placeholder="Dirección"
                                        onChange={handleChange}
                                        value={form.direccion}
                                        aria-invalid={Boolean(errors.direccion)}
                                        aria-describedby={errors.direccion ? "register-direccion-error" : undefined}
                                    />

                                    {errors.direccion && (
                                        <motion.p
                                            key={`${role}-direccion-${feedback.revision}`}
                                            animate={{ x: reduced ? 0 : [0, -3, 3, 0] }}
                                            transition={{ duration: .18 }}
                                            id="register-direccion-error"
                                            className={styles.error}
                                        >
                                            {errors.direccion}
                                        </motion.p>
                                    )}

                                    <select
                                        disabled={loading}
                                        aria-label="Departamento"
                                        name="departamento_filtro"
                                        onChange={handleChange}
                                        className={styles.select}
                                        value={form.departamento_filtro}
                                    >
                                        <option value="" disabled>
                                            Selecciona tu departamento
                                        </option>

                                        {departamentos.map((dep) => (
                                            <option key={dep.id} value={dep.id}>
                                                {dep.nombre}
                                            </option>
                                        ))}
                                    </select>

                                    {errors.departamento_filtro && (
                                        <span className={styles.error}>
                                            {errors.departamento_filtro}
                                        </span>
                                    )}

                                    <select
                                        aria-label="Ciudad"
                                        name="id_ciudad"
                                        onChange={handleChange}
                                        className={styles.select}
                                        value={form.id_ciudad}
                                        disabled={loading || !form.departamento_filtro}
                                    >
                                        <option value="" disabled>
                                            Selecciona tu ciudad
                                        </option>

                                        {ciudades.map((ciu) => (
                                            <option
                                                key={ciu.id_ciudad}
                                                value={ciu.id_ciudad}
                                            >
                                                {ciu.nombre_ciudad}
                                            </option>
                                        ))}
                                    </select>

                                    {errors.id_ciudad && (
                                        <span className={styles.error}>
                                            {errors.id_ciudad}
                                        </span>
                                    )}

                                    <select
                                        disabled={loading}
                                        aria-label="Especialidad"
                                        name="id_especialidad"
                                        onChange={handleChange}
                                        className={styles.select}
                                        value={form.id_especialidad}
                                    >
                                        <option value="" disabled>
                                            Selecciona tu especialidad
                                        </option>

                                        {especialidades.map((esp) => (
                                            <option key={esp.id} value={esp.id}>
                                                {esp.nombre}
                                            </option>
                                        ))}
                                    </select>

                                    {errors.id_especialidad && (
                                        <span className={styles.error}>
                                            {errors.id_especialidad}
                                        </span>
                                    )}

                                    <div className={styles.buttons}>
                                        <Button
                                            disabled={loading}
                                            type="button"
                                            variant="secondary"
                                            onClick={() => setStep(step - 1)}
                                        >
                                            Atrás
                                        </Button>

                                        <Button
                                            disabled={loading}
                                            type="button"
                                            variant="primary"
                                            onClick={handleNextStep}
                                        >
                                            Siguiente
                                        </Button>
                                    </div>
                                </>
                            )}

                            {/* Paso 3 — Credenciales */}
                            {step === 3 && (
                                <>
                                    <label htmlFor="register-correo" className={styles.fieldLabel}>
                                        Correo electrónico
                                    </label>

                                    <Input
                                        readOnly={loading}
                                        validationAttempt={feedback.kind === "error" ? feedback.revision : 0}
                                        id="register-correo"
                                        name="correo"
                                        placeholder="Correo"
                                        onChange={handleChange}
                                        value={form.correo}
                                        aria-invalid={Boolean(errors.correo)}
                                        aria-describedby={errors.correo ? "register-correo-error" : undefined}
                                    />

                                    {errors.correo && (
                                        <motion.p
                                            key={`${role}-correo-${feedback.revision}`}
                                            animate={{ x: reduced ? 0 : [0, -3, 3, 0] }}
                                            transition={{ duration: .18 }}
                                            id="register-correo-error"
                                            className={styles.error}
                                        >
                                            {errors.correo}
                                        </motion.p>
                                    )}

                                    <label htmlFor="register-contraseña" className={styles.fieldLabel}>
                                        Contraseña
                                    </label>

                                    <Input
                                        readOnly={loading}
                                        validationAttempt={feedback.kind === "error" ? feedback.revision : 0}
                                        id="register-contraseña"
                                        type="password"
                                        name="contraseña"
                                        placeholder="Contraseña"
                                        onChange={handleChange}
                                        value={form.contraseña}
                                        aria-invalid={Boolean(errors.contraseña)}
                                        aria-describedby={errors.contraseña ? "register-contraseña-error" : undefined}
                                    />

                                    {errors.contraseña && (
                                        <motion.p
                                            key={`${role}-contraseña-${feedback.revision}`}
                                            animate={{ x: reduced ? 0 : [0, -3, 3, 0] }}
                                            transition={{ duration: .18 }}
                                            id="register-contraseña-error"
                                            className={styles.error}
                                        >
                                            {errors.contraseña}
                                        </motion.p>
                                    )}

                                    <label htmlFor="register-confirmar_contraseña" className={styles.fieldLabel}>
                                        Confirmar contraseña
                                    </label>

                                    <Input
                                        readOnly={loading}
                                        validationAttempt={feedback.kind === "error" ? feedback.revision : 0}
                                        id="register-confirmar_contraseña"
                                        type="password"
                                        name="confirmar_contraseña"
                                        placeholder="Confirmar contraseña"
                                        onChange={handleChange}
                                        value={form.confirmar_contraseña}
                                        aria-invalid={Boolean(errors.confirmar_contraseña)}
                                        aria-describedby={errors.confirmar_contraseña ? "register-confirmar_contraseña-error" : undefined}
                                    />

                                    {errors.confirmar_contraseña && (
                                        <motion.p
                                            key={`${role}-confirmar_contraseña-${feedback.revision}`}
                                            animate={{ x: reduced ? 0 : [0, -3, 3, 0] }}
                                            transition={{ duration: .18 }}
                                            id="register-confirmar_contraseña-error"
                                            className={styles.error}
                                        >
                                            {errors.confirmar_contraseña}
                                        </motion.p>
                                    )}

                                    <div className={styles.resumeUpload}>

                                        <input
                                            id="hoja-vida"
                                            className={styles.fileInput}
                                            type="file"
                                            name="hoja_vida"
                                            accept="application/pdf"
                                            onChange={handleChange}
                                            aria-describedby="hoja-vida-help"
                                            aria-invalid={Boolean(errors.hoja_vida)}
                                            aria-errormessage={errors.hoja_vida ? "hoja-vida-error" : undefined}
                                        />

                                        {form.hoja_vida ? (
                                            <div className={`${styles.uploadSurface} ${styles.selectedFile}`}>
                                                <span
                                                    className={styles.fileIcon}
                                                    aria-hidden="true"
                                                >
                                                    <FileText size={25} />
                                                </span>

                                                <div className={styles.fileDetails}>
                                                    <div className={styles.fileNameRow}>
                                                        <strong title={form.hoja_vida.name}>
                                                            {form.hoja_vida.name}
                                                        </strong>

                                                        <CheckCircle2
                                                            size={17}
                                                            aria-label="Archivo seleccionado"
                                                        />
                                                    </div>

                                                    <span id="hoja-vida-help">
                                                        {formatFileSize(form.hoja_vida.size)} · PDF
                                                    </span>
                                                </div>

                                                <label
                                                    className={styles.changeFile}
                                                    htmlFor="hoja-vida"
                                                >
                                                    <RefreshCw size={15} aria-hidden="true" />
                                                    Cambiar PDF
                                                </label>
                                            </div>
                                        ) : (
                                            <div className={styles.uploadSurface}>
                                                <span
                                                    className={styles.uploadIcon}
                                                    aria-hidden="true"
                                                >
                                                    <FileUp size={28} />
                                                </span>

                                                <div className={styles.uploadCopy}>
                                                    <strong>Adjunta tu hoja de vida</strong>
                                                    <p>
                                                        Selecciona un archivo PDF con tu información profesional.
                                                    </p>
                                                </div>

                                                <label
                                                    className={styles.selectFile}
                                                    htmlFor="hoja-vida"
                                                >
                                                    <FileUp size={17} aria-hidden="true" />
                                                    Seleccionar PDF
                                                </label>

                                                <small id="hoja-vida-help">
                                                    PDF · máximo 5 MB
                                                </small>
                                            </div>
                                        )}

                                    </div>

                                    {errors.hoja_vida && (
                                        <p
                                            id="hoja-vida-error"
                                            className={styles.error}
                                        >
                                            {errors.hoja_vida}
                                        </p>
                                    )}

                                    <div className={styles.buttons}>
                                        <Button
                                            disabled={loading}
                                            type="button"
                                            variant="secondary"
                                            onClick={() => setStep(step - 2)}
                                        >
                                            Atrás
                                        </Button>

                                        <Button
                                            type="submit"
                                            variant="primary"
                                            disabled={loading}
                                        >
                                            {loading ? 'Registrando...' : 'Registrarse'}
                                        </Button>
                                    </div>

                                </>
                            )}

                        </>
                    )}

                </motion.div>
            </AnimatePresence>

        </form>
    )
}