"use client";
import { useRouter } from "next/navigation";
import Button from "../Button/Button";

export default function RolSelector({ setRole }) {
  const router = useRouter();

  return (
    <div>

      <Button onClick={() => router.push("/")}>
        Volver
      </Button>
      
      <h2>¿Cómo deseas registrarte?</h2>
      <div>
        <Button onClick={() => setRole("paciente")}>
          Soy Paciente
        </Button>
      </div>
      <div>
        <Button onClick={() => setRole("medico")}>
          Soy Médico
        </Button>
      </div>

    </div>
  );
}