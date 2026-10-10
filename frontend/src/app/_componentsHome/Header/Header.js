"use client";

import { useEffect, useState } from 'react';
import DocSmartNav from '../../../../components/ui/DocSmartNav/DocSmartNav';
import { getPublicSession } from '../../services/publicServices';
export default function Header() {
  const [home, setHome] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    getPublicSession(controller.signal).then(setHome).catch(() => {}).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    const logout = () => setHome(null);
    window.addEventListener('docsmart:session-ending', logout);
    return () => {
      controller.abort();
      window.removeEventListener('docsmart:session-ending', logout);
    };
  }, []);
  return <DocSmartNav sessionHome={home} sessionLoading={loading} links={[{
    href: '/',
    label: 'Inicio'
  }, {
    href: '/#funcionalidades',
    label: 'Funcionalidades'
  }, {
    href: '/#comunidad',
    label: 'DocSmart en cifras'
  }]} />;
}
