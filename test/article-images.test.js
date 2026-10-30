import assert from "node:assert/strict";
import { test } from "node:test";
import { insertBodyImages, renderAiFigure } from "../lib/article-images.js";

const picture = (src, after) => ({
  src,
  alt: `Unbranded electric hardware for ${src}, with no people in frame`,
  caption: "AI-generated photograph",
  after,
  width: 1200,
  height: 675,
});

test("body images land after the requested paragraphs and stay lazy", () => {
  const html = "<p>One</p>\n<p>Two</p>\n<h2>Later</h2>\n<p>Three</p>";
  const out = insertBodyImages(html, [picture("sample-cars-port", 2), picture("sample-cars-cabin", 3)]);
  assert.match(out, /Two<\/p><figure class="story-figure story-figure-ai is-slot">/);
  assert.match(out, /Three<\/p><figure class="story-figure story-figure-ai is-slot">/);
  assert.match(out, /src\/assets\/images\/sample-cars-port\.webp/);
  assert.match(out, /src\/assets\/images\/sample-cars-cabin\.avif/);
  assert.match(out, /Photoreal image slot/);
  assert.doesNotMatch(out, /AI-generated photograph/);
  assert.doesNotMatch(out, /<figcaption>/);
  assert.doesNotMatch(out, /<img /);
  const port = out.indexOf("sample-cars-port");
  const three = out.indexOf("<p>Three</p>");
  assert.ok(port > 0 && port < three);

  const ready = renderAiFigure(picture("fixture-hero"), "/", { ready: true });
  assert.match(ready, /<picture>/);
  assert.match(ready, /fixture-hero\.webp/);
  assert.match(ready, /width="1200"/);
  assert.match(ready, /height="675"/);
  assert.match(ready, /loading="lazy"/);
  assert.doesNotMatch(ready, /AI-generated photograph/);
  assert.doesNotMatch(ready, /<figcaption>/);
  assert.doesNotMatch(ready, /fetchpriority/);
  assert.match(ready, /<span class="ai-label">AI-generated<\/span>/);
  assert.doesNotMatch(out, /class="ai-label"/);

  const captioned = renderAiFigure(
    { ...picture("fixture-hero"), caption: "Quiet street, no people in frame" },
    "/",
    { ready: true },
  );
  assert.match(captioned, /Quiet street, no people in frame/);
  const hidden = renderAiFigure(
    { ...picture("fixture-hero"), caption: "AI-generated photograph" },
    "/",
    { ready: true },
  );
  assert.doesNotMatch(hidden, /AI-generated photograph|<figcaption>/);
});

test("an image without after is spread through the paragraphs", () => {
  const html = "<p>One</p><p>Two</p><p>Three</p><p>Four</p>";
  const out = insertBodyImages(html, [picture("sample-cars-port"), picture("sample-cars-cabin")]);
  assert.match(out, /Two<\/p><figure/);
  assert.match(out, /Four<\/p><figure/);
});
