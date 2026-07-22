import Hero from '../../../../components/patient/Home/Hero/Hero'
import StaticCards from '../../../../components/patient/Home/StaticCards/StaticCards'
import AppointmentsList from '../../../../components/patient/Home/AppointmentsList/AppointmentsList'
export default function Home() {
    return (
        <>
            <Hero/>
            <StaticCards/>
            <AppointmentsList />
        </>
    )
}