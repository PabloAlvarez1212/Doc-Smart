// Dictation state for one voice turn. Pure and browser-free so it can be tested.
//
// The Web Speech API reports a cumulative `results` list per recognition
// session: finished segments (isFinal) followed by at most a few provisional
// ones that the recognizer may still rewrite. Four kinds of text are kept apart:
//   base        text the user typed or edited by hand (never overwritten),
//   committed   text from earlier recognition sessions of the same turn,
//   segments    this session's results, keyed by result index,
//   provisional the non-final tail of those results (visible, not yet firm).
const normalize = text => String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ\s]/g, " ").replace(/\s+/g, " ").trim();

// Some mobile engines emit every result as the whole phrase so far. A segment
// that extends or repeats its neighbour replaces/is dropped instead of being
// appended twice.
export function assemble(texts) {
  const out = [];
  for (const text of texts) {
    const clean = String(text || "").trim();
    if (!clean) continue;
    const last = out.at(-1);
    if (last !== undefined) {
      const a = normalize(last), b = normalize(clean);
      if (b === a || a.startsWith(b)) continue;
      if (b.startsWith(a)) { out[out.length - 1] = clean; continue; }
    }
    out.push(clean);
  }
  return out;
}
const join = (...parts) => parts.map(part => String(part || "").trim()).filter(Boolean).join(" ");

export function createDictation() {
  let turnId = 0, sessionId = 0;
  let base = "", committed = [];
  let segments = new Map();       // index -> { text, final }
  let ignoreBefore = 0;           // indexes below were adopted by a manual edit
  let adopted = new Map();        // index -> text adopted by a manual edit

  const sessionParts = () => {
    const parts = [];
    for (const index of [...segments.keys()].sort((a, b) => a - b)) {
      if (index < ignoreBefore) continue;
      let { text } = segments.get(index);
      if (adopted.has(index)) {
        const prefix = adopted.get(index);
        text = text.startsWith(prefix) ? text.slice(prefix.length) : "";
      }
      parts.push({ index, text: text.trim(), final: segments.get(index).final });
    }
    return parts;
  };
  function view() {
    const parts = sessionParts();
    const lastFinal = parts.reduce((max, part) => (part.final ? part.index : max), -1);
    const confirmedNow = assemble(parts.filter(part => part.final).map(part => part.text));
    const provisionalNow = assemble(parts.filter(part => !part.final && part.index > lastFinal).map(part => part.text));
    const confirmed = join(base, assemble([...committed, ...confirmedNow]).join(" "));
    const provisional = provisionalNow.join(" ");
    return { turnId, sessionId, confirmed, provisional, text: join(confirmed, provisional) };
  }
  return {
    get turnId() { return turnId; },
    get sessionId() { return sessionId; },
    view,
    hasText: () => Boolean(view().text),
    // A recognizer restart inside the same turn keeps everything already heard.
    beginSession() {
      this.commitSession();
      sessionId += 1;
      return sessionId;
    },
    // The session ended: whatever was heard, provisional included, is kept.
    commitSession() {
      const parts = sessionParts().map(part => part.text);
      if (parts.length) committed = assemble([...committed, ...assemble(parts)]);
      segments = new Map(); adopted = new Map(); ignoreBefore = 0;
    },
    // Late events of a previous session are rejected by id.
    ingest(id, items, { from = 0 } = {}) {
      if (id !== sessionId) return null;
      items.forEach((item, index) => {
        if (index < from) return;
        segments.set(index, { text: String(item.text || "").trim(), final: Boolean(item.final) });
      });
      return view();
    },
    // Ambient speech before the wake word is not part of the request.
    skipBefore(index) { ignoreBefore = Math.max(ignoreBefore, index); },
    // The user edited the field: their text becomes the base and the results
    // already heard are adopted so older events cannot overwrite the edit.
    manualEdit(text) {
      base = String(text ?? "");
      committed = [];
      adopted = new Map();
      for (const part of sessionParts()) adopted.set(part.index, segments.get(part.index).text);
      ignoreBefore = ignoreBefore;
      return view();
    },
    // End of turn: the provisional tail is promoted so the last words are kept.
    finalText() { return view().text; },
    reset() {
      turnId += 1;
      base = ""; committed = []; segments = new Map(); adopted = new Map(); ignoreBefore = 0;
    },
  };
}
