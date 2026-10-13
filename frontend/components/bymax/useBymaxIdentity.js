"use client";
import { useEffect, useState } from "react";
import { bymaxService } from "@/app/services/bymaxServices";

export default function useBymaxIdentity() {
  const [identity, setIdentity] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    bymaxService.identidad()
      .then(value => { if (!cancelled) setIdentity(value); })
      .catch(() => { if (!cancelled) setError("No fue posible cargar tu identidad de Bymax."); });
    return () => { cancelled = true; };
  }, []);
  return { identity, error };
}
