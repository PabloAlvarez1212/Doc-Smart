// Guarda la posición del cursor en --x y --y para que la luz del elemento lo siga sin volver a renderizar.
export default function seguirCursor(event) {
    if (event.pointerType !== "mouse") return;

    const box = event.currentTarget.getBoundingClientRect();

    event.currentTarget.style.setProperty("--x", `${event.clientX - box.left}px`);
    event.currentTarget.style.setProperty("--y", `${event.clientY - box.top}px`);
}
