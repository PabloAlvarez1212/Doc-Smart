"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import styles from "./ConsultorioMap.module.css";

let configurado = false;

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
}) {
    const buscadorRef = useRef(null);
    const mapaRef = useRef(null);
    const actuales = useRef({
        direccion,
        latitud,
        longitud,
        onChange,
        disabled,
    });

    const [cargando, setCargando] = useState(true);
    const [errorMapa, setErrorMapa] = useState("");

    useEffect(() => {
        actuales.current = {
            direccion,
            latitud,
            longitud,
            onChange,
            disabled,
        };
    }, [direccion, latitud, longitud, onChange, disabled]);

    useEffect(() => {
        let activo = true;
        let autocomplete;
        let marcador;
        let dragListener;
        let seleccionar;
        let falloBusqueda;
        let solicitud = 0;

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
                const tieneUbicacion =
                    inicial.latitud !== "" &&
                    inicial.longitud !== "" &&
                    inicial.latitud != null &&
                    inicial.longitud != null &&
                    Number.isFinite(Number(inicial.latitud)) &&
                    Number.isFinite(Number(inicial.longitud));

                const posicionInicial = tieneUbicacion
                    ? {
                        lat: Number(inicial.latitud),
                        lng: Number(inicial.longitud),
                    }
                    : { lat: 4.5709, lng: -74.2973 };

                const mapa = new Map(mapaRef.current, {
                    center: posicionInicial,
                    zoom: tieneUbicacion ? 17 : 5,
                    mapId:
                        process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ||
                        "DEMO_MAP_ID",
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                    gestureHandling: "cooperative",
                });

                marcador = new AdvancedMarkerElement({
                    map: tieneUbicacion ? mapa : null,
                    position: tieneUbicacion
                        ? posicionInicial
                        : undefined,
                    gmpDraggable: true,
                    title: "Ubicación del consultorio",
                });

                autocomplete = new PlaceAutocompleteElement();
                autocomplete.setAttribute(
                    "aria-label",
                    "Buscar dirección del consultorio"
                );

                buscadorRef.current.replaceChildren(autocomplete);

                seleccionar = async (event) => {
                    if (!activo || actuales.current.disabled) return;

                    const numeroSolicitud = ++solicitud;

                    setErrorMapa("");
                    marcador.map = null;

                    actuales.current.onChange({
                        direccion: actuales.current.direccion,
                        latitud: "",
                        longitud: "",
                    });

                    try {
                        const lugar = event.placePrediction.toPlace();

                        await lugar.fetchFields({
                            fields: ["formattedAddress", "location"],
                        });

                        if (
                            !activo ||
                            numeroSolicitud !== solicitud ||
                            actuales.current.disabled
                        ) {
                            return;
                        }

                        if (!lugar.location || !lugar.formattedAddress) {
                            throw new Error(
                                "Selecciona un resultado con dirección y ubicación."
                            );
                        }

                        const posicion = {
                            lat: lugar.location.lat(),
                            lng: lugar.location.lng(),
                        };

                        const ubicacion = {
                            direccion: lugar.formattedAddress,
                            latitud: posicion.lat.toFixed(7),
                            longitud: posicion.lng.toFixed(7),
                        };

                        actuales.current = {
                            ...actuales.current,
                            ...ubicacion,
                        };

                        marcador.position = posicion;
                        marcador.map = mapa;
                        mapa.setCenter(posicion);
                        mapa.setZoom(17);

                        actuales.current.onChange(ubicacion);
                    } catch (e) {
                        if (activo && numeroSolicitud === solicitud) {
                            setErrorMapa(
                                e.message ||
                                "No pudimos obtener la ubicación."
                            );
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

                dragListener = marcador.addListener("dragend", () => {
                    if (!activo || actuales.current.disabled) return;

                    const posicion = marcador.position;

                    if (!posicion) return;

                    const lat = typeof posicion.lat === "function"
                        ? posicion.lat()
                        : posicion.lat;

                    const lng = typeof posicion.lng === "function"
                        ? posicion.lng()
                        : posicion.lng;

                    actuales.current.onChange({
                        direccion: actuales.current.direccion,
                        latitud: Number(lat).toFixed(7),
                        longitud: Number(lng).toFixed(7),
                    });
                });
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
            solicitud += 1;

            autocomplete?.removeEventListener("gmp-select", seleccionar);
            autocomplete?.removeEventListener("gmp-error", falloBusqueda);
            dragListener?.remove();

            if (marcador) marcador.map = null;

            autocomplete?.remove();
        };
    }, []);

    return (
        <section className={styles.container}>
            <h4>Ubicación del consultorio</h4>

            <p className={styles.help}>
                Busca y selecciona una dirección. Después arrastra el
                marcador para señalar la entrada exacta.
            </p>

            <div inert={disabled ? true : undefined}>
                <div ref={buscadorRef} className={styles.search} />

                <div
                    ref={mapaRef}
                    className={styles.map}
                    aria-label="Mapa del consultorio"
                />
            </div>

            {cargando && <p role="status">Cargando mapa…</p>}

            {direccion && (
                <p className={styles.address}>
                    <strong>Dirección seleccionada:</strong> {direccion}
                </p>
            )}

            {(errorMapa || error) && (
                <p className={styles.error} role="alert">
                    {errorMapa || error}
                </p>
            )}
        </section>
    );
}