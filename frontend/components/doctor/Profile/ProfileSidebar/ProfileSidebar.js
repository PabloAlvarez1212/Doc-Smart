"use client";

import { useRef } from 'react';
import { Award, BadgeCheck, CalendarCheck2, CalendarDays, Camera, Mail, Phone, Trash2, Users } from 'lucide-react';
import ProfilePhoto from '../../../ui/ProfilePhoto/ProfilePhoto';
import shared from '../../../patient/Profile/ProfileSidebar/ProfileSidebar.module.css';
import styles from './ProfileSidebar.module.css';

export default function ProfileSidebar({ perfil, actualizarFotoPerfil, guardando, eliminarFotoPerfil }) {
  const inputFotoRef = useRef(null);
  const fullName = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ') || 'Médico';
  function handleSeleccionarFoto(event) {
    const archivo = event.target.files[0];
    if (!archivo || guardando) return;
    actualizarFotoPerfil(archivo);
    event.target.value = '';
  }
  const miembroDesde = perfil?.miembro_desde ? new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(new Date(perfil.miembro_desde)) : null;
  const aprobado = perfil?.estado_validacion === 'aprobado';
  const pacientes = perfil?.pacientes_atendidos ?? 0;
  return (
    <aside className={`${shared.summary} ${styles.doctor}`} aria-label="Identidad del médico" aria-busy={guardando}>
      <div className={shared.identity}>
        <div className={shared.avatarWrap}>
          <div className={shared.avatarSurface}>
            <ProfilePhoto width={136} height={136} alt="Foto de perfil" src={perfil?.foto_perfil} className={shared.avatar} />
            {perfil?.foto_perfil && <><span className={shared.avatarOverlay} aria-hidden="true" /><button type="button" className={shared.removePhotoButton} onClick={eliminarFotoPerfil} disabled={guardando} aria-label="Eliminar foto de perfil"><Trash2 size={20} aria-hidden="true" /></button></>}
          </div>
          <button type="button" className={`${shared.cameraButton} ${styles.camera}`} onClick={() => inputFotoRef.current?.click()} disabled={guardando} aria-label="Cambiar foto"><Camera size={18} aria-hidden="true" /></button>
          <input ref={inputFotoRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleSeleccionarFoto} disabled={guardando} aria-label="Seleccionar foto de perfil" />
        </div>
        <div className={shared.identityCopy}><h2>{fullName}</h2><span className={`${shared.role} ${styles.role}`}>{perfil?.especialidad || 'Médico'}</span>{aprobado && <span className={styles.verified}><BadgeCheck size={14} aria-hidden="true" />Médico verificado</span>}<p role="status">{guardando ? 'Actualizando información' : 'Perfil profesional'}</p></div>
      </div>
      <dl className={shared.details}>
        <div><span aria-hidden="true"><Mail size={18} /></span><div><dt>Correo</dt><dd className={shared.email}>{perfil?.correo || 'Sin correo'}</dd></div></div>
        <div><span aria-hidden="true"><Phone size={18} /></span><div><dt>Teléfono</dt><dd>{perfil?.telefono || 'Sin teléfono'}</dd></div></div>
        <div><span aria-hidden="true"><CalendarDays size={18} /></span><div><dt>Edad</dt><dd>{perfil?.edad ? `${perfil.edad} años` : 'Edad no disponible'}</dd></div></div>
        <div><span aria-hidden="true"><CalendarCheck2 size={18} /></span><div><dt>Miembro desde</dt><dd className={styles.capital}>{miembroDesde || 'Sin fecha'}</dd></div></div>
        <div><span aria-hidden="true"><Users size={18} /></span><div><dt>Pacientes atendidos</dt><dd>{pacientes}</dd></div></div>
        <div><span aria-hidden="true"><Award size={18} /></span><div><dt>Experiencia</dt><dd>{perfil?.anios_experiencia != null ? `${perfil.anios_experiencia} ${perfil.anios_experiencia === 1 ? 'año' : 'años'}` : 'Sin registrar'}</dd></div></div>
      </dl>
    </aside>
  );
}
