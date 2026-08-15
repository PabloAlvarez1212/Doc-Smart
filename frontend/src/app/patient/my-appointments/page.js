"use client"
import AppointmentsList from "../../../../components/patient/MyAppointments/AppointmentList/Appointment"
import Hero from "../../../../components/patient/MyAppointments/Hero/Hero"
import HeaderAppointement from "../../../../components/patient/MyAppointments/HeaderAppointment/HeaderAppointment"
import FilterAppointment from "../../../../components/patient/MyAppointments/FilterAppointment/FilterAppointment"
import useAppointments from "../../../../components/patient/MyAppointments/useAppointments"
import Pagination from "../../../../components/ui/Pagination/Pagination"
import styles from "./myAppointments.module.css"
export default function MyAppointments() {
    const {
        citas,
        especialidades,
        departamentos,
        ciudades,
        cancelarCita,
        cambiarFiltro,
        filtros,
        estado,
        cambiarEstado,
        loading,
        cambiarPagina,
        paginaActual,
        totalPaginas,
        totalRegistros,
        error,
    } = useAppointments();
    return (
        <div>
            <Hero />
            <HeaderAppointement
                estado={estado}
                cambiarEstado={cambiarEstado} />
            <FilterAppointment
                dataEspecialidades={especialidades}
                cambiarFiltro={cambiarFiltro}
                filtros={filtros}
                dataDepartamentos={departamentos}
                dataCiudades={ciudades}
            />
            {loading && (
                <div className={styles.containerSpinner}>
                    <div className={styles.spinner}></div>
                </div>
                
            )}

            {!error && (
                <>
                    <AppointmentsList
                        citas={citas}
                        rol="paciente"
                        cancelarCita={cancelarCita}
                    />

                    <Pagination
                        paginaActual={paginaActual}
                        totalPaginas={totalPaginas}
                        totalRegistros={totalRegistros}
                        onCambiarPagina={cambiarPagina}
                        cargando={loading}
                    />
                </>
            )}
        </div>
    )
}