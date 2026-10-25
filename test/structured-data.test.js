import assert from "node:assert/strict";
import { test } from "node:test";
import faq, { faqAnswerText } from "../lib/faq.js";
import site from "../src/_data/site.js";
import { buildGraph, renderBreadcrumbNav } from "../lib/structured-data.js";

test("NewsArticle publisher is EV News Desk and breadcrumbs escape text", () => {
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
  const articleNewsroom = graph["@graph"].find((node) => node["@type"] === "NewsMediaOrganization");
  assert.equal(article.publisher["@id"], articleNewsroom["@id"]);
  assert.equal(articleNewsroom.name, "EV News Desk");
  assert.deepEqual(articleNewsroom.sameAs, ["https://x.com/TheCharismaCat1"]);
  assert.equal(article.author.name, "EV News Desk");
  assert.equal(article.copyrightHolder.name, "EV News Desk");
  assert.equal(JSON.stringify(graph).includes("Joshua"), false);
  assert.equal(JSON.stringify(graph).includes("PostalAddress"), false);
  assert.equal(article.dateModified, "2026-10-23T00:00:00.000Z");
  assert.equal(article["@type"], "NewsArticle");
  const explainer = buildGraph(
    {
      kind: "article",
      title: "Cold weather and electric-car range",
      summary: "A sourced explainer.",
      news: false,
      category: "Cars",
      updatedAt: "2026-10-25",
      page: { url: "/articles/2026-10-25-ev-range-cold-weather/", date: new Date("2026-10-25T00:00:00Z") },
    },
    site,
  );
  assert.equal(
    explainer["@graph"].some((node) => node["@type"] === "NewsArticle"),
    false,
  );
  assert.equal(explainer["@graph"].find((node) => node["@type"] === "Article").headline, "Cold weather and electric-car range");
  assert.match(
    graph["@graph"].find((node) => node["@type"] === "NewsMediaOrganization").publishingPrinciples,
    /\/sources-ethics\/$/,
  );
  assert.equal(crumbs.itemListElement[0].name, "Home");
  assert.equal(crumbs.itemListElement[1].name, "Cars");
  assert.equal(crumbs.itemListElement[1].item, "https://evnewsdesk.com/topics/cars/");
  const topic = buildGraph(
    {
      kind: "topic",
      hub: "topic",
      title: "Charging",
      summary: site.categories.find((category) => category.slug === "charging").hubIntro,
      desk: site.categories.find((category) => category.slug === "charging"),
      page: { url: "/topics/charging/" },
    },
    site,
  );
  const topicPage = topic["@graph"].find((node) => node["@type"] === "CollectionPage");
  const topicCrumbs = topic["@graph"].find((node) => node["@type"] === "BreadcrumbList");
  assert.equal(topicPage.publisher.name, "EV News Desk");
  assert.equal(topicPage.name, "Charging");
  assert.equal(topicCrumbs.itemListElement[1].item, "https://evnewsdesk.com/topics/charging/");
  assert.equal(JSON.stringify(topic).includes("Joshua"), false);

  const home = buildGraph({ kind: "home", title: site.name, page: { url: "/" } }, site);
  const faqPage = home["@graph"].find((node) => node["@type"] === "FAQPage");
  assert.ok(faqPage.mainEntity.length >= 5 && faqPage.mainEntity.length <= 6);
  assert.deepEqual(
    faqPage.mainEntity.map((item) => item.name),
    faq.map((item) => item.question),
  );
  assert.deepEqual(
    faqPage.mainEntity.map((item) => item.acceptedAnswer.text),
    faq.map((item) => faqAnswerText(item)),
  );
  assert.equal(JSON.stringify(home).includes("Joshua"), false);
  assert.equal(home["@graph"].find((node) => node["@id"]?.endsWith("#newsroom")).sameAs.length, 1);
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
  const room = buildGraph(
    {
      kind: "newsroom",
      title: "Newsroom dashboard",
      summary: "Published stories, newest first.",
      page: { url: "/dashboard/" },
    },
    site,
  );
  const collection = room["@graph"].find((node) => node["@type"] === "CollectionPage");
  assert.equal(collection.publisher.name, "EV News Desk");
  assert.equal(collection.name, "Newsroom dashboard");
  assert.doesNotMatch(collection.publisher.name, /Joshua/);

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
