"use client";
import { useEffect, useRef, useState } from "react";

const KEY = "bymax_posicion_ventana";
export default function useDraggableBymaxWindow(panelRef, open) {
  const [position, setPosition] = useState(null);
  const drag = useRef(null);
  function bound(point) {
    const rect = panelRef.current?.getBoundingClientRect();
    const view = window.visualViewport;
    const left = (view?.offsetLeft || 0) + 8, top = (view?.offsetTop || 0) + 8;
    return { x: Math.max(left, Math.min(point.x, left + (view?.width || window.innerWidth) - (rect?.width || 0) - 16)),
      y: Math.max(top, Math.min(point.y, top + (view?.height || window.innerHeight) - (rect?.height || 0) - 16)) };
  }
  useEffect(() => {
    if (!open) return;
    const adjust = () => {
      if (!panelRef.current) return;
      setPosition(previous => {
        let stored = previous;
        try { stored ||= JSON.parse(localStorage.getItem(KEY)); } catch {}
        return Number.isFinite(stored?.x) && Number.isFinite(stored?.y) ? bound(stored) : null;
      });
    };
    const frame = requestAnimationFrame(adjust);
    window.addEventListener("resize", adjust);
    window.visualViewport?.addEventListener("resize", adjust);
    window.visualViewport?.addEventListener("scroll", adjust);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", adjust);
      window.visualViewport?.removeEventListener("resize", adjust);
      window.visualViewport?.removeEventListener("scroll", adjust);
    };
  }, [open]);
  const finish = event => {
    if (!drag.current) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (position) { try { localStorage.setItem(KEY, JSON.stringify(position)); } catch {} }
  };
  return {
    style: position ? { left: position.x, top: position.y, right: "auto", bottom: "auto" } : {},
    handlers: {
      onPointerDown(event) {
        if (event.button !== 0 || !event.isPrimary || event.target.closest("button,input,select")) return;
        const rect = panelRef.current.getBoundingClientRect();
        drag.current = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove(event) {
        const start = drag.current;
        if (start) setPosition(bound({ x: start.left + event.clientX - start.x, y: start.top + event.clientY - start.y }));
      },
      onPointerUp: finish, onPointerCancel: finish, onLostPointerCapture() { drag.current = null; },
      onDoubleClick(event) {
        if (event.target.closest("button")) return;
        setPosition(null); try { localStorage.removeItem(KEY); } catch {}
      },
    },
  };
}
