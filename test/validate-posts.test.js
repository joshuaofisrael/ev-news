import assert from "node:assert/strict";
import { test } from "node:test";
import {
  inlineCitationWarning,
  validatePostsDir,
  validateImages,
  validatePublishedPost,
  validateSourceList,
} from "../lib/validate-posts.js";

test("published articles need a complete sources list", () => {
  assert.ok(validateSourceList(undefined).length);
  assert.ok(validateSourceList([]).length);
  const missingPublisher = validateSourceList([
    {
      title: "A page",
      url: "https://www.epa.gov/greenvehicles/electric-vehicle-myths",
      publisher: "",
      date: "2026-06-10",
    },
  ]);
  assert.match(missingPublisher.join(" "), /publisher/);
  assert.ok(
    validateSourceList([
      {
        title: "Electric Vehicle Myths",
        url: "notaurl",
        publisher: "U.S. Environmental Protection Agency",
        date: "2026-06-10",
      },
    ]).some((message) => message.includes("url")),
  );
});

test("drafts and complete posts follow the publish gate", () => {
  const drafts = validatePostsDir("test/fixtures/draft-posts");
  assert.equal(drafts.ok, true);

  const ready = validatePostsDir("test/fixtures/valid-posts");
  assert.equal(ready.ok, true);
  assert.equal(ready.warnings.length, 1);

  const missing = validatePostsDir("test/fixtures/invalid-posts");
  assert.equal(missing.ok, false);
  assert.match(missing.errors[0].messages.join(" "), /sources/);

  const sample = validatePostsDir("test/fixtures/sample-unlocked");
  assert.equal(sample.ok, false);
  assert.match(sample.errors[0].messages.join(" "), /sample/);

  const posts = validatePostsDir("src/content/posts");
  assert.equal(posts.ok, true, JSON.stringify(posts.errors));
  assert.deepEqual(posts.warnings, []);
});

test("published posts need a known category and an inline citation warning is separate", () => {
  const messages = validatePublishedPost({
    title: "Fixture",
    date: "2026-10-22",
    category: "Not a desk",
    summary: "Not a news article.",
    sources: [
      {
        title: "Electric Vehicle Myths",
        url: "https://www.epa.gov/greenvehicles/electric-vehicle-myths",
        publisher: "U.S. Environmental Protection Agency",
        date: "2026-06-10",
      },
    ],
  });
  assert.match(messages.join(" "), /category/);
  assert.match(messages.join(" "), /updatedAt/);
  assert.equal(inlineCitationWarning("See the [EPA page](https://www.epa.gov/)."), null);
});

test("AI images need a disclosure caption and press images stay small and credited", () => {
  const base = {
    title: "Fixture",
    date: "2026-10-22",
    updatedAt: "2026-10-23",
    category: "Cars",
    summary: "Not a news article.",
    sources: [
      {
        title: "Electric Vehicle Myths",
        url: "https://www.epa.gov/greenvehicles/electric-vehicle-myths",
        publisher: "U.S. Environmental Protection Agency",
        date: "2026-06-10",
      },
    ],
  };
  const hero = {
    src: "charger-on-a-wall",
    alt: "Unbranded home charger mounted on a garage wall, with no person in frame",
    caption: "A picture",
    width: 1200,
    height: 675,
  };
  assert.match(validateImages({ hero }).join(" "), /AI-generated image/);
  assert.deepEqual(
    validateImages({
      hero: { ...hero, caption: "AI-generated image" },
    }),
    [],
  );
  assert.match(validateImages({ hero: { ...hero, caption: "AI-generated image", alt: "car" } }).join(" "), /describe/);
  assert.match(validatePublishedPost({ ...base, label: "rumor" }).join(" "), /label/);
  assert.match(validatePublishedPost({ ...base, disclaimer: "medical" }).join(" "), /disclaimer/);
  assert.match(
    validateImages({
      image: "https://cdn.example/photo.jpg",
      imageAlt: "A small press photograph of a charging stall",
      imageCaption: "The agency's photograph.",
      imageCredit: "Example Agency",
      imageLicense: "Fair use",
      imageSource: "https://www.epa.gov/greenvehicles/electric-vehicle-myths",
      imageWidth: 640,
      imageHeight: 480,
    }).join(" "),
    /basename/,
  );
  assert.match(
    validateImages({
      image: "press-stall",
      imageAlt: "A small press photograph of a charging stall",
      imageCaption: "The agency's photograph.",
      imageCredit: "Example Agency",
      imageLicense: "CC-BY",
      imageSource: "https://www.epa.gov/greenvehicles/electric-vehicle-myths",
      imageWidth: 640,
      imageHeight: 480,
    }).join(" "),
    /Fair use/,
  );
  assert.match(
    validateImages({
      image: "press-stall",
      imageAlt: "A small press photograph of a charging stall",
      imageCaption: "The agency's photograph.",
      imageCredit: "Example Agency",
      imageLicense: "Fair use",
      imageSource: "https://www.shutterstock.com/image-photo/example",
      imageWidth: 1200,
      imageHeight: 800,
    }).join(" "),
    /small/,
  );
});
