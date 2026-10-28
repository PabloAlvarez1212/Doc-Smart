// Keep abbreviations, decimals and numbered list markers attached to their text.
export const SPEECH_MAX_CHARS = 220;
export const SPEECH_MIN_FLUSH_CHARS = 50;
export const SPEECH_MAX_WAIT_MS = 1200;

// A long stretch without punctuation is cut at the last comma or word, so
// voice never waits for the whole sentence.
function cutLongStretch(text, limit = SPEECH_MAX_CHARS) {
  if (text.length <= limit) return null;
  const head = text.slice(0, limit);
  const cut = Math.max(head.lastIndexOf(", "), head.lastIndexOf("; "), head.lastIndexOf(": "));
  const at = cut >= 60 ? cut + 1 : head.lastIndexOf(" ");
  return at > 0 ? at : null;
}

// Time-based flush: after SPEECH_MAX_WAIT_MS without a boundary, the words
// received so far (up to the last complete word) are spoken.
export function flushSpeechBuffer(buffer) {
  if (buffer.trim().length < SPEECH_MIN_FLUSH_CHARS) return { units: [], remaining: buffer };
  const at = buffer.lastIndexOf(" ");
  if (at < SPEECH_MIN_FLUSH_CHARS) return { units: [], remaining: buffer };
  return { units: [buffer.slice(0, at).trim()], remaining: buffer.slice(at) };
}

export function takeSpeechUnits(buffer, final = false) {
  const units = [];
  let start = 0;
  const boundaries = /[.!?…](?=\s)|[,;:](?=\s)|\n\n/g;
  for (const match of buffer.matchAll(boundaries)) {
    const end = match.index + match[0].length;
    const candidate = buffer.slice(start, end);
    if (/[,;:]/.test(match[0]) && (candidate.trim().length < 40 || candidate.trim().split(/\s+/).length < 6)) continue;
    if (match[0] === "." && (/(?:\b(?:Dr|Dra|Sr|Sra|etc|aprox|p\.ej))\.$/i.test(candidate) || /^\s*\d+\.$/.test(candidate))) continue;
    if (match[0] === "\n\n" && candidate.trim().length < 60) continue;
    if (candidate.trim()) units.push(candidate.trim());
    start = end;
  }
  let remaining = buffer.slice(start);
  if (!final) {
    for (let at = cutLongStretch(remaining); at != null; at = cutLongStretch(remaining)) {
      units.push(remaining.slice(0, at).trim());
      remaining = remaining.slice(at);
    }
  }
  if (final && remaining.trim()) units.push(remaining.trim());
  return { units, remaining: final ? "" : remaining };
}
