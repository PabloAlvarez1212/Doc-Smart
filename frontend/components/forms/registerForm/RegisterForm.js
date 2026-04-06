"use client";
import { useState } from "react";
import Input from "../../ui/Input/Input.js";
import Button from "../../ui/Button/Button.js";
import styles from "./RegisterForm.module.css";

export default function RegisterForm({ role, setRole }) {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    edad: "",
    especialidad: "",
    certificado: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const endpoint =
      role === "medico"
        ? "http://127.0.0.1:8000/api/medicos/"
        : "http://127.0.0.1:8000/api/pacientes/";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    const data = await res.json();
    console.log(data);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>

      <div className={styles.inputs}>
        <Input name="nombre" placeholder="Nombre" onChange={handleChange} />
        <Input name="email" placeholder="Email" onChange={handleChange} />
        <Input type="password" name="password" placeholder="Contraseña" onChange={handleChange} />
        <Input name="edad" placeholder="Edad" onChange={handleChange} />

        {role === "medico" && (
          <>
            <Input name="especialidad" placeholder="Especialidad" onChange={handleChange} />
            <Input name="certificado" placeholder="Certificado médico" onChange={handleChange} />
          </>
        )}
      </div>

      <div className={styles.buttons}>
        <Button type="submit" variant="primary">Registrarse</Button>
        <Button type="button" variant="secondary" onClick={() => setRole(null)}>Volver</Button>
      </div>

    </form>
  );
}