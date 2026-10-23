import assert from "node:assert/strict";
import { test } from "node:test";
import site from "../src/_data/site.js";
import { buildGraph, renderBreadcrumbNav } from "../lib/structured-data.js";

test("NewsArticle publisher is the Florida LLC and breadcrumbs escape text", () => {
  const graph = buildGraph(
    {
      kind: "article",
      title: "A sourced headline",
      summary: "A dek.",
      category: "Cars",
      tags: ["range"],
      updatedAt: "2026-10-23",
      page: { url: "/articles/example/", date: new Date("2026-10-22T00:00:00Z") },
    },
    site,
  );
  const article = graph["@graph"].find((node) => node["@type"] === "NewsArticle");
  const crumbs = graph["@graph"].find((node) => node["@type"] === "BreadcrumbList");
  assert.equal(article.publisher["@type"], "Organization");
  assert.equal(article.publisher.name, "Joshua Israel Ventures LLC");
  assert.equal(article.author.name, "EV News Desk");
  assert.equal(article.dateModified, "2026-10-23T00:00:00.000Z");
  assert.match(
    graph["@graph"].find((node) => node["@type"] === "NewsMediaOrganization").publishingPrinciples,
    /\/sources-ethics\/$/,
  );
  assert.equal(crumbs.itemListElement[0].name, "Home");
  assert.equal(crumbs.itemListElement[1].name, "Cars");

  const home = buildGraph({ title: site.name, page: { url: "/" } }, site);
  assert.equal(
    home["@graph"].some((node) => node["@type"] === "NewsArticle"),
    false,
  );

  const dash = buildGraph(
    {
      kind: "dashboard",
      title: "EV data dashboard",
      summary: "Sourced figures from the 23 October 2026 stories.",
      page: { url: "/data/" },
    },
    site,
  );
  const dataset = dash["@graph"].find((node) => node["@type"] === "Dataset");
  const newsroom = dash["@graph"].find((node) => node["@type"] === "NewsMediaOrganization");
  assert.equal(dataset.creator.name, "EV News Desk");
  assert.equal(dataset.publisher["@id"], newsroom["@id"]);
  assert.equal(newsroom.name, "EV News Desk");
  assert.equal(dataset.name, "EV data dashboard");
  assert.doesNotMatch(dataset.creator.name, /Joshua/);
  assert.ok(home["@graph"].some((node) => node["@type"] === "BreadcrumbList"));

  const html = renderBreadcrumbNav([
    { name: "Home", url: "https://example.com/" },
    { name: "<script>", url: "https://example.com/x/" },
  ]);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});
