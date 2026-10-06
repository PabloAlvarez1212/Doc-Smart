// Presentation follows observed events, never presumed microphone/audio activity.
export function assistantState({ voice, sending, loading, error, lastMessage, connection }) {
  if (error || voice.error || lastMessage?.error) return { status: "error", label: "Necesito tu atención" };
  if (voice.playback === "speaking") return { status: "speaking", label: "Hablando…" };
  if (sending || loading || ["preparing", "starting"].includes(voice.playback)) {
    return { status: "processing", label: loading ? "Cargando conversación…" : voice.playback === "starting" ? "Iniciando audio…" : "Preparando respuesta…" };
  }
  if (voice.mic === "listening") return { status: "listening", label: "Escuchando solicitud…" };
  if (["starting", "recovering"].includes(voice.mic)) return { status: "recovering", label: "Preparando escucha…" };
  if (connection === "disconnected") return { status: "disconnected", label: "Sin conexión en tiempo real" };
  const labels = { waiting: "Esperando «Bymax»", suspended: "Escucha suspendida", ended: "Conversación terminada", off: "Micrófono desactivado" };
  const status = labels[voice.mic] ? voice.mic : "off";
  return { status, label: labels[status] };
}

// Plain text stays plain text. Only paragraphs, lists and bold emphasis are enhanced.
export function messageBlocks(text = "") {
  const blocks = [];
  for (const line of String(text).split("\n")) {
    const match = line.match(/^\s*(?:([-*•])\s+|(\d+)[.)]\s+)(.+)$/);
    const type = match ? (match[2] ? "ol" : "ul") : "p";
    if (!line.trim()) { blocks.push({ type: "space", lines: [] }); continue; }
    const previous = blocks.at(-1);
    if (previous?.type === type) previous.lines.push(match ? match[3] : line);
    else blocks.push({ type, start: match?.[2] ? Number(match[2]) : undefined, lines: [match ? match[3] : line] });
  }
  return blocks;
}
