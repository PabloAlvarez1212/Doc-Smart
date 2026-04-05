"use client";

import styles from "./page.module.css";
import { useState } from "react";
import RolSelector from "../../../components/ui/Rol/RolSelector"
import RegisterForm from "../../../components/forms/RegisterForm"

export default function RegisterPage() {
  const [role, setRole] = useState(null);

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      
      <h1 className={styles.tittle}>Registro</h1>

      {!role && <RolSelector setRole={setRole} />}

      {role && <RegisterForm role={role} setRole={setRole} />}
    
    </div>
  );
}