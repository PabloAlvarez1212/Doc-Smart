"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import DataTable from "../../../../components/ui/DataTable/DataTable";

import {
    getCiudadesService,
    getCiudadesPorDepartamentoService,
    getDepartamentosService,
} from "@/app/services/catalogs";

export default function Cities() {

    const [ciudades, setCiudades] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState("");
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        cargarDepartamentos();
        cargarCiudades();
    }, []);

    const cargarDepartamentos = async () => {
        try {
            const res = await getDepartamentosService();
            setDepartamentos(Array.isArray(res) ? res : res.data ?? []);
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudieron cargar los departamentos.",
            });
        }
    };

    const cargarCiudades = async () => {
        setCargando(true);

        try {
            const res = await getCiudadesService();
            setCiudades(Array.isArray(res) ? res : res.data ?? []);
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudieron cargar las ciudades.",
            });
        } finally {
            setCargando(false);
        }
    };

    const cambiarDepartamento = async (e) => {

        const id = e.target.value;

        setDepartamentoSeleccionado(id);

        setCargando(true);

        try {

            if (id === "") {

                await cargarCiudades();

            } else {

                const res = await getCiudadesPorDepartamentoService(id);
                setCiudades(Array.isArray(res) ? res : res.data ?? []);

            }

        } catch (error) {

            Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudieron filtrar las ciudades.",
            });

        } finally {

            setCargando(false);

        }
    };

    const columnas = [
        {
            key: "nombre_ciudad",
            label: "Ciudad",
        },
        {
            key: "nombre_departamento",
            label: "Departamento",
        },
    ];

    return (
        <>
            <div style={{ marginBottom: "20px", maxWidth: "300px" }}>
                <label
                    style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "600",
                    }}
                >
                    Departamento
                </label>

                <select
                    value={departamentoSeleccionado}
                    onChange={cambiarDepartamento}
                    style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                    }}
                >
                    <option value="">
                        Todos los departamentos
                    </option>

                    {departamentos.map((dep) => (
                        <option
                            key={dep.id}
                            value={dep.id}
                        >
                            {dep.nombre}
                        </option>
                    ))}
                </select>
            </div>

            <DataTable
                titulo="Ciudades"
                columnas={columnas}
                datos={ciudades}
                cargando={cargando}
                campoBusqueda="nombre_ciudad"
                placeholderBusqueda="Buscar ciudad..."
                mostrarBotonNuevo={false}
                mostrarAcciones={false}
            />
        </>
    );
}