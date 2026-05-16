'use client'
import Input from '../../ui/Input/Input.js'
import Button from '../../ui/Button/Button.js'
import styles from './RegisterForm.module.css'
import { useRegister } from './UseRegister'

export default function RegisterForm({ role, setRole }) {
    const {
        form,
        step,
        loading,
        errors,
        especialidades,
        handleChange,
        handleNextStep,
        handleSubmit,
    } = useRegister(role, setRole)

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.inputs}>

                {/* ── PACIENTE ── */}
                {role === 'paciente' && (
                    <>
                        {step === 1 && (
                            <>
                                <Input name="nombre" placeholder="Nombre" onChange={handleChange} value={form.nombre} />
                                {errors.nombre && <p className={styles.error}>{errors.nombre}</p>}

                                <Input name="apellido" placeholder="Apellido" onChange={handleChange} value={form.apellido} />
                                {errors.apellido && <p className={styles.error}>{errors.apellido}</p>}

                                <Input name="correo" placeholder="Correo" onChange={handleChange} value={form.correo} />
                                {errors.correo && <p className={styles.error}>{errors.correo}</p>}

                                <Input type="password" name="contraseña" placeholder="Contraseña" onChange={handleChange} value={form.contraseña} />
                                {errors.contraseña && <p className={styles.error}>{errors.contraseña}</p>}

                                <div className={styles.buttons}>
                                    <Button type="button" variant="secondary" onClick={() => setRole(null)}>
                                        Atrás
                                    </Button>
                                    <Button type="button" variant="primary" onClick={handleNextStep}>
                                        Siguiente
                                    </Button>
                                </div>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <Input type="date" name="fecha_nacimiento" placeholder="Fecha de nacimiento" onChange={handleChange} value={form.fecha_nacimiento} />
                                {errors.fecha_nacimiento && <p className={styles.error}>{errors.fecha_nacimiento}</p>}

                                <Input type="text" name="estatura" placeholder="Estatura (ej: 1.75)" onChange={handleChange} value={form.estatura} />
                                {errors.estatura && <p className={styles.error}>{errors.estatura}</p>}

                                <Input type="text" name="peso" placeholder="Peso en kg (ej: 70)" onChange={handleChange} value={form.peso} />
                                {errors.peso && <p className={styles.error}>{errors.peso}</p>}

                                <Input name="cedula" placeholder="Cédula" onChange={handleChange} value={form.cedula} />
                                {errors.cedula && <p className={styles.error}>{errors.cedula}</p>}

                                <Input name="telefono" placeholder="Teléfono" onChange={handleChange} value={form.telefono} />
                                {errors.telefono && <p className={styles.error}>{errors.telefono}</p>}

                                <div className={styles.buttons}>
                                    <Button type="button" variant="secondary" onClick={() => setRole(null)}>
                                        Atrás
                                    </Button>
                                    <Button type="submit" variant="primary" disabled={loading}>
                                        {loading ? 'Registrando...' : 'Registrarse'}
                                    </Button>
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* ── MÉDICO ── */}
                {role === 'medico' && (
                    <>
                        {step === 1 && (
                            <>
                                <Input name="nombre" placeholder="Nombre" onChange={handleChange} value={form.nombre} />
                                {errors.nombre && <p className={styles.error}>{errors.nombre}</p>}

                                <Input name="apellido" placeholder="Apellido" onChange={handleChange} value={form.apellido} />
                                {errors.apellido && <p className={styles.error}>{errors.apellido}</p>}

                                <Input name="correo" placeholder="Correo" onChange={handleChange} value={form.correo} />
                                {errors.correo && <p className={styles.error}>{errors.correo}</p>}

                                <Input type="password" name="contraseña" placeholder="Contraseña" onChange={handleChange} value={form.contraseña} />
                                {errors.contraseña && <p className={styles.error}>{errors.contraseña}</p>}

                                <div className={styles.buttons}>
                                    <Button type="button" variant="secondary" onClick={() => setRole(null)}>
                                        Atrás
                                    </Button>
                                    <Button type="button" variant="primary" onClick={handleNextStep}>
                                        Siguiente
                                    </Button>
                                </div>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <Input name="cedula" placeholder="Cédula" onChange={handleChange} value={form.cedula} />
                                {errors.cedula && <p className={styles.error}>{errors.cedula}</p>}

                                <Input type="date" name="fecha_nacimiento" placeholder="Fecha de nacimiento" onChange={handleChange} value={form.fecha_nacimiento} />
                                {errors.fecha_nacimiento && <p className={styles.error}>{errors.fecha_nacimiento}</p>}

                                <Input name="telefono" placeholder="Teléfono" onChange={handleChange} value={form.telefono} />
                                {errors.telefono && <p className={styles.error}>{errors.telefono}</p>}

                                <Input name="direccion" placeholder="Dirección" onChange={handleChange} value={form.direccion} />
                                {errors.direccion && <p className={styles.error}>{errors.direccion}</p>}

                                <select
                                    name="id_especialidad"
                                    onChange={handleChange}
                                    className={styles.select}
                                    value={form.id_especialidad}
                                >
                                    <option value="" disabled>Selecciona tu especialidad</option>
                                    {especialidades.map((esp) => (
                                        <option key={esp.id} value={esp.id}>
                                            {esp.nombre}
                                        </option>
                                    ))}
                                </select>
                                {errors.id_especialidad && (
                                    <span className={styles.error}>{errors.id_especialidad}</span>
                                )}

                                <div className={styles.buttons}>
                                    <Button type="button" variant="secondary" onClick={() => setRole(null)}>
                                        Atrás
                                    </Button>
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