'use client'
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

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.inputs}>
                {role === 'paciente' && <p className={styles.stepTitle}>Paso {step} de 5 · {['Datos personales', 'Documento de identidad', 'Datos adicionales', 'Correo y contraseña', 'Verificación de correo'][step - 1]}</p>}
                {role === 'paciente' && ((step === 1 && procesoId) || ([3, 4].includes(step) && correoConfigurado)) && <p className={styles.savedNotice}>Estos datos ya están guardados y se muestran solo para consulta.</p>}

                {/* ── FORMULARIO PARA PACIENTE (5 pasos) ───────────────────── */}
                {role === 'paciente' && (
                    <>
                        {/* Paso 1 — Datos personales básicos */}
                        {step === 1 && (
                            <>
                                <Input name="nombre" placeholder="Nombre" onChange={handleChange} value={form.nombre} readOnly={Boolean(procesoId) || loading} />
                                {errors.nombre && <p className={styles.error}>{errors.nombre}</p>}

                                <Input name="apellido" placeholder="Apellido" onChange={handleChange} value={form.apellido} readOnly={Boolean(procesoId) || loading} />
                                {errors.apellido && <p className={styles.error}>{errors.apellido}</p>}

                                <select disabled={Boolean(procesoId) || loading} name="tipo_documento" value={form.tipo_documento} onChange={handleChange} className={styles.select}>
                                    <option value="CC">Cédula de ciudadanía</option>
                                    <option value="TI">Tarjeta de identidad</option>
                                    <option value="PASAPORTE">Pasaporte</option>
                                    <option value="RC">Registro civil</option>
                                </select>
                                {errors.tipo_documento && <p className={styles.error}>{errors.tipo_documento}</p>}

                                <Input name="numero_documento" placeholder="Número de documento" onChange={handleChange} value={form.numero_documento} readOnly={Boolean(procesoId) || loading} />
                                {errors.numero_documento && <p className={styles.error}>{errors.numero_documento}</p>}

                                <Input type="date" name="fecha_nacimiento" placeholder="Fecha de nacimiento" onChange={handleChange} value={form.fecha_nacimiento} readOnly={Boolean(procesoId) || loading} />
                                {errors.fecha_nacimiento && <p className={styles.error}>{errors.fecha_nacimiento}</p>}

                                <div className={styles.buttons}>
                                    <Button type="button" disabled={loading} variant="secondary" onClick={handleBack}>Atrás</Button>
                                    <Button type="button" disabled={loading} variant="primary" onClick={handleNextStep}>Siguiente</Button>
                                </div>
                            </>
                        )}

                        {/* Paso 3 — Datos adicionales */}
                        {step === 3 && (
                            <>
                                <Input name="telefono" placeholder="Teléfono" onChange={handleChange} value={form.telefono} readOnly={correoConfigurado || loading} />
                                {errors.telefono && <p className={styles.error}>{errors.telefono}</p>}

                                <Input type="text" name="estatura" placeholder="Estatura (ej: 1.75)" onChange={handleChange} value={form.estatura} readOnly={correoConfigurado || loading} />
                                {errors.estatura && <p className={styles.error}>{errors.estatura}</p>}

                                <Input type="text" name="peso" placeholder="Peso en kg (ej: 70)" onChange={handleChange} value={form.peso} readOnly={correoConfigurado || loading} />
                                {errors.peso && <p className={styles.error}>{errors.peso}</p>}

                                <div className={styles.buttons}>
                                    <Button type="button" disabled={loading} variant="secondary" onClick={handleBack}>Atrás</Button>
                                    <Button type="button" disabled={loading} variant="primary" onClick={handleNextStep}>Siguiente</Button>
                                </div>
                            </>
                        )}

                        {/* Paso 4 — Credenciales */}
                        {step === 4 && (
                            <>
                                <Input name="correo" placeholder="Correo" onChange={handleChange} value={form.correo} readOnly={correoConfigurado || loading} />
                                {errors.correo && <p className={styles.error}>{errors.correo}</p>}

                                <Input type="password" name="contraseña" placeholder="Contraseña" onChange={handleChange} value={form.contraseña} readOnly={correoConfigurado || loading} />
                                {errors.contraseña && <p className={styles.error}>{errors.contraseña}</p>}

                                <Input type="password" name="confirmar_contraseña" placeholder="Confirmar contraseña" onChange={handleChange} value={form.confirmar_contraseña} readOnly={correoConfigurado || loading} />
                                {errors.confirmar_contraseña && <p className={styles.error}>{errors.confirmar_contraseña}</p>}

                                <div className={styles.buttons}>
                                    <Button type="button" disabled={loading} variant="secondary" onClick={handleBack}>Atrás</Button>
                                    <Button type="submit" variant="primary" disabled={loading}>
                                        {loading ? 'Enviando código...' : 'Siguiente'}
                                    </Button>
                                </div>
                            </>
                        )}

                        {/* Paso 5 — Verificación de correo */}
                        {step === 5 && (
                            <>
                                <div className={styles.uploadCopy}>
                                    <MailCheck size={30} />
                                    <strong>Verifica tu correo</strong>
                                    <p>Ingresa el código enviado a {form.correo}</p>
                                </div>

                                <Button type="button" variant="secondary" onClick={handleReenviarOtp} disabled={loading || correoVerificado}>Reenviar código</Button>
                                <Input name="otp" placeholder="Código de verificación" value={otp} readOnly={correoVerificado || loading} autoComplete="one-time-code" onChange={(e) => setOtp(e.target.value)} />

                                <div className={styles.buttons}>
                                    <Button type="button" disabled={loading} variant="secondary" onClick={handleBack}>Atrás</Button>
                                    <Button type="button" disabled={loading} variant="primary" onClick={handleVerificarOtp}>
                                        {loading ? 'Completando registro...' : correoVerificado ? 'Completar registro' : 'Verificar y completar'}
                                    </Button>
                                </div>
                            </>
                        )}

                        {/* Paso 2 — Documento de identidad */}
                        {step === 2 && (
                            <>
                                <div className={styles.uploadCopy}>
                                    <CreditCard size={30} />
                                    <strong>Verifica tu identidad</strong>
                                    <p>{documentoVerificado ? 'Identidad verificada. El documento ya no se puede modificar.' : 'Carga imágenes claras de tu documento.'}</p>
                                </div>

                                <div className={styles.resumeUpload}>
                                    <input disabled={documentoVerificado || loading} id="documento-frente" className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp"
                                        onChange={(e) => setDocumentoFrente(e.target.files?.[0] ?? null)} />

                                    {documentoFrente ? (
                                        <div className={`${styles.uploadSurface} ${styles.selectedFile}`}>
                                            <span className={styles.fileIcon}><FileText size={25} /></span>
                                            <div className={styles.fileDetails}>
                                                <div className={styles.fileNameRow}>
                                                    <strong>{documentoFrente.name}</strong>
                                                    <CheckCircle2 size={17} />
                                                </div>
                                                <span>{formatFileSize(documentoFrente.size)}</span>
                                            </div>
                                            <label className={styles.changeFile} htmlFor="documento-frente">
                                                <RefreshCw size={15} /> Cambiar
                                            </label>
                                        </div>
                                    ) : (
                                        <div className={styles.uploadSurface}>
                                            <span className={styles.uploadIcon}><FileUp size={28} /></span>
                                            <div className={styles.uploadCopy}>
                                                <strong>Frente del documento</strong>
                                                <p>JPG, PNG o WEBP · máximo 8 MB</p>
                                            </div>
                                            <label className={styles.selectFile} htmlFor="documento-frente">
                                                <FileUp size={17} /> Seleccionar imagen
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {form.tipo_documento === 'CC' && (
                                    <div className={styles.resumeUpload}>
                                        <input disabled={documentoVerificado || loading} id="documento-reverso" className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp"
                                            onChange={(e) => setDocumentoReverso(e.target.files?.[0] ?? null)} />

                                        {documentoReverso ? (
                                            <div className={`${styles.uploadSurface} ${styles.selectedFile}`}>
                                                <span className={styles.fileIcon}><FileText size={25} /></span>
                                                <div className={styles.fileDetails}>
                                                    <div className={styles.fileNameRow}>
                                                        <strong>{documentoReverso.name}</strong>
                                                        <CheckCircle2 size={17} />
                                                    </div>
                                                    <span>{formatFileSize(documentoReverso.size)}</span>
                                                </div>
                                                <label className={styles.changeFile} htmlFor="documento-reverso">
                                                    <RefreshCw size={15} /> Cambiar
                                                </label>
                                            </div>
                                        ) : (
                                            <div className={styles.uploadSurface}>
                                                <span className={styles.uploadIcon}><FileUp size={28} /></span>
                                                <div className={styles.uploadCopy}>
                                                    <strong>Reverso del documento</strong>
                                                    <p>JPG, PNG o WEBP · máximo 8 MB</p>
                                                </div>
                                                <label className={styles.selectFile} htmlFor="documento-reverso">
                                                    <FileUp size={17} /> Seleccionar imagen
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className={styles.buttons}>
                                    <Button type="button" disabled={loading} variant="secondary" onClick={handleBack}>Atrás</Button>
                                    <Button type="button" disabled={loading} variant="primary" onClick={handleDocumento}>
                                        {loading ? 'Verificando identidad...' : documentoVerificado ? 'Siguiente' : 'Verificar y continuar'}
                                    </Button>
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* ── FORMULARIO PARA MÉDICO (3 pasos) ─────────────────────── */}
                {role === 'medico' && (
                    <>
                        {/* Paso 1 — Datos personales básicos */}
                        {step === 1 && (
                            <>
                                <Input name="nombre" placeholder="Nombre" onChange={handleChange} value={form.nombre} />
                                {errors.nombre && <p className={styles.error}>{errors.nombre}</p>}

                                <Input name="apellido" placeholder="Apellido" onChange={handleChange} value={form.apellido} />
                                {errors.apellido && <p className={styles.error}>{errors.apellido}</p>}

                                <Input name="cedula" placeholder="Cédula" onChange={handleChange} value={form.cedula} />
                                {errors.cedula && <p className={styles.error}>{errors.cedula}</p>}

                                <Input type="date" name="fecha_nacimiento" placeholder="Fecha de nacimiento" onChange={handleChange} value={form.fecha_nacimiento} />
                                {errors.fecha_nacimiento && <p className={styles.error}>{errors.fecha_nacimiento}</p>}

                                <div className={styles.buttons}>
                                    {/* Vuelve a la selección de rol */}
                                    <Button type="button" variant="secondary" onClick={() => setRole(null)}>Atrás</Button>
                                    <Button type="button" variant="primary" onClick={handleNextStep}>Siguiente</Button>
                                </div>
                            </>
                        )}

                        {/* Paso 2 — Ubicación y especialidad */}
                        {step === 2 && (
                            <>
                                <Input name="telefono" placeholder="Teléfono" onChange={handleChange} value={form.telefono} />
                                {errors.telefono && <p className={styles.error}>{errors.telefono}</p>}

                                <Input name="direccion" placeholder="Dirección" onChange={handleChange} value={form.direccion} />
                                {errors.direccion && <p className={styles.error}>{errors.direccion}</p>}

                                {/* Selector de departamento: solo filtra ciudades, no se envía a la BD */}
                                <select
                                    name="departamento_filtro"
                                    onChange={handleChange}
                                    className={styles.select}
                                    value={form.departamento_filtro}
                                >
                                    <option value="" disabled>Selecciona tu departamento</option>
                                    {departamentos.map((dep) => (
                                        <option key={dep.id} value={dep.id}>{dep.nombre}</option>
                                    ))}
                                </select>
                                {errors.departamento_filtro && <span className={styles.error}>{errors.departamento_filtro}</span>}

                                {/* Selector de ciudad: se deshabilita hasta elegir departamento y sí va a la BD */}
                                <select
                                    name="id_ciudad"
                                    onChange={handleChange}
                                    className={styles.select}
                                    value={form.id_ciudad}
                                    disabled={!form.departamento_filtro}
                                >
                                    <option value="" disabled>Selecciona tu ciudad</option>
                                    {ciudades.map((ciu) => (
                                        <option key={ciu.id_ciudad} value={ciu.id_ciudad}>{ciu.nombre_ciudad}</option>
                                    ))}
                                </select>
                                {errors.id_ciudad && <span className={styles.error}>{errors.id_ciudad}</span>}

                                {/* Selector de especialidad médica */}
                                <select
                                    name="id_especialidad"
                                    onChange={handleChange}
                                    className={styles.select}
                                    value={form.id_especialidad}
                                >
                                    <option value="" disabled>Selecciona tu especialidad</option>
                                    {especialidades.map((esp) => (
                                        <option key={esp.id} value={esp.id}>{esp.nombre}</option>
                                    ))}
                                </select>
                                {errors.id_especialidad && <span className={styles.error}>{errors.id_especialidad}</span>}

                                <div className={styles.buttons}>
                                    <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>Atrás</Button>
                                    <Button type="button" variant="primary" onClick={handleNextStep}>Siguiente</Button>
                                </div>
                            </>
                        )}

                        {/* Paso 3 — Credenciales de acceso */}
                        {step === 3 && (
                            <>
                                <Input name="correo" placeholder="Correo" onChange={handleChange} value={form.correo} />
                                {errors.correo && <p className={styles.error}>{errors.correo}</p>}

                                <Input type="password" name="contraseña" placeholder="Contraseña" onChange={handleChange} value={form.contraseña} />
                                {errors.contraseña && <p className={styles.error}>{errors.contraseña}</p>}

                                <Input type="password" name="confirmar_contraseña" placeholder="Confirmar contraseña" onChange={handleChange} value={form.confirmar_contraseña} />
                                {errors.confirmar_contraseña && <p className={styles.error}>{errors.confirmar_contraseña}</p>}

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
                                            <span className={styles.fileIcon} aria-hidden="true">
                                                <FileText size={25} />
                                            </span>
                                            <div className={styles.fileDetails}>
                                                <div className={styles.fileNameRow}>
                                                    <strong title={form.hoja_vida.name}>{form.hoja_vida.name}</strong>
                                                    <CheckCircle2 size={17} aria-label="Archivo seleccionado" />
                                                </div>
                                                <span id="hoja-vida-help">{formatFileSize(form.hoja_vida.size)} · PDF</span>
                                            </div>
                                            <label className={styles.changeFile} htmlFor="hoja-vida">
                                                <RefreshCw size={15} aria-hidden="true" /> Cambiar PDF
                                            </label>
                                        </div>
                                    ) : (
                                        <div className={styles.uploadSurface}>
                                            <span className={styles.uploadIcon} aria-hidden="true">
                                                <FileUp size={28} />
                                            </span>
                                            <div className={styles.uploadCopy}>
                                                <strong>Adjunta tu hoja de vida</strong>
                                                <p>Selecciona un archivo PDF con tu información profesional.</p>
                                            </div>
                                            <label className={styles.selectFile} htmlFor="hoja-vida">
                                                <FileUp size={17} aria-hidden="true" /> Seleccionar PDF
                                            </label>
                                            <small id="hoja-vida-help">PDF · máximo 5 MB</small>
                                        </div>
                                    )}
                                </div>
                                {errors.hoja_vida && <p id="hoja-vida-error" className={styles.error}>{errors.hoja_vida}</p>}

                                <div className={styles.buttons}>
                                    {/* Retrocede 2 pasos para volver al paso 1 */}
                                    <Button type="button" variant="secondary" onClick={() => setStep(step - 2)}>Atrás</Button>
                                    <Button type="submit" variant="primary" disabled={loading}>
                                        {loading ? 'Registrando...' : 'Registrarse'}
                                    </Button>
                                </div>
                            </>
                        )}
                    </>
                )}

            </div>
        </form>
    )
}
