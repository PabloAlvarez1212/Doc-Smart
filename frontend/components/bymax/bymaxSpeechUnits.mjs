// Keep abbreviations, decimals and numbered list markers attached to their text.
export function takeSpeechUnits(buffer, final = false) {
  const units = [];
  let start = 0;
  const boundaries = /[.!?…](?=\s)|\n\n/g;
  for (const match of buffer.matchAll(boundaries)) {
    const end = match.index + match[0].length;
    const candidate = buffer.slice(start, end);
    if (match[0] === "." && (/(?:\b(?:Dr|Dra|Sr|Sra|etc|aprox|p\.ej))\.$/i.test(candidate) || /^\s*\d+\.$/.test(candidate))) continue;
    if (match[0] === "\n\n" && candidate.trim().length < 60) continue;
    if (candidate.trim()) units.push(candidate.trim());
    start = end;
  }
  const remaining = buffer.slice(start);
  if (final && remaining.trim()) units.push(remaining.trim());
  return { units, remaining: final ? "" : remaining };
}
