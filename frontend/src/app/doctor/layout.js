import Header from "../../../components/doctor/layout/Header/Header"
import Styles from "./layout.module.css"

export default function DoctorLayout({ children }) {
    return (
        <>
            <Header />

            <main className={Styles.mainContent}>
                {children}
            </main>
        </>
    );
}