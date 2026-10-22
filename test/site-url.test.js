import assert from "node:assert/strict";
import { test } from "node:test";
import { absoluteUrl, pathPrefixFromSiteUrl, prefixRootUrls } from "../lib/site-url.js";
import { buildIndexNowBody, isPlaceholderSiteUrl, urlsFromSitemap } from "../lib/indexnow.js";

test("the site URL is the only origin and may include a project path", () => {
  assert.equal(pathPrefixFromSiteUrl("https://example.com"), "/");
  assert.equal(pathPrefixFromSiteUrl("https://example.com/"), "/");
  assert.equal(pathPrefixFromSiteUrl("https://joshuaofisrael.github.io/ev-news"), "/ev-news/");
  assert.equal(absoluteUrl("https://example.com", "/about/"), "https://example.com/about/");
  assert.equal(
    absoluteUrl("https://joshuaofisrael.github.io/ev-news", "/about/"),
    "https://joshuaofisrael.github.io/ev-news/about/",
  );
  assert.equal(
    absoluteUrl("https://joshuaofisrael.github.io/ev-news", "/ev-news/about/"),
    "https://joshuaofisrael.github.io/ev-news/about/",
  );
});

test("root-relative links pick up a project path once", () => {
  const html = `<a href="/about/">About</a><a href="/ev-news/contact/">Contact</a><a href="https://www.epa.gov/">EPA</a>`;
  const prefixed = prefixRootUrls(html, "/ev-news/");
  assert.match(prefixed, /href="\/ev-news\/about\/"/);
  assert.match(prefixed, /href="\/ev-news\/contact\/"/);
  assert.doesNotMatch(prefixed, /\/ev-news\/ev-news\//);
  assert.match(prefixed, /href="https:\/\/www.epa.gov\/"/);
  assert.equal(prefixRootUrls(html, "/"), html);
});

test("IndexNow uses sitemap URLs and skips the placeholder domain", () => {
  assert.equal(isPlaceholderSiteUrl("https://example.com"), true);
  assert.equal(isPlaceholderSiteUrl("https://news.example.org"), true);
  const urls = urlsFromSitemap(
    `<urlset><url><loc>https://news.example/about/</loc></url><url><loc>https://news.example/a&amp;b/</loc></url></urlset>`,
  );
  assert.deepEqual(urls, ["https://news.example/about/", "https://news.example/a&b/"]);
  const body = buildIndexNowBody({
    siteUrl: "https://joshuaofisrael.github.io/ev-news",
    key: "abc123",
    urls,
  });
  assert.equal(body.host, "joshuaofisrael.github.io");
  assert.equal(body.keyLocation, "https://joshuaofisrael.github.io/ev-news/abc123.txt");
  assert.equal(body.urlList.length, 2);
});
