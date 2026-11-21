import assert from "node:assert/strict";
import { test } from "node:test";
import { insertFollowOn, selectFollowOn } from "../lib/follow-on.js";

function post(slug, date, tags, category, extras = {}) {
  return {
    url: `/articles/${slug}/`,
    date: new Date(`${date}T00:00:00Z`),
    data: {
      title: extras.title || slug,
      date,
      tags,
      category,
      news: extras.news,
      hero: { src: `${slug}-hero`, alt: "Unbadged car, no markings" },
    },
  };
}

const posts = [
  post("zoox-atlanta", "2026-11-14", ["zoox", "robotaxi", "autonomous"], "Industry/Business"),
  post("zoox-la", "2026-11-20", ["zoox", "robotaxi", "autonomous-driving"], "Cars", {
    title: "Zoox in Los Angeles",
  }),
  post("cybercab-orders", "2026-11-15", ["tesla", "cybercab", "robotaxi", "autonomous"], "Cars"),
  post("fort-worth", "2026-11-03", ["tesla", "robotaxi"], "Cars"),
  post("charge-cost", "2026-10-26", ["explainer", "charging"], "Charging", { news: false, title: "Home charging cost" }),
  post("charge-levels", "2026-11-02", ["charging", "explainer", "dc-fast-charging"], "Charging", {
    title: "Charging levels",
  }),
  post("gm-pass", "2026-11-18", ["gm", "public-charging"], "Charging"),
  post("cold-range", "2026-10-25", ["explainer", "range"], "Cars", { news: false }),
  post("aptera", "2026-11-19", ["aptera", "solar-ev"], "Industry/Business"),
  post("gm-recall", "2026-11-07", ["gm", "recall"], "Cars", { title: "GM brake recall" }),
  post("cybertruck-shift", "2026-11-08", ["tesla", "cybertruck"], "Industry/Business"),
];

test("a later story that shares a rare name is what happened next", () => {
  const result = selectFollowOn(posts, "/articles/zoox-atlanta/", 4);
  const next = result.items.filter((item) => item.role === "next").map((item) => item.post.url);
  assert.deepEqual(next, ["/articles/zoox-la/"]);
  assert.equal(result.items.some((item) => item.post.url === "/articles/cybercab-orders/" && item.role === "next"), false);
  assert.equal(result.items.some((item) => item.post.url.includes("zoox-atlanta")), false);
  assert.ok(result.items.length >= 3 && result.items.length <= 4);
  assert.match(result.heading, /what happened next/i);
});

test("charging stories pick up the charging explainers as background", () => {
  const result = selectFollowOn(posts, "/articles/gm-pass/", 4);
  const urls = result.items.map((item) => item.post.url);
  assert.ok(urls.includes("/articles/charge-cost/"));
  assert.ok(urls.includes("/articles/charge-levels/"));
  assert.equal(result.items.every((item) => item.role === "background"), true);
  assert.equal(result.heading, "Background");
  assert.equal(urls.includes("/articles/cold-range/"), false);
  assert.equal(urls.includes("/articles/gm-recall/"), false);
});

test("a story with no sibling is left without padded links", () => {
  const result = selectFollowOn(posts, "/articles/aptera/", 4);
  assert.deepEqual(result.items, []);
  assert.equal(result.heading, "");
});

test("the mid-article block sits after a paragraph and is skipped when empty", () => {
  const html = "<p>One</p><p>Two</p><p>Three</p><p>Four</p>";
  const out = insertFollowOn(html, "<section class=\"follow-on\"><h2>Background</h2></section>");
  assert.ok(out.indexOf("follow-on") > out.indexOf("<p>Three</p>"));
  assert.ok(out.indexOf("follow-on") < out.indexOf("<p>Four</p>"));
  assert.equal(insertFollowOn(html, "  "), html);
  assert.equal(insertFollowOn("<p>Only</p>", "<section class=\"follow-on\"></section>"), "<p>Only</p>");
});
