"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChatbotPage() {
  const router = useRouter();

  useEffect(() => {
    window.dispatchEvent(new Event("bymax:open"));
    router.replace("/patient/home");
  }, [router]);

  return null;
}
