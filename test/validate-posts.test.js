import assert from "node:assert/strict";
import { test } from "node:test";
import {
  inlineCitationWarning,
  validateArticleImages,
  validateImageCredit,
  validatePostsDir,
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

test("a published story needs a hero and two described body images", () => {
  const hero = {
    src: "fixture-hero",
    alt: "Unbranded electric hatchback parked on a quiet residential street, with no people in frame",
    caption: "AI-generated photograph",
    width: 1200,
    height: 675,
  };
  const body = {
    src: "fixture-body-a",
    alt: "Close view of an empty charging port on a generic electric car, with no brand marks",
    caption: "AI-generated photograph",
    after: 2,
    width: 1200,
    height: 675,
  };
  const second = {
    ...body,
    src: "fixture-body-b",
    alt: "Empty front seats and a blank dashboard inside a generic electric car",
    after: 4,
  };
  assert.deepEqual(validateArticleImages({ hero, images: [body, second] }), []);
  assert.match(validateArticleImages({ images: [body, second] }).join(" "), /hero is required/);
  assert.match(validateArticleImages({ hero, images: [body] }).join(" "), /at least two/);
  assert.match(validateArticleImages({ hero, images: [{ ...body, alt: "car" }, second] }).join(" "), /meaningful/);
  assert.match(
    validateArticleImages({ hero: { ...hero, caption: "A real photo" }, images: [body, second] }).join(" "),
    /AI-generated photograph/,
  );
  assert.match(
    validateArticleImages({
      hero: { ...hero, alt: "An illustration of an electric car on a street" },
      images: [body, second],
    }).join(" "),
    /photoreal/,
  );
});

test("a published image needs credit and cannot be a stock-agency file", () => {
  const ready = {
    image: "fixture-hero",
    imageAlt: "Unbranded electric hatchback parked on a quiet residential street, used only as a validator fixture",
    imageCaption: "Press photograph used only as a validator fixture.",
    imageCredit: "EV News Desk",
    imageLicense: "Original",
    imageWidth: 1200,
    imageHeight: 675,
  };
  assert.deepEqual(validateImageCredit(ready), []);
  assert.match(validateImageCredit({ image: "https://example.com/a.jpg" }).join(" "), /basename/);
  assert.match(validateImageCredit({ ...ready, image: "missing-art" }).join(" "), /missing/);
  assert.match(
    validateImageCredit({ ...ready, imageLicense: "CC-BY", imageCredit: "Ada", imageSource: "" }).join(" "),
    /imageSource/,
  );
  assert.match(
    validateImageCredit({
      ...ready,
      imageLicense: "Fair use",
      imageSource: "https://www.epa.gov/greenvehicles/electric-vehicle-myths",
      imageWidth: 1200,
    }).join(" "),
    /small/,
  );
  assert.match(
    validateImageCredit({
      ...ready,
      imageLicense: "CC0",
      imageSource: "https://www.shutterstock.com/image-photo/example",
      imageWidth: 640,
      imageHeight: 360,
    }).join(" "),
    /stock-agency/,
  );
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
  assert.equal(inlineCitationWarning("See the [EPA page](https://www.epa.gov/)."), null);
});
