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
    src: "sample-cars-hero",
    alt: "Unbranded electric hatchback parked on a quiet residential street, an illustration rather than a news photograph",
    caption: "AI-generated illustration",
    width: 1200,
    height: 675,
  };
  const body = {
    src: "sample-cars-port",
    alt: "Close view of an empty charging port on a generic electric car, with no brand marks",
    caption: "AI-generated illustration",
    after: 2,
    width: 1200,
    height: 675,
  };
  const second = {
    ...body,
    src: "sample-cars-cabin",
    alt: "Empty front seats and a blank dashboard inside a generic electric car",
    after: 4,
  };
  assert.deepEqual(validateArticleImages({ hero, images: [body, second] }), []);
  assert.match(validateArticleImages({ images: [body, second] }).join(" "), /hero is required/);
  assert.match(validateArticleImages({ hero, images: [body] }).join(" "), /at least two/);
  assert.match(validateArticleImages({ hero, images: [{ ...body, alt: "car" }, second] }).join(" "), /meaningful/);
  assert.match(
    validateArticleImages({ hero: { ...hero, caption: "A real photo" }, images: [body, second] }).join(" "),
    /AI-generated illustration/,
  );
});

test("a published image needs credit and cannot be a stock-agency file", () => {
  const ready = {
    image: "cars",
    imageAlt: "Original illustration of a simplified electric car and a charge bolt",
    imageCaption: "Original illustration for the Cars desk.",
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
