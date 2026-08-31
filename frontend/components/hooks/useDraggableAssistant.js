"use client";
import { useCallback, useEffect, useRef, useState } from "react";
const STORAGE_KEY = "bymax_posicion_asistente";
const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
function bounds() {
  const view = window.visualViewport;
  const width = view?.width || window.innerWidth;
  const height = view?.height || window.innerHeight;
  const size = window.innerWidth <= 600 ? { width: 72, height: 108 } : { width: 92, height: 130 };
  const left = (view?.offsetLeft || 0) + 16;
  const top = (view?.offsetTop || 0) + 16;
  return { left, top, right: left + width - size.width - 32, bottom: top + height - size.height - 40 };
}
export default function useDraggableAssistant(onActivate) {
  const [position, setPosition] = useState(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(null);
  const suppressClick = useRef(false);
  useEffect(() => {
    const adjust = () => {
      const rect = bounds();
      setPosition(previous => {
        let stored = previous;
        if (!stored) { try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch {} }
        return {
          x: clamp(Number.isFinite(stored?.x) ? stored.x : rect.right, rect.left, rect.right),
          y: clamp(Number.isFinite(stored?.y) ? stored.y : rect.bottom, rect.top, rect.bottom),
        };
      });
    };
    adjust();
    window.addEventListener("resize", adjust);
    window.visualViewport?.addEventListener("resize", adjust);
    window.visualViewport?.addEventListener("scroll", adjust);
    return () => {
      window.removeEventListener("resize", adjust);
      window.visualViewport?.removeEventListener("resize", adjust);
      window.visualViewport?.removeEventListener("scroll", adjust);
    };
  }, []);
  const onPointerDown = useCallback(event => {
    if (event.button !== 0 || !event.isPrimary || !position) return;
    suppressClick.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, origin: position, moved: false };
  }, [position]);
  const onPointerMove = useCallback(event => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) < 7 && !drag.moved) return;
    drag.moved = true;
    setDragging(true);
    const rect = bounds();
    setPosition({ x: clamp(drag.origin.x + dx, rect.left, rect.right), y: clamp(drag.origin.y + dy, rect.top, rect.bottom) });
  }, []);
  const onPointerUp = useCallback(event => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    suppressClick.current = drag.moved;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag.moved) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(position)); } catch {} }
  }, [position]);
  const onPointerCancel = useCallback(() => { dragRef.current = null; suppressClick.current = true; setDragging(false); }, []);
  const onClick = useCallback(event => {
    // Keyboard activation has detail=0, even after a previous drag.
    if (!suppressClick.current || event.detail === 0) onActivate();
    suppressClick.current = false;
  }, [onActivate]);
  return {
    dragging,
    positionStyle: position ? { left: position.x, top: position.y } : { visibility: "hidden" },
    dragHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture: () => { dragRef.current = null; setDragging(false); }, onClick },
  };
}
