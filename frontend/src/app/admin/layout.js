import Header from "../../../components/admin/Header/Header"
import Nav from "../../../components/admin/Nav/Nav"
import Styles from "./layout.module.css"
export default function AdminLayout({ children }) {
  return (
    <div className={Styles.containerMain}>
      <div className={Styles.header}>
        <Header />
      </div>
      <div className={Styles.container}>
        <div className={Styles.nav}>
          <Nav />
        </div>
        <main className={Styles.main}>
          {children}
        </main>
      </div>
    </div>
  )
}