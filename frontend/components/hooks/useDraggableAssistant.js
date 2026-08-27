"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "bymax_posicion_asistente";
const SIZE = 92;
const MARGIN = 16;

function limitar(valor, minimo, maximo) {
  return Math.min(Math.max(valor, minimo), Math.max(minimo, maximo));
}

export default function useDraggableAssistant(onActivate) {
  const [position, setPosition] = useState({ x: null, y: null });
  const dragRef = useRef(null);

  useEffect(() => {
    let guardada = null;
    try {
      guardada = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }

    const x = limitar(
      Number.isFinite(guardada?.x) ? guardada.x : window.innerWidth - SIZE - 28,
      MARGIN,
      window.innerWidth - SIZE - MARGIN,
    );
    const y = limitar(
      Number.isFinite(guardada?.y) ? guardada.y : window.innerHeight - SIZE - 28,
      MARGIN,
      window.innerHeight - SIZE - MARGIN,
    );
    setPosition({ x, y });
  }, []);

  useEffect(() => {
    const ajustar = () => setPosition((actual) => {
      if (actual.x === null) return actual;
      return {
        x: limitar(actual.x, MARGIN, window.innerWidth - SIZE - MARGIN),
        y: limitar(actual.y, MARGIN, window.innerHeight - SIZE - MARGIN),
      };
    });
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, []);

  const onPointerDown = useCallback((event) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
    };
  }, [position]);

  const onPointerMove = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;

    setPosition({
      x: limitar(drag.originX + dx, MARGIN, window.innerWidth - SIZE - MARGIN),
      y: limitar(drag.originY + dy, MARGIN, window.innerHeight - SIZE - MARGIN),
    });
  }, []);

  const onPointerUp = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;

    if (!drag.moved) {
      onActivate?.();
      return;
    }

    setPosition((actual) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(actual));
      return actual;
    });
  }, [onActivate]);

  return {
    positionStyle: position.x === null
      ? { visibility: "hidden" }
      : { left: position.x, top: position.y },
    dragHandlers: { onPointerDown, onPointerMove, onPointerUp },
  };
}
