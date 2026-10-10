"use client";
import { useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import { obtenerUrlDocumentoSeguimientoService } from '@/app/services/appointmentsServices';
import { obtenerPrimerError } from '@/app/utils/errrorUtils';
import styles from './DocumentosSeguimientoList.module.css';

export default function DocumentosSeguimientoList({ citaId, documentos = [] }) {
    const lock = useRef(false);
    const [loading, setLoading] = useState(null);
    const [error, setError] = useState('');
    const descargar = async (doc) => {
        if (lock.current || !citaId) return;
        lock.current = true;
        setLoading(doc.id); setError('');
        try {
            const data = await obtenerUrlDocumentoSeguimientoService(citaId, doc.id);
            const url = new URL(data.url);
            if (!['https:', 'http:'].includes(url.protocol)) throw new Error('URL de documento inválida.');
            const link = document.createElement('a');
            link.href = url.href;
            link.download = doc.nombre;
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            try { link.click(); } finally { link.remove(); }
        } catch (err) {
            setError(obtenerPrimerError(err.response?.data?.errores) || err.response?.data?.mensaje || err.message || 'No se pudo descargar el documento.');
        } finally { lock.current = false; setLoading(null); }
    };
    return <section className={styles.section} aria-label="Documentos de seguimiento">
        <h3>Documentos de seguimiento</h3>
        {documentos.length ? <ul>{documentos.map(doc => <li key={doc.id}>
            <FileText size={18} aria-hidden="true" />
            <div className={styles.fileInfo}><span title={doc.nombre}>{doc.nombre}</span>
                <small>{doc.nombre?.split('.').at(-1)?.toUpperCase()} · {typeof doc.tamano === 'number' ? `${(doc.tamano / 1024 / 1024).toLocaleString('es-CO', {maximumFractionDigits: 2})} MB` : 'Tamaño no disponible'}</small>
            </div>
            <div className={styles.actions}>
                <button type="button" disabled={loading !== null || !citaId} onClick={() => descargar(doc)}>{loading === doc.id ? 'Preparando…' : 'Descargar'}</button>
            </div>
        </li>)}</ul> : <p>No hay documentos asociados.</p>}
        {error && <p role="alert">{error}</p>}
    </section>;
}
