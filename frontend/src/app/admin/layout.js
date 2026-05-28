import Header from "../../../components/admin/Header/Header"
export default function AdminLayout({ children }) {
  return (
    <div>
      <Header></Header>
      <main>
        {children}
      </main>
    </div>
  )
}