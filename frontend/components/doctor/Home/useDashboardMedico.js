"use client";

import { useEffect, useState } from 'react';
import { obtenerDashboardMedicoInicioService } from '@/app/services/doctorServices';
export const useDashboardMedico = () => {
  const [dashboard, setDashboard] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(null),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setDashboard(null);
    obtenerDashboardMedicoInicioService().then(result => {
      if (!result?.data?.estadisticas) throw new Error('Datos inválidos');
      if (active) setDashboard(result.data);
    }).catch(() => {
      if (active) setError('No pudimos cargar tus datos. Inténtalo de nuevo.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [version]);
  return {
    dashboard,
    loading,
    error,
    retry: () => setVersion(v => v + 1)
  };
};
