"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import styles from "./ConsultorioMap.module.css";
import { clinicAddress, validateClinicCity, ClinicLocationError } from './addressLocation.mjs';
import { geocodingErrorMessage, verifiedLocationAt } from './geocoding.mjs';
import { cityViewport } from './cityViewport.mjs';
import Button from '../Button/Button';
import { Check, Crosshair, LoaderCircle, LockKeyhole, MapPin, Pencil, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

let configurado = false;

function tieneCoordenadas(lat, lng) {
    return [lat,lng].every(value => value != null && value !== '' && Number.isFinite(Number(value))) &&
        Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180;
}

function configurarMaps() {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!key) {
        throw new Error("Falta configurar la clave de Google Maps.");
    }

    if (!configurado) {
        setOptions({
            key,
            v: "weekly",
            language: "es",
            region: "CO",
        });

        configurado = true;
    }
}

export default function ConsultorioMap({
    direccion,
    latitud,
    longitud,
    onChange,
    disabled = false,
    error = "",
    ciudad,
    onValidando,
    ubicacionGuardada = false,
}) {
    const buscadorRef = useRef(null);
    const mapaRef = useRef(null);
    const marcadorRef = useRef(null);
    const autocompleteRef = useRef(null);
    const ciudadAnterior = useRef(ciudad?.id);
    const solicitudRef = useRef(0);
    const seleccionarCentroRef = useRef(null);
    const confirmarPuntoRef = useRef(null);
    const cancelarPuntoRef = useRef(null);
    const cancelarBusquedaRef = useRef(null);
    const sincronizarUbicacionRef = useRef(null);
    const cambiarUbicacionRef = useRef(null);
    const fijaRef = useRef(false);
    const editandoRef = useRef(false);
    const actuales = useRef({
        direccion,
        latitud,
        longitud,
        onChange,
        disabled,
        ciudad, onValidando,
    });

    const [cargando, setCargando] = useState(true);
    const [errorMapa, setErrorMapa] = useState("");
    const [errorCiudad, setErrorCiudad] = useState('');
    const [validando, setValidando] = useState(false);
    const [puntoPendiente, setPuntoPendiente] = useState(false);
    const [vistaPrevia, setVistaPrevia] = useState('');
    const [ubicacionFija, setUbicacionFija] = useState(false);
    const reducedMotion = useReducedMotion();

    useEffect(() => {
        actuales.current = {
            direccion,
            latitud,
            longitud,
            onChange,
            disabled,
            ciudad, onValidando,
        };
    }, [direccion, latitud, longitud, onChange, disabled, ciudad, onValidando]);

    useEffect(() => {
        if (ciudadAnterior.current !== ciudad?.id) {
            ciudadAnterior.current = ciudad?.id;
            solicitudRef.current += 1;
            cancelarBusquedaRef.current?.();
            cancelarPuntoRef.current?.();
            setVistaPrevia('');
            setValidando(false);
            actuales.current.onValidando?.(false);
            if (autocompleteRef.current) autocompleteRef.current.value = '';
            if (marcadorRef.current) marcadorRef.current.map = null;
            setErrorMapa('');
            setErrorCiudad('');
            const tienePunto = tieneCoordenadas(latitud, longitud);
            editandoRef.current = !tienePunto;
            fijaRef.current = false;
            setUbicacionFija(false);
            if (tienePunto) sincronizarUbicacionRef.current?.();
            else cambiarUbicacionRef.current?.();
        }
    }, [ciudad?.id]);

    useEffect(() => {
        sincronizarUbicacionRef.current?.();
    }, [latitud, longitud, ciudad?.id, direccion]);

    useEffect(() => {
        let activo = true;
        let autocomplete;
        let marcador;
        let dragListener;
        let clickListener;
        let seleccionar;
        let falloBusqueda;
        let escribir;
        let previewTimer;
        let previewRequest = 0;
        let marcadorPendiente;
        let candidato;

        let posicionConfirmada;
        let ciudadConfirmada;
        let ubicacionConfirmada;
        let encuadreSolicitud = 0;
        let sizeObserver;
        const vistasCiudades = new globalThis.Map();

        async function iniciar() {
            try {
                configurarMaps();

                const [
                    { Map },
                    { AdvancedMarkerElement },
                    { PlaceAutocompleteElement },
                ] = await Promise.all([
                    importLibrary("maps"),
                    importLibrary("marker"),
                    importLibrary("places"),
                ]);

                if (!activo) return;

                const inicial = actuales.current;
                const tieneUbicacion = tieneCoordenadas(inicial.latitud, inicial.longitud);

                const posicionInicial = tieneUbicacion
                    ? {
                        lat: Number(inicial.latitud),
                        lng: Number(inicial.longitud),
                    }
                    : { lat: 4.5709, lng: -74.2973 };

                const mapa = new Map(mapaRef.current, {
                    center: posicionInicial,
                    zoom: tieneUbicacion ? 12 : 5,
                    mapId:
                        process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ||
                        "DEMO_MAP_ID",
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                    gestureHandling: "cooperative",
                });

                const crearMarcadorBymax = (pendiente = false) => {
                    const content = document.createElement('div');
                    content.className = `${styles.bymaxMarker} ${pendiente ? styles.bymaxPending : ''}`;
                    content.dataset.clinicMarker = 'bymax';
                    const image = document.createElement('img');
                    image.src = '/icons/asistente_bymax.png';
                    image.alt = '';
                    image.width = 64;
                    image.height = 64;
                    image.draggable = false;
                    const tip = document.createElement('span');
                    tip.className = styles.markerTip;
                    tip.setAttribute('aria-hidden', 'true');
                    tip.innerHTML = '<svg width="20" height="14" viewBox="0 0 20 14" fill="currentColor"><path d="M1 0h18L10 14Z"/></svg>';
                    content.append(image, tip);
                    return content;
                };

                marcador = new AdvancedMarkerElement({
                    map: tieneUbicacion ? mapa : null,
                    position: tieneUbicacion
                        ? posicionInicial
                        : undefined,
                    gmpDraggable: true,
                    content: crearMarcadorBymax(),
                    title: "Ubicación del consultorio · Bymax",
                });
                marcadorRef.current = marcador;
                posicionConfirmada = tieneUbicacion ? posicionInicial : null;
                ciudadConfirmada = inicial.ciudad?.id;

                const cancelarBusqueda = () => {
                    clearTimeout(previewTimer);
                    previewRequest += 1;
                    setVistaPrevia('');
                };
                cancelarBusquedaRef.current = cancelarBusqueda;
                const encuadrarCiudad = async posicion => {
                    const solicitud = ++encuadreSolicitud;
                    const city = actuales.current.ciudad;
                    if (!city?.id || !posicion) return;
                    const key = JSON.stringify([city.id,city.nombre,city.departamento]);
                    try {
                        if (!vistasCiudades.has(key)) {
                            const consulta = (async () => {
                                const { Geocoder } = await importLibrary('geocoding');
                                const { results } = await new Geocoder().geocode({
                                    address: `${city.nombre}, ${city.departamento || ''}, Colombia`,
                                    componentRestrictions: {country:'CO'},
                                });
                                return results;
                            })().catch(error => { vistasCiudades.delete(key); throw error; });
                            vistasCiudades.set(key, consulta);
                        }
                        const results = await vistasCiudades.get(key);
                        if (!activo || solicitud !== encuadreSolicitud || !fijaRef.current || city.id !== actuales.current.ciudad?.id) return;
                        const bounds = cityViewport(results,city,posicion);
                        mapa.fitBounds(bounds, {top:90,right:24,bottom:24,left:24});
                        setErrorCiudad('');
                    } catch {
                        if (activo && solicitud === encuadreSolicitud && fijaRef.current) {
                            setErrorCiudad('No pudimos cargar la vista completa de la ciudad. Bymax sigue señalando la ubicación del consultorio.');
                        }
                    }
                };
                const fijarUbicacion = posicion => {
                    cancelarBusqueda();
                    editandoRef.current = false;
                    fijaRef.current = true;
                    setUbicacionFija(true);
                    mapa.setCenter(posicion);
                    mapa.setZoom(12);
                    mapa.setOptions({gestureHandling:'none',draggable:false,scrollwheel:false,
                        disableDoubleClickZoom:true,keyboardShortcuts:false,zoomControl:false,cameraControl:false,clickableIcons:false});
                    marcador.gmpDraggable = false;
                    marcador.content.dataset.locked = 'true';
                    if (autocomplete) autocomplete.disabled = true;
                    encuadrarCiudad(posicion);
                };
                cambiarUbicacionRef.current = () => {
                    if (!activo || actuales.current.disabled) return;
                    editandoRef.current = true;
                    fijaRef.current = false;
                    setUbicacionFija(false);
                    setErrorMapa('');
                    setErrorCiudad('');
                    encuadreSolicitud += 1;
                    setVistaPrevia('Puedes buscar otra dirección o elegir un punto. La ubicación anterior se conserva hasta que confirmes otra.');
                    mapa.setOptions({gestureHandling:'cooperative',draggable:true,scrollwheel:true,
                        disableDoubleClickZoom:false,keyboardShortcuts:true,zoomControl:true,cameraControl:true,clickableIcons:false});
                    marcador.gmpDraggable = true;
                    marcador.content.dataset.locked = 'false';
                    if (autocomplete) autocomplete.disabled = false;
                };
                sincronizarUbicacionRef.current = () => {
                    const actual = actuales.current;
                    if (editandoRef.current || !actual.ciudad?.id || !tieneCoordenadas(actual.latitud, actual.longitud)) return;
                    const posicion = {lat:Number(actual.latitud),lng:Number(actual.longitud)};
                    posicionConfirmada = posicion;
                    ciudadConfirmada = actual.ciudad.id;
                    marcador.position = posicion;
                    marcador.map = mapa;
                    fijarUbicacion(posicion);
                };
                const cancelarPunto = () => {
                    candidato = null;
                    if (marcadorPendiente) marcadorPendiente.map = null;
                    setPuntoPendiente(false);
                    actuales.current.onValidando?.(false);
                    marcador.map = ciudadConfirmada === actuales.current.ciudad?.id && actuales.current.latitud !== '' && posicionConfirmada ? mapa : null;
                    if (posicionConfirmada) marcador.position = posicionConfirmada;
                };
                cancelarPuntoRef.current = cancelarPunto;

                autocomplete = new PlaceAutocompleteElement({includedRegionCodes:['co']});
                autocompleteRef.current = autocomplete;
                autocomplete.className = styles.autocomplete;
                autocomplete.setAttribute(
                    "aria-label",
                    "Buscar dirección del consultorio"
                );

                buscadorRef.current.replaceChildren(autocomplete);

                seleccionar = async (event) => {
                    if (!activo || actuales.current.disabled || fijaRef.current) return;

                    cancelarBusqueda();
                    cancelarPunto();

                    const numeroSolicitud = ++solicitudRef.current;
                    const ciudadBusqueda = actuales.current.ciudad;

                    setErrorMapa("");
                    setValidando(true);
                    actuales.current.onValidando?.(true);
                    marcador.map = null;

                    actuales.current.onChange({
                        direccion: actuales.current.direccion,
                        latitud: "",
                        longitud: "",
                    });

                    try {
                        if (!ciudadBusqueda?.id) throw new Error('Selecciona la ciudad del consultorio antes de buscar la dirección.');
                        const lugar = event.placePrediction.toPlace();

                        await lugar.fetchFields({
                            fields: ["formattedAddress", "location", "addressComponents"],
                        });

                        if (
                            !activo ||
                            numeroSolicitud !== solicitudRef.current ||
                            actuales.current.disabled || ciudadBusqueda?.id !== actuales.current.ciudad?.id
                        ) {
                            return;
                        }

                        if (!lugar.location || !lugar.formattedAddress) {
                            throw new Error(
                                "Selecciona un resultado con dirección y ubicación."
                            );
                        }
                        const compacta = clinicAddress(lugar.addressComponents, ciudadBusqueda);

                        const posicion = {
                            lat: lugar.location.lat(),
                            lng: lugar.location.lng(),
                        };

                        const ubicacion = {
                            direccion: compacta.direccion,
                            latitud: posicion.lat.toFixed(7),
                            longitud: posicion.lng.toFixed(7),
                            verificada: true,
                        };

                        actuales.current = {
                            ...actuales.current,
                            ...ubicacion,
                        };

                        marcador.position = posicion;
                        posicionConfirmada = posicion;
                        ciudadConfirmada = ciudadBusqueda.id;
                        ubicacionConfirmada = {...ubicacion, cityId:ciudadBusqueda.id};
                        marcador.map = mapa;
                        mapa.setCenter(posicion);
                        mapa.setZoom(17);

                        actuales.current.onChange(ubicacion);
                        fijarUbicacion(posicion);
                        setVistaPrevia('Dirección verificada. Guarda los cambios para actualizar el perfil.');
                    } catch (e) {
                        if (activo && numeroSolicitud === solicitudRef.current && ciudadBusqueda?.id === actuales.current.ciudad?.id) {
                            setErrorMapa(
                                e.message ||
                                "No pudimos obtener la ubicación."
                            );
                        }
                    } finally {
                        if (activo && numeroSolicitud === solicitudRef.current) {
                            setValidando(false);
                            actuales.current.onValidando?.(false);
                        }
                    }
                };

                falloBusqueda = () => {
                    if (activo) {
                        setErrorMapa(
                            "No pudimos buscar direcciones. Intenta nuevamente."
                        );
                    }
                };

                autocomplete.addEventListener("gmp-select", seleccionar);
                autocomplete.addEventListener("gmp-error", falloBusqueda);

                escribir = () => {
                    cancelarBusqueda();
                    if (!activo || actuales.current.disabled || fijaRef.current) return;
                    editandoRef.current = true;
                    solicitudRef.current += 1;
                    setValidando(false);
                    cancelarPunto();
                    const query = autocomplete.value?.trim() || '';
                    const city = actuales.current.ciudad;
                    if (query.length < 4 || !city?.id) return;
                    const request = previewRequest;
                    setVistaPrevia('Buscando la zona…');
                    previewTimer = setTimeout(async () => {
                        try {
                            const { Geocoder } = await importLibrary('geocoding');
                            const { results } = await new Geocoder().geocode({
                                address: `${query}, ${city.nombre}, ${city.departamento || ''}, Colombia`,
                                componentRestrictions: { country: 'CO' },
                            });
                            if (!activo || request !== previewRequest || actuales.current.disabled || city.id !== actuales.current.ciudad?.id) return;
                            const place = results?.[0];
                            validateClinicCity(place?.address_components, city);
                            if (!place?.geometry?.location) throw new Error('Sin ubicación');
                            const location = place.geometry.location;
                            mapa.setCenter({lat: typeof location.lat === 'function' ? location.lat() : location.lat, lng: typeof location.lng === 'function' ? location.lng() : location.lng});
                            mapa.setZoom(place.address_components.some(c => c.types?.includes('street_number')) ? 17 : 15);
                            setVistaPrevia('Vista previa de la zona. Toca el mapa para marcar el punto exacto.');
                        } catch (e) {
                            if (activo && request === previewRequest) setVistaPrevia(geocodingErrorMessage(e));
                        }
                    }, 700);
                };
                autocomplete.addEventListener('input', escribir);

                const seleccionarPunto = async (posicion) => {
                    if (!activo || actuales.current.disabled) return;
                    if (!posicion) return;

                    const lat = typeof posicion.lat === "function"
                        ? posicion.lat()
                        : posicion.lat;

                    const lng = typeof posicion.lng === "function"
                        ? posicion.lng()
                        : posicion.lng;

                    const numeroSolicitud = ++solicitudRef.current;
                    const ciudadBusqueda = actuales.current.ciudad;
                    const anterior = ciudadConfirmada === ciudadBusqueda?.id ? posicionConfirmada : null;
                    setValidando(true);
                    actuales.current.onValidando?.(true);
                    setErrorMapa('');
                    try {
                        if (!ciudadBusqueda?.id) throw new ClinicLocationError('Selecciona la ciudad del consultorio antes de ubicar el punto.');
                        marcador.position = {lat:Number(lat),lng:Number(lng)};
                        marcador.map = mapa;
                        let ubicacion = verifiedLocationAt(ubicacionConfirmada, {lat,lng}, ciudadBusqueda.id);
                        if (!ubicacion) {
                            const { Geocoder } = await importLibrary('geocoding');
                            const { results } = await new Geocoder().geocode({location:{lat:Number(lat),lng:Number(lng)}});
                            // A place selection is verified independently through Places; new
                            // points still require a successful geocode, never a guessed address.
                            const compacta = clinicAddress(results?.[0]?.address_components, ciudadBusqueda);
                            ubicacion = {direccion:compacta.direccion,latitud:Number(lat).toFixed(7),longitud:Number(lng).toFixed(7),verificada:true};
                        }
                        if (!activo || actuales.current.disabled || numeroSolicitud !== solicitudRef.current || ciudadBusqueda?.id !== actuales.current.ciudad?.id) return;
                        posicionConfirmada = {lat:Number(lat),lng:Number(lng)};
                        ciudadConfirmada = ciudadBusqueda.id;
                        ubicacionConfirmada = {...ubicacion, cityId:ciudadBusqueda.id};
                        actuales.current = {...actuales.current,...ubicacion};
                        actuales.current.onChange(ubicacion);
                        fijarUbicacion(posicionConfirmada);
                        setVistaPrevia('Punto confirmado. Guarda los cambios para actualizar el perfil.');
                    } catch (e) {
                        if (activo && numeroSolicitud === solicitudRef.current && ciudadBusqueda?.id === actuales.current.ciudad?.id) {
                            marcador.position = anterior;
                            marcador.map = anterior ? mapa : null;
                            setErrorMapa(geocodingErrorMessage(e));
                        }
                    } finally {
                        if (activo && numeroSolicitud === solicitudRef.current) {
                            setValidando(false);
                            actuales.current.onValidando?.(false);
                        }
                    }
                };
                const proponerPunto = posicion => {
                    if (!activo || actuales.current.disabled || fijaRef.current || !posicion) return;
                    editandoRef.current = true;
                    cancelarBusqueda();
                    solicitudRef.current += 1;
                    setValidando(false);
                    setErrorMapa('');
                    if (!actuales.current.ciudad?.id) {
                        setErrorMapa('Selecciona la ciudad del consultorio antes de ubicar el punto.');
                        return;
                    }
                    candidato = {lat: typeof posicion.lat === 'function' ? posicion.lat() : posicion.lat, lng: typeof posicion.lng === 'function' ? posicion.lng() : posicion.lng};
                    if (!marcadorPendiente) {
                        marcadorPendiente = new AdvancedMarkerElement({content:crearMarcadorBymax(true),title:'Bymax · Punto pendiente de confirmación'});
                    }
                    marcador.map = null;
                    marcadorPendiente.position = candidato;
                    marcadorPendiente.map = mapa;
                    setPuntoPendiente(true);
                    actuales.current.onValidando?.(true);
                };
                confirmarPuntoRef.current = () => {
                    if (!candidato || actuales.current.disabled) return;
                    const posicion = candidato;
                    candidato = null;
                    marcadorPendiente.map = null;
                    setPuntoPendiente(false);
                    return seleccionarPunto(posicion);
                };
                dragListener = marcador.addListener('dragend', () => proponerPunto(marcador.position));
                clickListener = mapa.addListener('click', event => {
                    event.stop?.();
                    return proponerPunto(event.latLng);
                });
                seleccionarCentroRef.current = () => proponerPunto(mapa.getCenter());
                sincronizarUbicacionRef.current();
                if (typeof ResizeObserver !== 'undefined') {
                    sizeObserver = new ResizeObserver(() => {
                        if (fijaRef.current && posicionConfirmada) encuadrarCiudad(posicionConfirmada);
                    });
                    sizeObserver.observe(mapaRef.current);
                }
            } catch (e) {
                if (activo) {
                    setErrorMapa(
                        e.message || "No pudimos cargar Google Maps."
                    );
                }
            } finally {
                if (activo) setCargando(false);
            }
        }

        iniciar();

        return () => {
            activo = false;
            solicitudRef.current += 1;

            autocomplete?.removeEventListener("gmp-select", seleccionar);
            autocomplete?.removeEventListener("gmp-error", falloBusqueda);
            autocomplete?.removeEventListener('input', escribir);
            clearTimeout(previewTimer);
            previewRequest += 1;
            encuadreSolicitud += 1;
            sizeObserver?.disconnect();
            dragListener?.remove();
            clickListener?.remove();
            seleccionarCentroRef.current = null;
            confirmarPuntoRef.current = null;
            cancelarPuntoRef.current = null;
            cancelarBusquedaRef.current = null;
            sincronizarUbicacionRef.current = null;
            cambiarUbicacionRef.current = null;
            actuales.current.onValidando?.(false);

            if (marcador) marcador.map = null;
            if (marcadorPendiente) marcadorPendiente.map = null;

            autocomplete?.remove();
        };
    }, []);

    return (
        <section className={styles.container} aria-busy={validando}>
            <h4>Ubicación del consultorio</h4>

            <p className={styles.help}>
                {ubicacionFija ? `Vista completa de ${ciudad?.nombre || 'la ciudad seleccionada'}, con Bymax señalando tu consultorio. Pulsa «Cambiar ubicación» para mover el punto.` : <>Escribe una dirección para explorar la zona. Toca el mapa o usa su centro y confirma
                el punto que señala Bymax. Puedes arrastrar el marcador para ajustarlo.
                {' '}Se guardará la calle, el número y el barrio disponible para la ciudad seleccionada.</>}
            </p>

            <div inert={disabled ? true : undefined}>
                <div ref={buscadorRef} className={styles.search} hidden={ubicacionFija} />

                <div
                    ref={mapaRef}
                    className={styles.map}
                    aria-label="Mapa del consultorio"
                />
                {ubicacionFija ? <div className={styles.fixedLocation}>
                    <span><LockKeyhole size={17} aria-hidden="true" /><strong>{ubicacionGuardada ? 'Ubicación guardada' : 'Ubicación confirmada'}</strong></span>
                    <Button type="button" variant="secondary" className={styles.pointButton} disabled={disabled || cargando}
                        onClick={() => cambiarUbicacionRef.current?.()}><Pencil size={16} aria-hidden="true" /><span>Cambiar ubicación</span></Button>
                </div> : <Button type="button" variant="secondary" className={styles.pointButton} disabled={disabled || cargando || validando}
                    onClick={() => seleccionarCentroRef.current?.()}>
                    <Crosshair size={17} aria-hidden="true" /><span>Usar centro del mapa</span>
                </Button>}
                {(puntoPendiente || validando) && <motion.div className={styles.pointConfirmation}
                    role="region" aria-label="Confirmación de la ubicación" aria-busy={validando}
                    initial={{opacity:0,y:reducedMotion ? 0 : 4}} animate={{opacity:1,y:0}} transition={{duration:reducedMotion ? 0 : 0.2}}>
                    <div className={styles.pointDescription}>
                        <span className={styles.confirmationIcon}>{validando ? <LoaderCircle size={21} className={styles.spinner} aria-hidden="true" /> : <MapPin size={21} aria-hidden="true" />}</span><div>
                        <strong>{validando ? 'Verificando ubicación' : '¿Aquí está tu consultorio?'}</strong>
                        <p>{validando ? 'Estamos comprobando la dirección y la ciudad del punto elegido.' : 'Bymax señala el punto elegido. Confírmalo y después guarda los cambios del perfil.'}</p>
                        {ciudad?.nombre && <span className={styles.confirmationCity}>{ciudad.nombre}{ciudad.departamento ? `, ${ciudad.departamento}` : ''}</span>}
                    </div></div>
                    <div className={styles.pointActions}>
                        <Button type="button" variant="secondary" className={styles.cancelPoint} onClick={() => cancelarPuntoRef.current?.()} disabled={disabled || validando}><X size={16} aria-hidden="true" /><span>Cancelar punto</span></Button>
                        <Button type="button" className={styles.confirmPoint} aria-label="Confirmar este punto" onClick={() => confirmarPuntoRef.current?.()} disabled={disabled || validando}>
                            {validando ? <LoaderCircle size={17} className={styles.spinner} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}<span>{validando ? 'Verificando…' : 'Confirmar este punto'}</span>
                        </Button>
                    </div>
                </motion.div>}
            </div>

            {cargando && <p role="status">Cargando mapa…</p>}
            <p className={styles.previewStatus} role="status" aria-live="polite">{validando ? 'Verificando dirección y ciudad…' : puntoPendiente ? 'Punto pendiente. Confirma o cancela la selección antes de guardar.' : vistaPrevia}</p>

            {direccion && (
                <p className={styles.address}>
                    <MapPin size={18} aria-hidden="true" /><span><strong>{puntoPendiente ? 'Dirección anterior' : 'Dirección seleccionada'}</strong><span>{direccion}</span></span>
                </p>
            )}

            {(errorMapa || error || errorCiudad) && (
                <p className={styles.error} role="alert">
                    {errorMapa || error || errorCiudad}
                </p>
            )}
        </section>
    );
}
