"use client";

import { Suspense, useEffect } from "react";
import AuthCard from "../../../../components/ui/VerificationStatus/AuthCard";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

import RegisterForm from "../../../../components/forms/registerForm/RegisterForm";
import styles from "./page.module.css";

function RegisterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = searchParams.get("role");

  useEffect(() => {
    if (!['paciente','medico'].includes(role)) {
      router.replace("/rol");
    }
  }, [role, router]);

  if (!['paciente','medico'].includes(role)) {
    return null;
  }

  return (
    <div className={styles.mainRegister}>
      <AuthCard className={styles.container}>
        <div className={styles.logo}>
          <Image
            src="/images/logoCara.png"
            width={50}
            height={50}
            alt="Logo de DocSmart"
          />

          <h1>
            <span>Doc</span> Smart
          </h1>
        </div>

        <h2>Regístrate como {role}:</h2>

        <div className={styles.formWrapper}>
          <RegisterForm
            role={role}
            setRole={() => router.push("/rol")}
          />
        </div>
      </AuthCard>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterContent />
    </Suspense>
  );
}