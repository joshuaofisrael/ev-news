import assert from "node:assert/strict";
import { test } from "node:test";
import { META_DESCRIPTION_LIMIT, metaDescription } from "../lib/meta-description.js";

test("a short front-matter description is kept whole", () => {
  const summary = "Tesla's update gives one figure and says the driver stays responsible.";
  assert.ok(summary.length < META_DESCRIPTION_LIMIT);
  assert.equal(metaDescription(summary), summary);
  assert.doesNotMatch(metaDescription(summary), /…/);
});

test("a description is cut on a word boundary and only then gets an ellipsis", () => {
  const exact = "battery ".repeat(30).trim().slice(0, META_DESCRIPTION_LIMIT);
  assert.equal(exact.length, META_DESCRIPTION_LIMIT);
  assert.equal(metaDescription(exact), exact);

  const summary = "battery ".repeat(40).trim();
  assert.ok(summary.length > META_DESCRIPTION_LIMIT);
  const cut = metaDescription(summary);
  assert.ok(cut.endsWith("…"));
  assert.ok(cut.length <= META_DESCRIPTION_LIMIT);
  const kept = cut.slice(0, -1);
  assert.equal(summary[kept.length], " ");
  assert.ok(summary.startsWith(kept));
  assert.doesNotMatch(kept, /\s$/);

  const oneWord = "a".repeat(META_DESCRIPTION_LIMIT + 20);
  const hard = metaDescription(oneWord);
  assert.equal(hard.length, META_DESCRIPTION_LIMIT);
  assert.ok(hard.endsWith("…"));
  assert.ok(oneWord.startsWith(hard.slice(0, -1)));
});

test("whitespace is collapsed and an empty summary uses the fallback", () => {
  assert.equal(metaDescription("  Cars   and   batteries.  "), "Cars and batteries.");
  assert.equal(metaDescription("", "Desk copy."), "Desk copy.");
  assert.equal(metaDescription(undefined, "  Desk   copy. "), "Desk copy.");
  const longFallback = `${"charging ".repeat(30).trim()}`;
  const cut = metaDescription("   ", longFallback);
  assert.ok(cut.endsWith("…"));
  assert.ok(cut.length <= META_DESCRIPTION_LIMIT);
  assert.equal(longFallback[cut.length - 1], " ");
});
