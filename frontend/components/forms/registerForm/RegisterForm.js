'use client'
import Input from '../../ui/Input/Input.js'
import Button from '../../ui/Button/Button.js'
import styles from './RegisterForm.module.css'
import { useRegister } from './UseRegister'

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
    } = useRegister(role, setRole)

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.inputs}>

                {/* ── FORMULARIO PARA PACIENTE (3 pasos) ───────────────────── */}
                {role === 'paciente' && (
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

                        {/* Paso 2 — Datos de salud */}
                        {step === 2 && (
                            <>
                                <Input name="telefono" placeholder="Teléfono" onChange={handleChange} value={form.telefono} />
                                {errors.telefono && <p className={styles.error}>{errors.telefono}</p>}

                                <Input type="text" name="estatura" placeholder="Estatura (ej: 1.75)" onChange={handleChange} value={form.estatura} />
                                {errors.estatura && <p className={styles.error}>{errors.estatura}</p>}

                                <Input type="text" name="peso" placeholder="Peso en kg (ej: 70)" onChange={handleChange} value={form.peso} />
                                {errors.peso && <p className={styles.error}>{errors.peso}</p>}

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