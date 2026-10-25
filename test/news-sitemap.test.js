import assert from "node:assert/strict";
import { test } from "node:test";
import site from "../src/_data/site.js";
import { freshNewsPosts, renderNewsSitemap } from "../lib/news-sitemap.js";

const now = Date.parse("2026-10-23T12:00:00Z");

test("the news sitemap lists only articles from the last two days", () => {
  const xml = renderNewsSitemap({
    now,
    site,
    posts: [
      {
        url: "/articles/old-pack/",
        date: "2026-10-01",
        data: { title: "Old pack story", tags: ["batteries"] },
      },
      {
        url: "/articles/pack-supply/",
        date: "2026-10-22",
        data: { title: "Pack & cell supply", tags: ["batteries"] },
      },
      {
        url: "/articles/tomorrow/",
        date: "2026-10-24",
        data: { title: "Not published yet" },
      },
    ],
  });

  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /xmlns:news="http:\/\/www.google.com\/schemas\/sitemap-news\/0.9"/);
  assert.match(xml, /<loc>https:\/\/evnewsdesk.com\/articles\/pack-supply\/<\/loc>/);
  assert.match(xml, /<news:name>EV News Desk<\/news:name>/);
  assert.match(xml, /<news:language>en<\/news:language>/);
  assert.match(xml, /<news:publication_date>2026-10-22T00:00:00Z<\/news:publication_date>/);
  assert.match(xml, /<news:title>Pack &amp; cell supply<\/news:title>/);
  assert.doesNotMatch(xml, /Old pack story|Not published yet/);
  assert.equal(freshNewsPosts([{ date: "2026-10-22" }, { date: "2026-10-01" }], now).length, 1);
  assert.equal(
    freshNewsPosts([{ date: "2026-10-22", data: { news: false, title: "Evergreen" } }], now).length,
    0,
  );
});

test("an empty news sitemap stays valid XML and is not a bare urlset", () => {
  const xml = renderNewsSitemap({ posts: [], site, now });
  assert.match(xml, /xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/);
  assert.match(xml, /xmlns:news="http:\/\/www.google.com\/schemas\/sitemap-news\/0.9"/);
  assert.match(xml, /<!-- No articles were published in the last two days. -->/);
  assert.doesNotMatch(xml, /<url>/);
  assert.doesNotMatch(xml, /<news:title>/);
});
