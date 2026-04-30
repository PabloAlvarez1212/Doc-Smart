import Header from "../../../components/doctor/layout/Header/Header"

export default function DoctorLayout({ children }) {
  return (
    <div>
      <Header/>
      <main>
        {children}
      </main>
    </div>
  )
}