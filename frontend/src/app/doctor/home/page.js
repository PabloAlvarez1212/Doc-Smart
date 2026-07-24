import Hero from "../../../../components/doctor/Home/Hero/Hero"
import StaticCards from "../../../../components/patient/Home/StaticCards/StaticCards"
import Appointments from "../../../../components/doctor/Home/AppointmentsList/appointmentsList"
export default function Home(){
    return(
        <>
            <Hero/>
            <StaticCards/>
            <Appointments/>
        </>
    )
}