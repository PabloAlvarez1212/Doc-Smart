import test from "node:test";
import assert from "node:assert/strict";
import { assistantState, messageBlocks } from "./bymaxPresentation.mjs";

const state = (props = {}) => assistantState({ voice: { mic: "off", playback: "idle" }, ...props });
test("audio preparation and autoplay gating never claim the assistant is speaking", () => {
  assert.equal(state({ voice: { playback: "starting" } }).status, "processing");
  assert.equal(state({ voice: { playback: "ready" } }).status, "off");
  assert.equal(state({ voice: { playback: "speaking" } }).status, "speaking");
});
test("only observed listening is shown; waiting and recovery remain distinct", () => {
  for (const mic of ["waiting", "listening", "recovering", "suspended", "ended", "off"]) {
    assert.equal(state({ voice: { mic } }).status, mic);
  }
  assert.equal(state({ voice: { mic: "starting" } }).status, "recovering");
});
test("text-only requests, loading, disconnected transport and response failures are visible", () => {
  assert.equal(state({ sending: true }).status, "processing");
  assert.equal(state({ loading: true }).status, "processing");
  assert.equal(state({ connection: "disconnected" }).status, "disconnected");
  assert.equal(state({ lastMessage: { error: true } }).status, "error");
  assert.equal(state({ error: "Failed", sending: true }).status, "error");
});
test("message formatting preserves prose, list order and literal unsafe markup", () => {
  const blocks = messageBlocks("Opciones\n\n3. Lunes\n4. Martes\n\n- Médico **A**\n- Médico B\n<script>alert(1)</script>");
  assert.deepEqual(blocks[2], { type: "ol", start: 3, lines: ["Lunes", "Martes"] });
  assert.deepEqual(blocks[4].lines, ["Médico **A**", "Médico B"]);
  assert.equal(blocks[5].lines[0], "<script>alert(1)</script>");
});
