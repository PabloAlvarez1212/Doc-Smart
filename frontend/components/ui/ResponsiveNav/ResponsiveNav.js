"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import styles from "./ResponsiveNav.module.css";

export default function ResponsiveNav({ children, className = "", id, label = "Menú" }) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState(null);
  const open = openPath === pathname;
  const toggleRef = useRef(null);

  function close() { setOpenPath(null); }

  return (
    <div className={`${styles.root} ${className}`} onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        close();
        toggleRef.current?.focus();
      }
    }}>
      <button ref={toggleRef} type="button" className={styles.toggle}
        aria-expanded={open} aria-controls={id}
        onClick={() => setOpenPath(open ? null : pathname)}>
        {open ? <X size={22} /> : <Menu size={22} />}
        {open ? "Cerrar menú" : label}
      </button>
      <div id={id} className={`${styles.content} ${open ? styles.open : ""}`}
        onClick={(event) => { if (event.target.closest("a")) close(); }}>
        {children}
      </div>
    </div>
  );
}
