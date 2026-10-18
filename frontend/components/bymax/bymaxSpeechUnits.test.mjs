import test from "node:test";
import assert from "node:assert/strict";
import { takeSpeechUnits } from "./bymaxSpeechUnits.mjs";

test("stream preserves abbreviations and decimals across chunks", () => {
  assert.deepEqual(takeSpeechUnits("Hola Dr."), { units: [], remaining: "Hola Dr." });
  assert.deepEqual(takeSpeechUnits("Hola Dr. Pérez. Tu valor es 3.5. Después"), {
    units: ["Hola Dr. Pérez.", "Tu valor es 3.5."], remaining: " Después",
  });
  assert.deepEqual(takeSpeechUnits("1. Paciente. 2. Paciente.", true).units, ["1. Paciente.", "2. Paciente."]);
});
test("streamed and full response preserve exactly the same text", () => {
  let buffer = ""; const spoken = [];
  for (const chunk of ["Hola Dr.", " Pérez. ", "Revisa el caso", "."]) {
    const next = takeSpeechUnits(buffer + chunk);
    spoken.push(...next.units); buffer = next.remaining;
  }
  spoken.push(...takeSpeechUnits(buffer, true).units);
  assert.deepEqual(spoken, ["Hola Dr. Pérez.", "Revisa el caso."]);
});

test("a meaningful clause can start speech before the first sentence finishes", () => {
 const text = "Puedo ayudarte con una explicación extensa, incluyendo los pasos necesarios";
 assert.deepEqual(takeSpeechUnits(text), { units: ["Puedo ayudarte con una explicación extensa,"], remaining: " incluyendo los pasos necesarios" });
 assert.deepEqual(takeSpeechUnits("Hola, revisa 12.5 y al Dr. Pérez"), { units: [], remaining: "Hola, revisa 12.5 y al Dr. Pérez" });
});
