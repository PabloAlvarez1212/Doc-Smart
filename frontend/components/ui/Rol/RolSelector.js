"use client";
import { useRouter } from "next/navigation";
import Button from "../Button/Button";
import Styles from "./RolSelector.module.css";

export default function RolSelector({ onSelectRole }) {
  const router = useRouter();

  return (
    <div>
      <Button className={Styles.return} variant="secondary" onClick={() => router.push("/")}>
        Volver
      </Button>

      <h2>¿Cómo deseas registrarte?</h2>

      <div>
        <Button onClick={() => onSelectRole("paciente")}>Soy Paciente</Button>
      </div>
      <div>
        <Button onClick={() => onSelectRole("medico")}>Soy Médico</Button>
      </div>
    </div>
  );
}