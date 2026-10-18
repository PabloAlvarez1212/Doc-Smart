// A response owns its frames even after cancellation/reconnection.
export function matchesTurn(turn, event) {
  const id = event.request_id || event.response_id;
  return Boolean(turn && id && id === turn.requestId);
}
export function latencyTrace(responseId, now = () => performance.now(), emit = value => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("bymax:latency", { detail: value }));
}) {
  const start = now();
  const seen = new Set();
  return event => {
    if (seen.has(event)) return;
    seen.add(event);
    emit({ response_id: responseId, event, elapsed_ms: Math.round((now() - start) * 100) / 100 });
  };
}
function recoveryDelay(ms, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new DOMException("Cancelled", "AbortError")); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, ms);
    signal.addEventListener("abort", abort, {once:true});
    if (signal.aborted) abort();
  });
}
export async function recoverResponse({ requestId, signal, send, wait = recoveryDelay, attempts = 8 }) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    try { return await send(requestId, signal); }
    catch (error) {
      if (signal.aborted || error.status !== 409 || attempt === attempts - 1) throw error;
      await wait(Math.min(1000 * 2 ** attempt, 5000), signal);
    }
  }
}
