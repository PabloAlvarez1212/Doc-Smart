import Header from "../../../components/admin/Header/Header"
import Nav from "../../../components/admin/Nav/Nav"
import Styles from "./layout.module.css"
import ResponsiveNav from "../../../components/ui/ResponsiveNav/ResponsiveNav"
export default function AdminLayout({ children }) {
  return (
    <div className={Styles.containerMain}>
      <header className={Styles.header}>
        <Header />
      </header>
      <div className={Styles.workspace}>
        <aside className={Styles.nav}>
          <ResponsiveNav id="admin-navigation" label="Menú de administración"><Nav /></ResponsiveNav>
        </aside>
        <main className={Styles.main}>
          <div className={Styles.content}>{children}</div>
        </main>
      </div>
    </div>
  )
}
