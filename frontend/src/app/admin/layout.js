import Header from "../../../components/admin/Header/Header"
import Nav from "../../../components/admin/Nav/Nav"
import Styles from "./layout.module.css"
import ResponsiveNav from "../../../components/ui/ResponsiveNav/ResponsiveNav"
export default function AdminLayout({ children }) {
  return (
    <div className={Styles.containerMain}>
      <div className={Styles.header}>
        <Header />
      </div>
      <div className={Styles.container}>
        <div className={Styles.nav}>
          <ResponsiveNav id="admin-navigation" label="Menú de administración"><Nav /></ResponsiveNav>
        </div>
        <main className={Styles.main}>
          {children}
        </main>
      </div>
    </div>
  )
}
