"use client";

import styles from "./page.module.css";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import RegisterForm from "../../../components/forms/registerForm/RegisterForm";

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = searchParams.get("role");

  if (!role) {
    router.push("/rol");
    return null;
  }

  return (
    <div className={styles.mainRegister}>
      <div className={styles.container}>

        <div className={styles.logo}>
          <Image src='/images/logoCara.png' width='100' height='100' alt="logo" />
          <h1><span>Doc</span> Smart</h1>
        </div>

        <h2>Regístrate como {role}:</h2>

        <div className={styles.formWrapper}>
          <RegisterForm
            role={role}
            setRole={() => router.push("/rol")}
          />
        </div>

      </div>
    </div>
  );
}