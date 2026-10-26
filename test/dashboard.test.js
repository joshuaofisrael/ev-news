import assert from "node:assert/strict";
import { test } from "node:test";
import dashboard from "../src/_data/dashboard.js";
import { validateDashboard } from "../lib/dashboard.js";

test("dashboard figures cite a source URL and a number the story prints", () => {
  const result = validateDashboard(dashboard);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
  for (const figure of dashboard.figures) {
    assert.equal(typeof figure.label, "string");
    assert.ok(figure.label.trim());
    assert.ok(figure.value !== undefined && figure.value !== "");
    assert.ok(figure.unit.trim());
    assert.match(figure.asOf, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(figure.sourceName.trim());
    assert.match(figure.sourceUrl, /^https:\/\/\S+$/);
    assert.match(figure.articleSlug, /^2026-10-2[3-6]-/);
  }
});

test("a dashboard figure without a source URL fails validation", () => {
  const broken = {
    ...dashboard,
    figures: dashboard.figures.map((figure, index) =>
      index === 0 ? { ...figure, sourceUrl: "" } : figure,
    ),
  };
  const result = validateDashboard(broken);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /sourceUrl is required/);

  const uncited = {
    ...dashboard,
    figures: dashboard.figures.map((figure, index) =>
      index === 0 ? { ...figure, sourceUrl: "https://example.com/not-in-the-story" } : figure,
    ),
  };
  const missing = validateDashboard(uncited);
  assert.equal(missing.ok, false);
  assert.match(missing.errors.join("\n"), /sourceUrl is not cited/);
});
