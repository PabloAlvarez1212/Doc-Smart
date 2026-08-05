import AppointmentsList from "../../../../components/patient/MyAppointments/AppointmentList/Appointment"
import Hero from "../../../../components/patient/MyAppointments/Hero/Hero"
import HeaderAppointement from "../../../../components/patient/MyAppointments/HeaderAppointment/HeaderAppointment"
import FilterAppointment from "../../../../components/patient/MyAppointments/FilterAppointment/FilterAppointment"
export default function MyAppointments(){
    return(
        <div>
            <Hero/>
            <HeaderAppointement/>
            <FilterAppointment/>
            <AppointmentsList/>
        </div>
    )
}