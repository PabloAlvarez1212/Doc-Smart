"use client";
import { useEffect, useRef } from 'react';

// Size the outer chat page, including its padding, rather than the inner panel.
// Ancestor layouts keep their normal scrolling on every other route.
export default function useChatViewport() {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const viewport = window.visualViewport;
    const nav = document.querySelector('[data-docsmart-nav]');
    const bar = nav?.querySelector('[data-docsmart-bar]');
    const previousReserve = nav?.style.getPropertyValue('--chat-nav-space') || '';
    let frame;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const doctorMobile = node.closest('[data-doctor-workspace]') && window.matchMedia('(max-width: 760px)').matches;
        const gap = doctorMobile ? 16 : 5;
        if (nav && bar) nav.style.setProperty('--chat-nav-space', `${Math.ceil(bar.getBoundingClientRect().bottom + gap)}px`);
        const top = Math.max(0, node.getBoundingClientRect().top - (viewport?.offsetTop || 0));
        const height = Math.max(0, (viewport?.height || window.innerHeight) - top);
        node.style.setProperty('--chat-page-height', `${height}px`);
        node.dataset.compactViewport = height < 480 ? 'true' : 'false';
      });
    };
    const observer = new ResizeObserver(measure);
    if (bar) observer.observe(bar);
    measure();
    window.addEventListener('resize', measure);
    viewport?.addEventListener('resize', measure);
    viewport?.addEventListener('scroll', measure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      if (nav) {
        if (previousReserve) nav.style.setProperty('--chat-nav-space', previousReserve);
        else nav.style.removeProperty('--chat-nav-space');
      }
      window.removeEventListener('resize', measure);
      viewport?.removeEventListener('resize', measure);
      viewport?.removeEventListener('scroll', measure);
    };
  }, []);
  return ref;
}
