// Progressive MPEG transport. Playback begins after the first SourceBuffer append.
export function attachProgressiveAudio({ browser, audio, stream, signal, onError }) {
  const source = new browser.MediaSource();
  const url = browser.URL.createObjectURL(source);
  const reader = stream.getReader();
  let buffer, closed = false, first = true, rejectReady, resolveReady;
  let cancelWait;
  let readerReleased = false;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  const setTimer = browser.setTimeout || setTimeout;
  const clearTimer = browser.clearTimeout || clearTimeout;
  const startupTimer = setTimer(() => { rejectReady(new Error('Audio stream startup timeout')); close(); }, 12000);
  function close() {
    if (closed) return;
    closed = true;
    clearTimer(startupTimer);
    signal?.removeEventListener('abort', close);
    source.removeEventListener('sourceopen', open);
    cancelWait?.();
    if (!readerReleased) {
      try { Promise.resolve(reader.cancel()).catch(() => {}); } catch {}
    }
    try { if (buffer?.updating) buffer.abort(); } catch {}
    browser.URL.revokeObjectURL(url);
    rejectReady(new DOMException('Cancelled', 'AbortError'));
  }
  function append(bytes) {
    return new Promise((resolve, reject) => {
      const cleanup = () => { buffer.removeEventListener('updateend', done); buffer.removeEventListener('error', failed); cancelWait = null; };
      const done = () => { cleanup(); resolve(); };
      const failed = () => { cleanup(); reject(new Error('Audio buffer failed')); };
      cancelWait = () => { cleanup(); reject(new DOMException('Cancelled', 'AbortError')); };
      buffer.addEventListener('updateend', done, { once: true });
      buffer.addEventListener('error', failed, { once: true });
      try { buffer.appendBuffer(bytes); } catch (error) { cleanup(); reject(error); }
    });
  }
  async function open() {
    try {
      if (closed) return;
      buffer = source.addSourceBuffer('audio/mpeg');
      while (!closed) {
        const { done, value } = await reader.read();
        if (closed) return;
        if (done) break;
        if (!value?.byteLength) continue;
        await append(value);
        if (first) { first = false; clearTimer(startupTimer); resolveReady(); }
      }
      if (closed) return;
      if (first) throw new Error('Empty audio stream');
      if (source.readyState === 'open') source.endOfStream();
      reader.releaseLock(); readerReleased = true;
    } catch (error) {
      if (closed) return;
      const wasReady = !first;
      rejectReady(error); close();
      if (wasReady) onError(error);
    }
  }
  source.addEventListener('sourceopen', open, { once: true });
  signal?.addEventListener('abort', close, { once: true });
  audio.src = url;
  if (signal?.aborted) close();
  return { ready, close };
}
