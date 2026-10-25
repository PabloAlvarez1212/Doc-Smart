"use client";

import { Mail, LockKeyhole, UserRound, BriefcaseMedical, Save, LoaderCircle } from "lucide-react";
import Swal from "sweetalert2";
import { useEffect, useMemo, useState } from "react";
import { getCiudadesConsultorioService } from '@/app/services/catalogs';
import Button from "../../../ui/Button/Button";
import Input from "../../../ui/Input/Input";
import ConsultorioMap from "../../../ui/ConsultorioMap/ConsultorioMap";
import styles from "./PersonalInfo.module.css";

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

    useEffect(() => {
        if (!perfil) return;

        setNombre(perfil.nombre ?? "");
        setApellido(perfil.apellido ?? "");
        setFechaNacimiento(perfil.fecha_nacimiento ?? "");
        setTelefono(perfil.telefono ?? "");


        setDireccion(perfil.direccion ?? "");
        setLatitud(perfil.latitud ?? "");
        setLongitud(perfil.longitud ?? "");
        setCiudad(perfil.ciudad ?? "");
        setCiudadId(String(perfil.ciudad_id ?? ''));
        setUbicacionVerificada(false);
        setEspecialidad(perfil.especialidad ?? "");
        setErrorUbicacion("");
    }, [perfil?.id, perfil?.nombre, perfil?.apellido, perfil?.fecha_nacimiento, perfil?.telefono, perfil?.direccion, perfil?.latitud, perfil?.longitud, perfil?.ciudad, perfil?.ciudad_id, perfil?.especialidad]);

    const handleUbicacion = (ubicacion) => {
        if (guardando) return;

        setDireccion(ubicacion.direccion);
        setLatitud(ubicacion.latitud);
        setLongitud(ubicacion.longitud);
        setUbicacionVerificada(Boolean(ubicacion.verificada));
        setErrorUbicacion("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (guardando || validandoUbicacion) return;

        const cambioCiudad = String(ciudadId) !== String(perfil?.ciudad_id ?? '');
        const cambioUbicacion = direccion !== (perfil?.direccion ?? '') || String(latitud) !== String(perfil?.latitud ?? '') || String(longitud) !== String(perfil?.longitud ?? '');
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

        const cambioDireccion =
            direccion !== (perfil?.direccion ?? "");

        if (
            !ubicacionValida &&
            (cambioDireccion || tieneLatitud || tieneLongitud)
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

        };

        if (ubicacionValida) {
            formData.direccion = direccion;
            formData.latitud = Number(latitud).toFixed(7);
            formData.longitud = Number(longitud).toFixed(7);
        }
        if (cambioCiudad) formData.ciudad = Number(ciudadId);

        const result = await Swal.fire({
            title: "¿Actualizar información?",
            text: "Se guardarán tus datos y la ubicación del consultorio.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, actualizar",
            cancelButtonText: "Cancelar",
            reverseButtons: true,
        });

        if (result.isConfirmed) {
            await actualizarPerfilMedico(formData);
        }
    };

    return (
        <form
            className={styles.containerPersonalInfo}
            onSubmit={handleSubmit}
            aria-busy={guardando}
        >
            <div className={styles.infoSection}>
                <div className={styles.title}>
                    <span aria-hidden="true"><UserRound size={21} /></span>
                    <div><h2>Información personal</h2><p>Consulta y actualiza tus datos personales.</p></div>
                </div>

                <div className={styles.inputs}>
                    <div className={styles.itemInput}>
                        <div className={styles.labelRow}><label htmlFor="nombre">Nombre</label>{perfil.documento_verificado_en && <span><LockKeyhole size={12} aria-hidden="true" /> Verificado</span>}</div>
                        <Input
                            id="nombre"
                            aria-label="Nombre"
                            name="nombre"
                            value={nombre}
                            readOnly
                            disabled={guardando}
                        />
                    </div>

                    <div className={styles.itemInput}>
                        <div className={styles.labelRow}><label htmlFor="apellido">Apellido</label>{perfil.documento_verificado_en && <span><LockKeyhole size={12} aria-hidden="true" /> Verificado</span>}</div>
                        <Input
                            id="apellido"
                            aria-label="Apellido"
                            name="apellido"
                            value={apellido}
                            readOnly
                            disabled={guardando}
                        />
                    </div>

                    <div className={styles.itemInput}>
                        <div className={styles.labelRow}><label htmlFor="fechaNacimiento">Fecha de nacimiento</label>{perfil.documento_verificado_en && <span><LockKeyhole size={12} aria-hidden="true" /> Verificado</span>}</div>
                        <Input
                            id="fechaNacimiento"
                            aria-label="Fecha de nacimiento"
                            name="fechaNacimiento"
                            type="date"
                            value={fechaNacimiento}
                            readOnly
                            disabled={guardando}
                        />
                    </div>

                    <div className={styles.itemInput}>
                        <div className={styles.labelRow}><label htmlFor="cedula">Cédula</label>{perfil.documento_verificado_en && <span><LockKeyhole size={12} aria-hidden="true" /> Verificado</span>}</div>
                        <Input
                            id="cedula"
                            aria-label="Cédula"
                            name="cedula"
                            value={perfil?.cedula ?? ""}
                            readOnly
                        />
                    </div>

                    <div className={styles.itemInput}>
                        <label htmlFor="telefono">Teléfono</label>
                        <Input
                            id="telefono"
                            aria-label="Teléfono"
                            name="telefono"
                            type="tel"
                            value={telefono}
                            onChange={(event) =>
                                setTelefono(event.target.value)
                            }
                            disabled={guardando}
                        />
                    </div>


                </div>
            </div>

            <div className={styles.infoSection}>
                <div className={styles.title}>
                    <span aria-hidden="true"><BriefcaseMedical size={21} /></span>
                    <div><h2>Información profesional</h2><p>Configura dónde atiendes para que los pacientes puedan encontrar tu consultorio.</p></div>
                </div>

                <div className={`${styles.inputs} ${styles.professionalGrid}`}>
                    <div className={styles.itemInput}>
                        <label htmlFor="especialidad">
                            Especialidad
                        </label>
                        <Input
                            id="especialidad"
                            aria-label="Especialidad"
                            name="especialidad"
                            value={especialidad}
                            readOnly
                        />
                    </div>

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

                        <Input
                            id="direccion"
                            aria-label="Dirección del consultorio"
                            name="direccion"
                            value={direccion}
                            placeholder="Selecciona la dirección en el mapa"
                            readOnly
                        />
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
            </div>

            <div className={styles.btn}>
                <div><strong>Actualizar perfil</strong><p>Guarda los cambios de tu información.</p></div>
                <div className={styles.actionButtons}><Button type="button" variant="secondary" className={styles.emailButton} disabled={guardando || ocupadoCorreo} onClick={onCambiarCorreo}><Mail size={17} aria-hidden="true" />Cambiar correo</Button>
                <Button
                    className={styles.btnGreen}
                    type="submit"
                    disabled={guardando || ocupadoCorreo || validandoUbicacion}
                >
                    {guardando ? <><LoaderCircle size={17} className={styles.spinner} aria-hidden="true" />Guardando...</> : <><Save size={17} aria-hidden="true" />Guardar cambios</>}
                </Button></div>
            </div>
        </form>
    );
}
