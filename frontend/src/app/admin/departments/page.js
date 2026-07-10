"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import DataTable from "../../../../components/ui/DataTable/DataTable";
import { getDepartamentosService } from "@/app/services/catalogs";

export default function Departaments() {
    const [departamentos, setDepartamentos] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        cargarDepartamentos();
    }, []);

    const cargarDepartamentos = async () => {
        setCargando(true);

        try {
            const res = await getDepartamentosService();
            setDepartamentos(Array.isArray(res) ? res : res.data ?? []);
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudieron cargar los departamentos.",
            });
        } finally {
            setCargando(false);
        }
    };

    const columnas = [
        {
            key: "nombre",
            label: "Departamento",
        },
    ];

    return (
        <DataTable
            titulo="Departamentos"
            columnas={columnas}
            datos={departamentos}
            cargando={cargando}
            campoBusqueda="nombre"
            placeholderBusqueda="Buscar departamento..."
            mostrarBotonNuevo={false}
            mostrarAcciones={false}
        />
    );
}