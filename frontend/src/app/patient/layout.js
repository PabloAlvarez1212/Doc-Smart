import Header from "../../../components/patient/layout/Header/Header"

export default function PacienteLayout({ children }) {
  return (
    <div>
      <Header/>
      <main>
        {children}
      </main>
    </div>
  )
}