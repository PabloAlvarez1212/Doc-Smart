import test from "node:test";
import assert from "node:assert/strict";
import { parseHistoryRecordId } from "./medicalHistoryLink.mjs";

test("notification links resolve a positive record identifier independently of list pagination", () => {
    assert.equal(parseHistoryRecordId("4821"), 4821);
    assert.equal(parseHistoryRecordId("1"), 1);
});

test("malformed and unsafe identifiers never become detail requests", () => {
    for (const value of [null, undefined, "", "0", "-1", "1.5", "1e3", "12/", " 1", "01", "9007199254740992"]) {
        assert.equal(parseHistoryRecordId(value), null);
    }
});
