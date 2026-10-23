import assert from "node:assert/strict";
import { test } from "node:test";
import { insertBodyImages } from "../lib/article-images.js";

const picture = (src, after) => ({
  src,
  alt: `Concept illustration ${src} with no people in frame`,
  caption: "AI-generated illustration",
  after,
  width: 1200,
  height: 675,
});

test("body images land after the requested paragraphs and stay lazy", () => {
  const html = "<p>One</p>\n<p>Two</p>\n<h2>Later</h2>\n<p>Three</p>";
  const out = insertBodyImages(html, [picture("sample-cars-port", 2), picture("sample-cars-cabin", 3)]);
  assert.match(out, /Two<\/p><figure class="story-figure story-figure-ai">/);
  assert.match(out, /Three<\/p><figure class="story-figure story-figure-ai">/);
  assert.match(out, /sample-cars-port\.avif/);
  assert.match(out, /sample-cars-cabin\.webp/);
  assert.match(out, /width="1200"/);
  assert.match(out, /height="675"/);
  assert.match(out, /loading="lazy"/);
  assert.match(out, /AI-generated illustration/);
  assert.doesNotMatch(out, /fetchpriority/);
  const port = out.indexOf("sample-cars-port");
  const three = out.indexOf("<p>Three</p>");
  assert.ok(port > 0 && port < three);
});

test("an image without after is spread through the paragraphs", () => {
  const html = "<p>One</p><p>Two</p><p>Three</p><p>Four</p>";
  const out = insertBodyImages(html, [picture("sample-cars-port"), picture("sample-cars-cabin")]);
  assert.match(out, /Two<\/p><figure/);
  assert.match(out, /Four<\/p><figure/);
});
