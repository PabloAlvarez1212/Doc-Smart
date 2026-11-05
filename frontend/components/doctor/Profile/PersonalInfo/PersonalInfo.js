"use client";

import { Mail, LockKeyhole, UserRound, BriefcaseMedical, Save, LoaderCircle, MapPinned, Eye, EyeOff, ShieldCheck, Info, ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getCiudadesConsultorioService } from '@/app/services/catalogs';
import Modal from "../../../ui/Modal/Modal";
import Button from "../../../ui/Button/Button";
import Input from "../../../ui/Input/Input";
import ConsultorioMap from "../../../ui/ConsultorioMap/ConsultorioMap";
import styles from "./PersonalInfo.module.css";

const MAX_PRESENTACION = 600;

// Muestra solo los últimos caracteres de un dato sensible hasta que el titular lo revele.
const ocultar = (valor) => {
    const texto = String(valor ?? "");
    if (!texto) return "";
    return texto.length <= 3 ? "•".repeat(texto.length) : `${"•".repeat(Math.min(texto.length - 3, 8))}${texto.slice(-3)}`;
};

function SecretField({ id, label, valor, visible, onToggle, nota }) {
    return (
        <div className={styles.itemInput}>
            <div className={styles.labelRow}>
                <label htmlFor={id}>{label}</label>
                <span><LockKeyhole size={12} aria-hidden="true" /> {nota}</span>
            </div>
            <div className={styles.secret}>
                <Input id={id} aria-label={label} name={id} value={visible ? valor : ocultar(valor)} readOnly />
                <button type="button" className={styles.reveal} onClick={onToggle} aria-pressed={visible} aria-label={`${visible ? "Ocultar" : "Mostrar"} ${label.toLowerCase()}`}>
                    {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
            </div>
        </div>
    );
}

export default function PersonalInfo({
    onCambiarCorreo, ocupadoCorreo = false,
    perfil,
    actualizarPerfilMedico,
    guardando,
}) {
    const [nombre, setNombre] = useState("");
    const [apellido, setApellido] = useState("");
    const [fechaNacimiento, setFechaNacimiento] = useState("");
    const [telefono, setTelefono] = useState("");
    const [aniosExperiencia, setAniosExperiencia] = useState("");
    const [presentacion, setPresentacion] = useState("");
    const [verCedula, setVerCedula] = useState(false);
    const [verRegistro, setVerRegistro] = useState(false);
    const [pendiente, setPendiente] = useState(null);

    const [direccion, setDireccion] = useState(() => perfil?.direccion ?? '');
    const [latitud, setLatitud] = useState(() => perfil?.latitud ?? '');
    const [longitud, setLongitud] = useState(() => perfil?.longitud ?? '');
    const [ciudad, setCiudad] = useState(() => perfil?.ciudad ?? '');
    const [especialidad, setEspecialidad] = useState("");
    const [errorUbicacion, setErrorUbicacion] = useState("");
    const [ciudadId, setCiudadId] = useState(() => String(perfil?.ciudad_id ?? ''));
    const [ciudades, setCiudades] = useState([]);
    const [cargandoCiudades, setCargandoCiudades] = useState(true);
    const [errorCiudades, setErrorCiudades] = useState('');
    const [intentoCiudades, setIntentoCiudades] = useState(0);
    const [ubicacionVerificada, setUbicacionVerificada] = useState(false);
    const [validandoUbicacion, setValidandoUbicacion] = useState(false);

    useEffect(() => {
        let activo = true;
        setCargandoCiudades(true); setErrorCiudades('');
        getCiudadesConsultorioService().then(data => {
            if (!Array.isArray(data)) throw new Error('Catálogo inválido');
            if (activo) setCiudades(data);
        }).catch(() => { if (activo) setErrorCiudades('No pudimos cargar las ciudades. Inténtalo nuevamente.'); })
          .finally(() => { if (activo) setCargandoCiudades(false); });
        return () => { activo = false; };
    }, [intentoCiudades]);

    const ciudadSeleccionada = useMemo(() => ({
        id: Number(ciudadId) || null, nombre: ciudad,
        departamento: ciudades.find(c => String(c.id_ciudad) === String(ciudadId))?.nombre_departamento || (String(ciudadId) === String(perfil?.ciudad_id) ? perfil?.departamento : ''),
    }), [ciudadId, ciudad, ciudades, perfil?.ciudad_id, perfil?.departamento]);

    const restaurar = () => {
        if (!perfil) return;

        setNombre(perfil.nombre ?? "");
        setApellido(perfil.apellido ?? "");
        setFechaNacimiento(perfil.fecha_nacimiento ?? "");
        setTelefono(perfil.telefono ?? "");
        setAniosExperiencia(perfil.anios_experiencia ?? "");
        setPresentacion(perfil.presentacion ?? "");

        setDireccion(perfil.direccion ?? "");
        setLatitud(perfil.latitud ?? "");
        setLongitud(perfil.longitud ?? "");
        setCiudad(perfil.ciudad ?? "");
        setCiudadId(String(perfil.ciudad_id ?? ''));
        setUbicacionVerificada(false);
        setEspecialidad(perfil.especialidad ?? "");
        setErrorUbicacion("");
    };

    useEffect(restaurar, [perfil?.id, perfil?.nombre, perfil?.apellido, perfil?.fecha_nacimiento, perfil?.telefono, perfil?.anios_experiencia, perfil?.presentacion, perfil?.direccion, perfil?.latitud, perfil?.longitud, perfil?.ciudad, perfil?.ciudad_id, perfil?.especialidad]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleUbicacion = (ubicacion) => {
        if (guardando) return;

        setDireccion(ubicacion.direccion);
        setLatitud(ubicacion.latitud);
        setLongitud(ubicacion.longitud);
        setUbicacionVerificada(Boolean(ubicacion.verificada));
        setErrorUbicacion("");
    };

    const cambioCiudad = String(ciudadId) !== String(perfil?.ciudad_id ?? '');
    const cambioUbicacion = direccion !== (perfil?.direccion ?? '') || String(latitud) !== String(perfil?.latitud ?? '') || String(longitud) !== String(perfil?.longitud ?? '');

    // Lista de lo que cambia: sirve para mostrar la barra de guardado y para que el médico confirme sin perder datos.
    const cambios = useMemo(() => {
        const lista = [];
        const vacio = (valor) => (String(valor ?? "").trim() === "" ? "Sin dato" : String(valor));
        if (telefono !== (perfil?.telefono ?? "")) lista.push(["Teléfono", vacio(perfil?.telefono), vacio(telefono)]);
        if (String(aniosExperiencia) !== String(perfil?.anios_experiencia ?? "")) lista.push(["Años de experiencia", vacio(perfil?.anios_experiencia), vacio(aniosExperiencia)]);
        if (presentacion !== (perfil?.presentacion ?? "")) lista.push(["Presentación", perfil?.presentacion ? "Texto anterior" : "Sin dato", presentacion ? "Texto actualizado" : "Sin dato"]);
        if (cambioCiudad) lista.push(["Ciudad", vacio(perfil?.ciudad), vacio(ciudad)]);
        if (cambioUbicacion) lista.push(["Dirección del consultorio", vacio(perfil?.direccion), vacio(direccion)]);
        return lista;
    }, [telefono, aniosExperiencia, presentacion, cambioCiudad, cambioUbicacion, ciudad, direccion, perfil?.telefono, perfil?.anios_experiencia, perfil?.presentacion, perfil?.ciudad, perfil?.direccion]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (guardando || validandoUbicacion || !cambios.length) return;

        if ((cambioCiudad || cambioUbicacion) && (!ciudadSeleccionada.id || !ubicacionVerificada)) {
            setErrorUbicacion('Selecciona una dirección o un punto del mapa para verificar que pertenece a la ciudad elegida.');
            return;
        }

        const tieneValor = (valor) =>
            valor != null && String(valor).trim() !== "";

        const tieneLatitud = tieneValor(latitud);
        const tieneLongitud = tieneValor(longitud);

        const ubicacionValida =
            tieneLatitud &&
            tieneLongitud &&
            Number.isFinite(Number(latitud)) &&
            Number.isFinite(Number(longitud)) &&
            Math.abs(Number(latitud)) <= 90 &&
            Math.abs(Number(longitud)) <= 180;

        if (
            !ubicacionValida &&
            (cambioUbicacion || tieneLatitud || tieneLongitud)
        ) {
            setErrorUbicacion(
                "Selecciona una dirección o un punto válido del mapa."
            );
            return;
        }

        if (
            ubicacionValida &&
            (!direccion.trim() || direccion.length > 100)
        ) {
            setErrorUbicacion(
                "La dirección debe tener entre 1 y 100 caracteres."
            );
            return;
        }

        const formData = {
            nombre,
            apellido,
            fecha_nacimiento: fechaNacimiento,
            telefono,
            anios_experiencia: String(aniosExperiencia).trim() === "" ? null : Number(aniosExperiencia),
            presentacion: presentacion.trim(),
        };

        if (ubicacionValida) {
            formData.direccion = direccion;
            formData.latitud = Number(latitud).toFixed(7);
            formData.longitud = Number(longitud).toFixed(7);
        }
        if (cambioCiudad) formData.ciudad = Number(ciudadId);

        setPendiente(formData);
    };

    const confirmar = async () => {
        const datos = pendiente;
        if (!datos) return;
        const ok = await actualizarPerfilMedico(datos);
        if (ok) setPendiente(null);
    };

    const verificado = Boolean(perfil.documento_verificado_en);
    const sello = verificado ? <span><LockKeyhole size={12} aria-hidden="true" /> Verificado</span> : null;

    return (
        <form
            className={styles.containerPersonalInfo}
            onSubmit={handleSubmit}
            aria-busy={guardando}
        >
            <section className={styles.infoSection} aria-labelledby="seccion-personal">
                <div className={styles.title}>
                    <span aria-hidden="true"><UserRound size={21} /></span>
                    <div><h2 id="seccion-personal">Información personal</h2><p>Tus datos de identidad y contacto.</p></div>
                </div>

                <div className={styles.inputs}>
                    <div className={styles.itemInput}>
                        <div className={styles.labelRow}><label htmlFor="nombre">Nombre</label>{sello}</div>
                        <Input id="nombre" aria-label="Nombre" name="nombre" value={nombre} readOnly disabled={guardando} />
                    </div>

                    <div className={styles.itemInput}>
                        <div className={styles.labelRow}><label htmlFor="apellido">Apellido</label>{sello}</div>
                        <Input id="apellido" aria-label="Apellido" name="apellido" value={apellido} readOnly disabled={guardando} />
                    </div>

                    <div className={styles.itemInput}>
                        <div className={styles.labelRow}><label htmlFor="fechaNacimiento">Fecha de nacimiento</label>{sello}</div>
                        <Input id="fechaNacimiento" aria-label="Fecha de nacimiento" name="fechaNacimiento" type="date" value={fechaNacimiento} readOnly disabled={guardando} />
                    </div>

                    <SecretField id="cedula" label="Cédula" valor={perfil?.cedula ?? ""} visible={verCedula} onToggle={() => setVerCedula(v => !v)} nota="Solo tú puedes verla" />

                    <div className={styles.itemInput}>
                        <label htmlFor="telefono">Teléfono</label>
                        <Input
                            id="telefono"
                            aria-label="Teléfono"
                            name="telefono"
                            type="tel"
                            value={telefono}
                            onChange={(event) => setTelefono(event.target.value)}
                            disabled={guardando}
                        />
                        <p className={styles.fieldHelp}>Los pacientes ven este número en tu perfil.</p>
                    </div>

                    <div className={styles.itemInput}>
                        <label htmlFor="correo">Correo electrónico</label>
                        <Input id="correo" aria-label="Correo electrónico" name="correo" value={perfil?.correo ?? ""} readOnly />
                        <p className={styles.fieldHelp}>Los pacientes ven este correo en tu perfil.</p>
                    </div>
                </div>
            </section>

            <section className={styles.infoSection} aria-labelledby="seccion-profesional">
                <div className={styles.title}>
                    <span aria-hidden="true"><BriefcaseMedical size={21} /></span>
                    <div><h2 id="seccion-profesional">Información profesional</h2><p>Lo que los pacientes ven al abrir tu perfil.</p></div>
                </div>

                <div className={styles.inputs}>
                    <div className={styles.itemInput}>
                        <div className={styles.labelRow}><label htmlFor="especialidad">Especialidad</label></div>
                        <Input id="especialidad" aria-label="Especialidad" name="especialidad" value={especialidad} readOnly />
                    </div>

                    <SecretField id="registro-medico" label="Registro médico" valor={perfil?.registro_medico ?? ""} visible={verRegistro} onToggle={() => setVerRegistro(v => !v)} nota="Validado y cifrado" />

                    <div className={styles.itemInput}>
                        <label htmlFor="anios">Años de experiencia</label>
                        <Input
                            id="anios"
                            aria-label="Años de experiencia"
                            name="anios"
                            type="number"
                            min={0}
                            max={70}
                            value={aniosExperiencia}
                            onChange={(event) => setAniosExperiencia(event.target.value)}
                            disabled={guardando}
                        />
                        <p className={styles.fieldHelp}>Visible para los pacientes.</p>
                    </div>

                    <div className={`${styles.itemInput} ${styles.wide}`}>
                        <div className={styles.labelRow}>
                            <label htmlFor="presentacion">Presentación</label>
                            <span className={presentacion.length > MAX_PRESENTACION - 40 ? styles.counterWarn : styles.counter}>{presentacion.length}/{MAX_PRESENTACION}</span>
                        </div>
                        <textarea
                            id="presentacion"
                            name="presentacion"
                            rows={5}
                            maxLength={MAX_PRESENTACION}
                            value={presentacion}
                            onChange={(event) => setPresentacion(event.target.value)}
                            disabled={guardando}
                            placeholder="Cuéntales a tus pacientes cómo atiendes y en qué puedes ayudarles."
                            aria-describedby="presentacion-ayuda"
                        />
                        <p id="presentacion-ayuda" className={styles.fieldHelp}>Este texto aparece en tu perfil cuando un paciente te busca.</p>
                    </div>
                </div>
            </section>

            <section className={styles.infoSection} aria-labelledby="seccion-consultorio">
                <div className={styles.title}>
                    <span aria-hidden="true"><MapPinned size={21} /></span>
                    <div><h2 id="seccion-consultorio">Consultorio</h2><p>Dónde atiendes. Los pacientes usan esta ubicación para llegar.</p></div>
                </div>

                <div className={`${styles.inputs}`}>
                    <div className={styles.itemInput}>
                        <label htmlFor="ciudad">Ciudad</label>
                        <select
                            id="ciudad"
                            aria-label="Ciudad"
                            name="ciudad"
                            value={ciudadId}
                            disabled={guardando || cargandoCiudades}
                            aria-describedby={errorCiudades ? 'ciudad-error' : 'ciudad-help'}
                            onChange={event => {
                                const id = event.target.value;
                                const elegida = ciudades.find(c => String(c.id_ciudad) === id);
                                setCiudadId(id); setCiudad(elegida?.nombre_ciudad || '');
                                setDireccion(''); setLatitud(''); setLongitud(''); setUbicacionVerificada(false);
                                setErrorUbicacion('Selecciona la dirección del consultorio en la nueva ciudad.');
                            }}
                        >
                            <option value="">{cargandoCiudades ? 'Cargando ciudades…' : 'Selecciona una ciudad'}</option>
                            {perfil?.ciudad_id && !ciudades.some(c => String(c.id_ciudad) === String(perfil.ciudad_id)) && <option value={perfil.ciudad_id}>{perfil.ciudad}</option>}
                            {ciudades.map(c => <option key={c.id_ciudad} value={c.id_ciudad}>{c.nombre_ciudad} · {c.nombre_departamento}</option>)}
                        </select>
                        {errorCiudades ? <p id="ciudad-error" role="alert">{errorCiudades} <button type="button" onClick={() => setIntentoCiudades(n => n+1)}>Reintentar</button></p> : <p id="ciudad-help" className={styles.fieldHelp}>Al cambiar la ciudad, selecciona nuevamente la dirección.</p>}
                    </div>

                    <div className={styles.itemInput}>
                        <label htmlFor="direccion">Dirección del consultorio</label>
                        <Input id="direccion" aria-label="Dirección del consultorio" name="direccion" value={direccion} placeholder="Selecciona la dirección en el mapa" readOnly />
                    </div>
                </div>

                <div className={styles.mapContainer}>
                    <ConsultorioMap
                        direccion={direccion}
                        latitud={latitud}
                        longitud={longitud}
                        onChange={handleUbicacion}
                        disabled={guardando}
                        error={errorUbicacion}
                        ciudad={ciudadSeleccionada}
                        onValidando={setValidandoUbicacion}
                        ubicacionGuardada={Boolean(direccion && direccion === perfil?.direccion &&
                            String(latitud) === String(perfil?.latitud ?? '') && String(longitud) === String(perfil?.longitud ?? '') &&
                            String(ciudadId) === String(perfil?.ciudad_id ?? ''))}
                    />
                </div>
            </section>

            <div className={styles.btn}>
                <div><strong>Actualizar perfil</strong><p>Guarda los cambios de tu información.</p></div>
                <div className={styles.actionButtons}>
                    <Button type="button" variant="secondary" className={styles.emailButton} disabled={guardando || ocupadoCorreo} onClick={onCambiarCorreo}><Mail size={17} aria-hidden="true" />Cambiar correo</Button>
                    <Button
                        className={styles.btnGreen}
                        type="submit"
                        disabled={guardando || ocupadoCorreo || validandoUbicacion}
                    >
                        {guardando ? <><LoaderCircle size={17} className={styles.spinner} aria-hidden="true" />Guardando...</> : <><Save size={17} aria-hidden="true" />Guardar cambios</>}
                    </Button>
                </div>
            </div>

            <Modal
                abierto={Boolean(pendiente)}
                onCerrar={() => { if (!guardando) setPendiente(null); }}
                titulo="¿Guardar los cambios?"
                text="Revisa lo que se va a actualizar en tu perfil."
                width="520px"
                icon={<ShieldCheck size={22} aria-hidden="true" />}
                footer={<>
                    <button type="button" className={styles.discard} onClick={() => setPendiente(null)} disabled={guardando}>Seguir editando</button>
                    <button type="button" className={styles.save} onClick={confirmar} disabled={guardando}>
                        {guardando ? <><LoaderCircle size={17} className={styles.spinner} aria-hidden="true" />Guardando…</> : <><Save size={17} aria-hidden="true" />Confirmar y guardar</>}
                    </button>
                </>}
            >
                <ul className={styles.changeList}>
                    {cambios.map(([campo, antes, despues]) => (
                        <li key={campo}>
                            <strong>{campo}</strong>
                            <span className={styles.before}>{antes}</span>
                            <ArrowRight size={15} aria-hidden="true" />
                            <span className={styles.after}>{despues}</span>
                        </li>
                    ))}
                </ul>
                <p className={styles.modalNote}><Info size={15} aria-hidden="true" />Tu nombre, apellido, fecha de nacimiento, cédula y registro médico no cambian desde aquí porque ya están verificados.</p>
            </Modal>
        </form>
    );
}
