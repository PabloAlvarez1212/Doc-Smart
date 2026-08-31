"use client";
import { useEffect, useState } from "react";

export default function useBymaxViewport() {
  const [viewport, setViewport] = useState(null);
  useEffect(() => {
    const visual = window.visualViewport;
    let frame;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setViewport({
        "--bymax-viewport-height": `${visual?.height || window.innerHeight}px`,
        "--bymax-viewport-width": `${visual?.width || window.innerWidth}px`,
        "--bymax-viewport-top": `${visual?.offsetTop || 0}px`,
        "--bymax-viewport-left": `${visual?.offsetLeft || 0}px`,
      }));
    };
    measure();
    window.addEventListener("resize", measure);
    visual?.addEventListener("resize", measure);
    visual?.addEventListener("scroll", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      visual?.removeEventListener("resize", measure);
      visual?.removeEventListener("scroll", measure);
    };
  }, []);
  return viewport || {};
}
