"use client";

import { useSyncExternalStore } from "react";

const salidas = new Map();
const efectos = new Map();
const oyentes = new Set();

// Guarda cómo debe salir la tarjeta y mide el viaje hasta la pestaña Historial antes de recargar la lista.
export function registrarSalida(id, tipo) {
    const tarjeta = document.querySelector(`[data-cita="${id}"]`);
    const destino = document.querySelector('[data-destino-citas="historial"]');
    const visible = Boolean(tarjeta && destino?.offsetWidth);
    let dx = 0;
    let dy = 0;
    if (visible) {
        const a = tarjeta.getBoundingClientRect();
        const b = destino.getBoundingClientRect();
        dx = b.left + b.width / 2 - (a.left + a.width / 2);
        dy = b.top + b.height / 2 - (a.top + a.height / 2);
    }
    salidas.set(String(id), { tipo, dx, dy, visible });
}

export const verSalida = (id) => salidas.get(String(id)) ?? null;
export const olvidarSalida = (id) => salidas.delete(String(id));

function emitir() {
    oyentes.forEach((avisar) => avisar());
}

// El efecto vive unos segundos para que no se repita si la tarjeta vuelve a montarse después.
export function lanzarEfecto(id, tipo) {
    const clave = String(id);
    const efecto = { tipo, n: Date.now() };
    efectos.set(clave, efecto);
    emitir();
    setTimeout(() => {
        if (efectos.get(clave) !== efecto) return;
        efectos.delete(clave);
        emitir();
    }, 2500);
}

function suscribir(avisar) {
    oyentes.add(avisar);
    return () => oyentes.delete(avisar);
}

export function useEfectoCita(id) {
    return useSyncExternalStore(suscribir, () => efectos.get(String(id)) ?? null, () => null);
}
