import assert from "node:assert/strict";
import { test } from "node:test";
import { isFuturePublication } from "../lib/dates.js";

const now = Date.parse("2026-10-29T12:00:00Z");

test("publishAt in the future is held and a past timestamp is due", () => {
  assert.equal(isFuturePublication("2026-10-29T15:00:00Z", now), true);
  assert.equal(isFuturePublication("2026-10-29T11:00:00Z", now), false);
  assert.equal(isFuturePublication("2026-10-29T12:00:00Z", now), false);
  assert.equal(isFuturePublication("", now), false);
  assert.equal(isFuturePublication(undefined, now), false);
});
