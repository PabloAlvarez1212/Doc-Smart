import test from "node:test";
import assert from "node:assert/strict";
import { matchesTurn, latencyTrace } from "./bymaxTurn.mjs";
test("late and unidentified fragments never alter the active response", () => {
  const turn = { requestId: "new" };
  assert.equal(matchesTurn(turn, {request_id:"old"}), false);
  assert.equal(matchesTurn(turn, {}), false);
  assert.equal(matchesTurn(turn, {response_id:"new"}), true);
  assert.equal(matchesTurn(turn, {response_id:"server-generated",request_id:"new"}), true);
  assert.equal(matchesTurn(null, {request_id:"new"}), false);
});
test("timings contain IDs and elapsed time, never text, and each milestone emits once", () => {
  let time = 10; const events = [];
  const mark = latencyTrace("id", () => time, value => events.push(value));
  time = 30; mark("first_text"); time = 40; mark("first_text"); mark("complete");
  assert.deepEqual(events, [
    {response_id:"id",event:"first_text",elapsed_ms:20},
    {response_id:"id",event:"complete",elapsed_ms:30},
  ]);
});
import { recoverResponse } from "./bymaxTurn.mjs";
test("reconnection retries only the same key while the backend is processing", async () => {
  const ids = []; const waits = []; const controller = new AbortController();
  const result = await recoverResponse({requestId:"same-key",signal:controller.signal,wait:async ms => waits.push(ms),send:async id => {
    ids.push(id);
    if (ids.length < 3) throw Object.assign(new Error("processing"),{status:409});
    return {respuesta:"Confirmed only once"};
  }});
  assert.deepEqual(ids,["same-key","same-key","same-key"]);
  assert.deepEqual(waits,[1000,2000]); assert.equal(result.respuesta,"Confirmed only once");
});
test("cancellation or non-processing failure never retries a message", async () => {
  const controller = new AbortController(); let calls=0;
  await assert.rejects(recoverResponse({requestId:"key",signal:controller.signal,send:async()=>{calls++;throw Object.assign(new Error("denied"),{status:403});}}),/denied/);
  assert.equal(calls,1);controller.abort();
  await assert.rejects(recoverResponse({requestId:"key",signal:controller.signal,send:async()=>{calls++;}}),{name:"AbortError"});
  assert.equal(calls,1);
});

test("cancelling during recovery backoff clears the timer without another request", async () => {
  const controller = new AbortController(); let calls = 0;
  const pending = recoverResponse({requestId:"key",signal:controller.signal,send:async()=>{calls++;throw Object.assign(new Error("processing"),{status:409});}});
  await new Promise(resolve => setImmediate(resolve)); controller.abort();
  await assert.rejects(pending,{name:"AbortError"}); assert.equal(calls,1);
});
