import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import matter from "gray-matter";
import { isHoldReview, isReleasedFile } from "../lib/legal-hold.js";
import { metaDescription } from "../lib/meta-description.js";
import { formatDisplayDate, isFreshNews } from "../lib/dates.js";
import faq from "../lib/faq.js";
import site from "../src/_data/site.js";
import dashboardData from "../src/_data/dashboard.js";

const root = path.resolve(import.meta.dirname, "..");
const bin = path.join(root, "node_modules", ".bin", "eleventy");

function runEleventy(args, env) {
  return spawnSync(bin, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

function read(outputDir, file) {
  return fs.readFileSync(path.join(root, outputDir, file), "utf8");
}

function esc(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeAttr(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function dayStamp(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  return String(value ?? "").slice(0, 10);
}

function markdownPosts() {
  const dir = path.join(root, "src/content/posts");
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const inputPath = path.join(dir, name);
      const data = matter(fs.readFileSync(inputPath, "utf8")).data;
      return {
        slug: name.replace(/\.md$/, ""),
        inputPath,
        date: dayStamp(data.date),
        updatedAt: dayStamp(data.updatedAt || data.date),
        hero: data.hero?.src || "",
        sources: Array.isArray(data.sources) ? data.sources.length : 0,
        draft: data.draft === true,
        sample: data.sample === true,
        news: data.news !== false,
        status: String(data.status || ""),
      };
    });
}

function isPublicPost(post) {
  if (post.draft || post.sample) return false;
  if (isHoldReview(post.status) && !isReleasedFile(post.inputPath)) return false;
  return true;
}

function publishedPosts() {
  return markdownPosts()
    .filter(isPublicPost)
    .sort((a, b) => {
      const delta = b.date.localeCompare(a.date);
      if (delta) return delta;
      return b.inputPath.localeCompare(a.inputPath);
    });
}

function metaDescriptions(html) {
  return [...html.matchAll(/<meta\s+(?:name="description"|property="og:description"|name="twitter:description")\s+content="([^"]*)"/g)].map(
    (match) => decodeAttr(match[1]),
  );
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

test("production build omits drafts and the sources gate fails closed", { timeout: 120000 }, () => {
  const failed = runEleventy(["--output=_site-invalid"], {
    ELEVENTY_ENV: "production",
    POSTS_DIR: "test/fixtures/invalid-posts",
  });
  assert.notEqual(failed.status, 0, failed.stdout + failed.stderr);
  assert.match(`${failed.stdout}\n${failed.stderr}`, /sources/i);

  fs.rmSync(path.join(root, "_site"), { recursive: true, force: true });
  const prod = runEleventy(["--output=_site"], { ELEVENTY_ENV: "production" });
  assert.equal(prod.status, 0, prod.stdout + prod.stderr);

  const home = read("_site", "index.html");
  const robots = read("_site", "robots.txt");
  const sitemap = read("_site", "sitemap.xml");
  const news = read("_site", "news-sitemap.xml");
  const feed = read("_site", "feed.xml");
  const atom = read("_site", "atom.xml");
  const llms = read("_site", "llms.txt");
  const about = read("_site", "about/index.html");
  const contact = read("_site", "contact/index.html");
  const terms = read("_site", "terms/index.html");
  const privacy = read("_site", "privacy/index.html");
  const disclaimer = read("_site", "disclaimer/index.html");
  const legalNotice =
    "© 2026 Joshua Israel Ventures LLC. All rights reserved. EV News Desk is a trade name of Joshua Israel Ventures LLC, a Florida limited liability company.";
  assert.doesNotMatch(home, /©|Copyright|All rights reserved/);
  assert.doesNotMatch(home, /Joshua|Ventures/);
  assert.match(home, /\/articles\/2026-10-26-bmw-ix5-460kw-charging\//);
  assert.match(home, /\/articles\/2026-10-26-rivian-q3-us-ev-sales\//);
  assert.match(sitemap, /\/articles\/2026-10-23-tesla-q3-results\//);
  assert.doesNotMatch(home, /No story has been published yet/);
  assert.match(home, /class="masthead[\s"]/);
  assert.match(home, /class="charge-fill"/);
  assert.doesNotMatch(home, /assets\/images\/hero\.(avif|webp)/);
  assert.doesNotMatch(home, /Original illustration|AI-generated illustration/);
  const charging = read("_site", "category/charging/index.html");
  assert.doesNotMatch(charging, /assets\/images\/charging\.(avif|webp|svg)/);
  assert.doesNotMatch(charging, /Original illustration/);
  assert.match(home, /assets\/photos\/home-hero\.avif/);
  assert.match(home, /assets\/photos\/home-hero\.webp/);
  assert.match(home, /width="1280" height="720"/);
  assert.match(home, /fetchpriority="high"/);
  assert.match(home, /loading="lazy"/);
  assert.match(home, /assets\/photos\/cat-industry\.avif/);
  assert.doesNotMatch(home, /First stories land daily/);
  assert.match(home, /White electric crossover in a bright showroom/);
  assert.doesNotMatch(home, /AI-generated photograph/);
  assert.match(charging, /assets\/photos\/cat-charging\.avif/);
  assert.match(charging, /loading="eager"/);
  assert.match(charging, /fetchpriority="high"/);
  assert.match(charging, /White electric crossover plugged into a curbside charger/);
  assert.doesNotMatch(charging, /AI-generated photograph/);
  assert.match(home, /class="road-line"/);
  assert.match(home, /class="hero-scene"/);
  assert.match(home, /class="scene-car"/);
  assert.match(home, /class="ticker"/);
  assert.match(home, /id="wire-pause"/);
  assert.doesNotMatch(home, /No headline yet/);
  assert.match(home, /Kelley Blue Book file headed estimates as of 13 October 2026/);
  assert.match(home, /class="section-icon"/);
  assert.match(home, /class="energy-divider"/);
  assert.match(home, /lang="en"/);
  assert.match(home, /Skip to content/);
  assert.match(home, new RegExp(`rel="canonical" href="${esc(site.url)}/"`));
  assert.match(home, new RegExp(`<title>${esc(site.name)} —`));
  assert.match(home, new RegExp(`"name":"${esc(site.name)}"`));
  assert.doesNotMatch(home, /EV News(?! Desk)/);
  assert.match(home, /name="robots" content="index, follow"/);
  for (const page of [home, about, contact, terms, privacy, disclaimer, charging]) {
    assert.match(page, /name="robots" content="index, follow"/);
    assert.match(page, /rel="canonical" href="https:\/\/evnewsdesk\.com\//);
    assert.match(page, /application\/ld\+json/);
  }
  assert.match(home, /BreadcrumbList/);
  assert.match(home, /"@type":"FAQPage"/);
  assert.match(home, /https:\/\/x\.com\/TheCharismaCat1/);
  assert.doesNotMatch(home, /"sameAs":\[[^\]]*(twitter\.com|facebook\.com|instagram\.com|linkedin\.com)/);
  const faqHtml = home.match(/<section class="faq[\s\S]*?<\/section>/)[0];
  const faqQuestions = [...faqHtml.matchAll(/<h3>([^<]*)<\/h3>/g)].map((match) => decodeAttr(match[1]));
  assert.deepEqual(faqQuestions, faq.map((item) => item.question));
  assert.ok(faqQuestions.length >= 5 && faqQuestions.length <= 6);
  for (const item of faq) {
    for (const part of item.parts) {
      const htmlText = part.text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
      assert.match(faqHtml, new RegExp(esc(htmlText)));
    }
  }
  assert.match(faqHtml, /href="\/disclaimer\/"/);
  assert.match(faqHtml, /href="\/corrections\/"/);
  assert.match(faqHtml, /href="\/contact\/"/);
  assert.match(faqHtml, /href="\/sources-ethics\/"/);
  assert.doesNotMatch(faqHtml, /Joshua|Ventures|Florida/);
  assert.doesNotMatch(home, /NewsArticle/);
  assert.doesNotMatch(home, /noindex|noai|noimageai/i);
  assert.doesNotMatch(home, /Sample draft/);

  for (const name of site.crawlers) assert.match(robots, new RegExp(`User-agent: ${name}`));
  assert.match(robots, /User-agent: \*\s+Allow: \//);
  assert.doesNotMatch(robots, /disallow|noai|noimageai|ads\.txt/i);
  assert.match(robots, new RegExp(`Sitemap: ${esc(site.url)}/sitemap\\.xml`));
  const freshDates = ["2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27"].filter((day) =>
    isFreshNews(day),
  );
  if (freshDates.length) {
    assert.match(robots, /Sitemap: https:\/\/evnewsdesk\.com\/news-sitemap\.xml/);
    assert.match(llms, /news-sitemap\.xml/);
    assert.doesNotMatch(news, /No articles were published in the last two days/);
    assert.match(news, /<url>/);
    if (isFreshNews("2026-10-23")) {
      assert.match(news, /<loc>https:\/\/evnewsdesk\.com\/articles\/2026-10-23-tesla-q3-results\/<\/loc>/);
      assert.match(news, /<news:publication_date>2026-10-23T00:00:00Z<\/news:publication_date>/);
    }
    if (isFreshNews("2026-10-25")) {
      assert.match(
        news,
        /<loc>https:\/\/evnewsdesk\.com\/articles\/2026-10-25-zero-emission-truck-sales\/<\/loc>/,
      );
      assert.match(news, /<news:publication_date>2026-10-25T00:00:00Z<\/news:publication_date>/);
    }
    if (isFreshNews("2026-10-26")) {
      assert.match(
        news,
        /<loc>https:\/\/evnewsdesk\.com\/articles\/2026-10-26-bmw-ix5-460kw-charging\/<\/loc>/,
      );
      assert.match(
        news,
        /<loc>https:\/\/evnewsdesk\.com\/articles\/2026-10-26-rivian-q3-us-ev-sales\/<\/loc>/,
      );
      assert.match(news, /<news:publication_date>2026-10-26T00:00:00Z<\/news:publication_date>/);
    }
    assert.doesNotMatch(news, /ev-range-cold-weather/);
    for (const loc of [...news.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])) {
      const slug = loc.match(/\/articles\/([^/]+)\//)?.[1];
      assert.ok(slug, loc);
      const post = matter(fs.readFileSync(path.join(root, `src/content/posts/${slug}.md`), "utf8")).data;
      assert.notEqual(post.news, false, slug);
      assert.equal(isFreshNews(post.date), true, slug);
    }
  } else {
    assert.doesNotMatch(robots, /news-sitemap/);
    assert.doesNotMatch(llms, /news-sitemap/);
    assert.match(news, /<!-- No articles were published in the last two days. -->/);
    assert.doesNotMatch(news, /<url>/);
  }

  for (const url of [
    `${site.url}/`,
    `${site.url}/about/`,
    `${site.url}/contact/`,
    `${site.url}/terms/`,
    `${site.url}/privacy/`,
    `${site.url}/disclaimer/`,
    `${site.url}/corrections/`,
    `${site.url}/sources-ethics/`,
    `${site.url}/archive/`,
    `${site.url}/data/`,
    `${site.url}/dashboard/`,
    `${site.url}/category/cars/`,
    `${site.url}/category/batteries/`,
    `${site.url}/category/charging/`,
    `${site.url}/category/policy/`,
    `${site.url}/category/industry/`,
    `${site.url}/topics/cars/`,
    `${site.url}/topics/batteries/`,
    `${site.url}/topics/charging/`,
    `${site.url}/topics/policy/`,
    `${site.url}/topics/industry/`,
    `${site.url}/ads.txt`,
  ]) {
    assert.match(sitemap, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(sitemap, /Sample draft|404\.html/);
  for (const loc of [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])) {
    const pathname = new URL(loc).pathname;
    const relative = pathname.endsWith("/") ? `${pathname.slice(1)}index.html` : pathname.slice(1);
    assert.equal(fs.existsSync(path.join(root, "_site", relative)), true, loc);
  }
  assert.match(sitemap, /<loc>https:\/\/evnewsdesk\.com\/articles\/2026-10-25-ev-range-cold-weather\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/evnewsdesk\.com\/articles\/2026-10-26-bmw-ix5-460kw-charging\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/evnewsdesk\.com\/articles\/2026-10-26-jetta-m6-orders\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/evnewsdesk\.com\/articles\/2026-10-27-eved-pay-per-mile-trend\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/evnewsdesk\.com\/articles\/2026-10-25-vw-id-cupra-battery-recall\/<\/loc>/);
  assert.doesNotMatch(sitemap, /tesla-giga-berlin-week|kadena-air-base-byd-vehicle-ban/);
  assert.match(
    sitemap,
    /<loc>https:\/\/evnewsdesk\.com\/articles\/2026-10-25-ev-range-cold-weather\/<\/loc>\s*<lastmod>2026-10-27T00:00:00\.000Z<\/lastmod>/,
  );
  assert.match(sitemap, /<loc>https:\/\/evnewsdesk\.com\/articles\/2026-10-26-ev-charging-cost\/<\/loc>/);
  for (const post of publishedPosts()) {
    const loc = `https://evnewsdesk.com/articles/${post.slug}/`;
    assert.equal(sitemap.includes(`<loc>${loc}</loc>`), true, loc);
    const block = news.split("<url>").find((part) => part.includes(`<loc>${loc}</loc>`));
    const expectNews = post.news && isFreshNews(post.date);
    assert.equal(Boolean(block), expectNews, post.slug);
    if (!expectNews) continue;
    assert.match(block, new RegExp(`<news:publication_date>${post.date}T00:00:00Z</news:publication_date>`));
    assert.match(block, /<news:name>EV News Desk<\/news:name>/);
  }
  assert.doesNotMatch(news, /ev-charging-cost/);
  assert.match(news, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(news, /xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/);
  assert.match(news, /xmlns:news="http:\/\/www.google.com\/schemas\/sitemap-news\/0.9"/);
  assert.match(feed, /<rss version="2.0">/);
  assert.match(atom, /<feed xmlns="http:\/\/www.w3.org\/2005\/Atom">/);
  for (const post of markdownPosts()) {
    if (!isHoldReview(post.status) || isReleasedFile(post.inputPath)) continue;
    const loc = `https://evnewsdesk.com/articles/${post.slug}/`;
    assert.equal(sitemap.includes(`<loc>${loc}</loc>`), false, loc);
    assert.doesNotMatch(feed, new RegExp(esc(post.slug)));
    assert.doesNotMatch(atom, new RegExp(esc(post.slug)));
    assert.doesNotMatch(news, new RegExp(esc(post.slug)));
    assert.doesNotMatch(llms, new RegExp(esc(post.slug)));
    assert.equal(fs.existsSync(path.join(root, "_site", "articles", post.slug, "index.html")), false, post.slug);
  }
  assert.match(feed, /\/articles\/2026-10-26-bmw-ix5-460kw-charging\//);
  assert.match(feed, /\/articles\/2026-10-26-rivian-q3-us-ev-sales\//);
  assert.match(feed, /\/articles\/2026-10-26-cpca-october-nev-forecast\//);
  assert.match(feed, /\/articles\/2026-10-26-foxconn-mitsubishi-electric-mobility\//);
  assert.match(feed, /\/articles\/2026-10-26-jetta-m6-orders\//);
  assert.match(atom, /\/articles\/2026-10-26-bmw-ix5-460kw-charging\//);
  assert.match(atom, /\/articles\/2026-10-26-jetta-m6-orders\//);
  assert.doesNotMatch(feed + atom, /gas-only-cars-below-half/);
  assert.doesNotMatch(feed + atom, /©|<copyright>|Copyright|All rights reserved/);
  assert.doesNotMatch(feed + atom, /Sample draft/);
  assert.match(llms, new RegExp(`^# ${esc(site.name)}`, "m"));
  assert.doesNotMatch(llms, /Joshua|Ventures|Florida/);
  assert.match(llms, /https:\/\/evnewsdesk\.com\//);
  assert.match(llms, /\/articles\/2026-10-23-tesla-q3-results\//);
  assert.match(llms, /\/topics\/charging\//);
  assert.doesNotMatch(llms, /No article has been published yet/);
  assert.doesNotMatch(llms, /EV News(?! Desk)/);
  assert.equal(read("_site", `${site.indexNowKey}.txt`), site.indexNowKey);

  for (const page of [about, contact]) {
    assert.doesNotMatch(page, /Joshua|Ventures|Florida/);
  }
  for (const page of [terms, privacy, disclaimer]) {
    assert.match(page, /Joshua Israel Ventures LLC/);
    assert.match(page, /Florida/);
    assert.equal((page.match(new RegExp(esc(legalNotice), "g")) || []).length, 1);
  }
  assert.match(about, /One sourced story a day on the electric-vehicle beat/);
  assert.match(contact, /do not publish a street address/i);
  assert.doesNotMatch(contact, /Suite|P\.O\. Box|streetAddress/);
  assert.match(home, /href="\/contact\/"/);
  assert.match(home, />Contact Us</);
  assert.match(contact, new RegExp(`<form id="contact-form"[^>]*action="${esc(site.contactFormEndpoint)}"[^>]*method="post"`));
  assert.match(contact, /<label for="contact-name">Name<\/label>/);
  assert.match(contact, /<label for="contact-email">Email<\/label>/);
  assert.match(contact, /<label for="contact-message">Message<\/label>/);
  assert.match(contact, /name="_honey"/);
  assert.match(contact, /name="_captcha" value="false"/);
  assert.match(contact, /name="_next" value="https:\/\/evnewsdesk\.com\/contact\/thanks\/"/);
  assert.match(contact, /name="_ready"/);
  assert.match(contact, /emailed to the site owner only to respond and are not sold/i);
  assert.match(contact, /href="\/privacy\/"/);
  assert.match(contact, /form-action https:\/\/formsubmit\.co/);
  assert.match(home, /form-action 'none'/);
  assert.doesNotMatch(contact, /<button[^>]*disabled/);
  assert.match(contact, /action="https:\/\/formsubmit\.co\/4497ee41a1200e746e967998473d21da"/);
  assert.doesNotMatch(contact, /joshuaofisrael@gmail\.com/);
  const thanks = read("_site", "contact/thanks/index.html");
  assert.match(thanks, /noindex, nofollow/);
  assert.match(thanks, /Thank you/);
  assert.match(thanks, />Contact Us</);
  assert.doesNotMatch(thanks, /joshuaofisrael@gmail\.com/);
  assert.doesNotMatch(sitemap, /contact\/thanks/);
  const corrections = read("_site", "corrections/index.html");
  const ethics = read("_site", "sources-ethics/index.html");
  assert.match(corrections, /Corrections/);
  assert.doesNotMatch(corrections, /Joshua|Ventures|Florida/);
  const legalPages = new Set([
    path.normalize(path.join(root, "_site/terms/index.html")),
    path.normalize(path.join(root, "_site/privacy/index.html")),
    path.normalize(path.join(root, "_site/disclaimer/index.html")),
  ]);
  const identityHits = [];
  for (const file of walk(path.join(root, "_site"))) {
    if (!/\.(html|xml|txt)$/.test(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    if (/Joshua|Ventures/.test(text) && !legalPages.has(path.normalize(file))) identityHits.push(file);
  }
  assert.deepEqual(identityHits, []);
  for (const file of legalPages) {
    assert.match(fs.readFileSync(file, "utf8"), /Joshua Israel Ventures LLC/);
  }
  for (const file of walk(path.join(root, "_site"))) {
    if (!/\.(html|xml|txt)$/.test(file)) continue;
    if (legalPages.has(path.normalize(file))) continue;
    assert.doesNotMatch(fs.readFileSync(file, "utf8"), /©|Copyright|All rights reserved/, file);
  }
  assert.match(ethics, /Sources &amp; Ethics|Sources & Ethics/);
  assert.match(ethics, /AI-generated imagery/);
  assert.match(ethics, /href="\/disclaimer\/"/);
  assert.match(ethics, /do not carry a visible AI caption/);
  assert.doesNotMatch(ethics, /AI-generated photograph/);
  assert.match(disclaimer, /<h2>AI-generated imagery<\/h2>/);
  assert.match(disclaimer, /AI-generated photorealistic illustrations of the subject/);
  assert.match(disclaimer, /do not depict real identifiable people or actual news events/);
  assert.match(disclaimer, /third-party press photo is separately credited/);
  assert.doesNotMatch(disclaimer, /AI-generated photograph/);
  assert.match(home, /href="\/disclaimer\/"/);
  assert.match(ethics, /according to/);
  assert.match(ethics, /Company announcements and press releases are reported as the company’s own statements/);
  assert.match(ethics, /“X says,” “according to X”/);
  assert.match(ethics, /independently verified only when a source other than the company confirms it/);
  assert.match(ethics, /Articles say which is which/);
  assert.match(ethics, /Nothing on the site is a guarantee of an outcome/);
  assert.doesNotMatch(ethics, /legally compliant|in compliance with the law/i);
  assert.match(home, /href="\/sources-ethics\/"/);
  assert.match(home, /href="\/corrections\/"/);
  const header = home.match(/<header class="site-header">[\s\S]*?<\/header>/)[0];
  const topics = header.match(/<nav class="topics"[\s\S]*?<\/nav>/)[0];
  const coverage = home.match(/<nav aria-label="Coverage"[\s\S]*?<\/nav>/)[0];
  const sectionHrefs = [...topics.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(sectionHrefs, [
    "/dashboard/",
    "/topics/cars/",
    "/topics/batteries/",
    "/topics/charging/",
    "/topics/policy/",
    "/topics/industry/",
    "/data/",
  ]);
  assert.equal((header.match(/href="\/dashboard\/"/g) || []).length, 1);
  assert.match(topics, /class="nav-dashboard" href="\/dashboard\/"/);
  assert.match(topics, /EV data<\/a>/);
  const company = header.match(/<nav class="utility"[\s\S]*?<\/nav>/)[0];
  assert.match(company, />About</);
  assert.match(company, />Contact</);
  assert.match(company, /class="utility-closed">Menu</);
  assert.doesNotMatch(company, /\/dashboard\//);
  assert.doesNotMatch(header, /aria-label="View"/);
  assert.match(header, /class="brand" href="\/" aria-current="page"/);
  assert.doesNotMatch(header, /Joshua|Joshua Israel Ventures LLC/);
  assert.doesNotMatch(read("_site", "assets/js/header.js"), /https?:\/\//);
  assert.ok(coverage.indexOf("/topics/industry/") < coverage.indexOf('href="/dashboard/"'));
  assert.ok(coverage.indexOf('href="/dashboard/"') < coverage.indexOf('href="/data/"'));
  assert.ok(coverage.indexOf('href="/data/"') < coverage.indexOf('href="/archive/"'));
  assert.match(coverage, /EV data<\/a>/);
  assert.match(llms, /\/data\//);

  const beacon = `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${site.cloudflareAnalyticsToken}"}'></script>`;
  for (const page of [home, about, privacy, contact, thanks]) {
    assert.match(page, new RegExp(`${esc(beacon)}\\s*</body>`));
    assert.match(
      page,
      /script-src 'self' 'unsafe-inline' https:\/\/static\.cloudflareinsights\.com/,
    );
    const revealAt = page.lastIndexOf("/assets/js/reveal.js");
    const beaconAt = page.lastIndexOf("beacon.min.js");
    assert.ok(revealAt > 0 && revealAt < beaconAt);
    assert.match(page, /beacon.min.js" data-cf-beacon/);
    assert.match(page, /connect-src https:\/\/cloudflareinsights\.com/);
  }
  assert.match(privacy, /cookieless Cloudflare Web Analytics/);
  assert.match(privacy, /https:\/\/policies\.google\.com\/technologies\/ads/);
  assert.match(privacy, /Visitors in the EU and the UK see a consent choice/);
  assert.match(privacy, /Google Analytics 4/);
  assert.match(privacy, new RegExp(`measurement ID ${esc(site.gaMeasurementId)}`));
  assert.match(privacy, /runs only after you accept/);
  assert.match(privacy, /Cookie choices button in the footer/);
  assert.match(privacy, /https:\/\/tools\.google\.com\/dlpage\/gaoptout/);
  assert.match(privacy, /ad storage, ad user data, and ad personalization/);
  const adsenseScript = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${site.adsenseClient}" crossorigin="anonymous"></script>`;
  const adsenseMeta = `<meta name="google-adsense-account" content="${site.adsenseClient}">`;
  for (const page of [home, about, privacy, contact, thanks]) {
    assert.match(page, new RegExp(esc(adsenseScript)));
    assert.match(page, new RegExp(esc(adsenseMeta)));
  }
  assert.equal(
    read("_site", "ads.txt").trim(),
    "google.com, pub-5681559774142917, DIRECT, f08c47fec0942fa0",
  );
  assert.equal(read("_site", "ads.txt").trim().split("\n").length, 1);

  // GA4 is consent-gated: the hosts are in CSP and the inline loader, and the
  // tag is not a parser-fetched script until the visitor accepts. AdSense stays
  // the only advertising script. Other advertising hosts and font CDNs stay banned.
  const banned = [
    "doubleclick",
    "facebook.net",
    "hotjar",
    "segment.com",
    "mixpanel",
    "fonts.googleapis",
    "fonts.gstatic",
    "cdn.jsdelivr",
    "unpkg.com",
    "shutterstock",
    "gettyimages",
    "istockphoto",
    "adobestock",
    "depositphotos",
  ];
  const built = walk(path.join(root, "_site"))
    .filter((file) => /\.(html|css|xml|txt|svg)$/.test(file))
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
  for (const host of banned) assert.equal(built.toLowerCase().includes(host), false, host);
  assert.match(built, /https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=/);
  assert.match(built, /https:\/\/www\.google-analytics\.com/);
  assert.doesNotMatch(built, /<script[^>]*\ssrc=["'][^"']*(?:googletagmanager|google-analytics)\.com/);
  const htmlPages = walk(path.join(root, "_site")).filter((file) => file.endsWith(".html"));
  assert.ok(htmlPages.length > 10);
  for (const file of htmlPages) {
    const pageHtml = fs.readFileSync(file, "utf8");
    assert.match(pageHtml, new RegExp(esc(site.gaMeasurementId)), file);
    assert.match(pageHtml, /mtm-analytics-consent/, file);
    assert.match(pageHtml, /data-consent-open/, file);
    assert.match(pageHtml, /"ad_storage": "denied"/, file);
    assert.match(pageHtml, /"analytics_storage": "denied"/, file);
    assert.match(pageHtml, /"ad_user_data": "denied"/, file);
    assert.match(pageHtml, /"ad_personalization": "denied"/, file);
  }
  const tagRoot = path.join(root, "_site/tags");
  const tagSlugs = fs.readdirSync(tagRoot);
  assert.ok(tagSlugs.length > 10);
  const thinTags = [];
  for (const slug of tagSlugs) {
    const tagHtml = read("_site", `tags/${slug}/index.html`);
    const stories = (tagHtml.match(/class="story-card"/g) || []).length;
    const loc = `${site.url}/tags/${slug}/`;
    if (stories < 3) {
      thinTags.push(slug);
      assert.match(tagHtml, /name="robots" content="noindex,follow"/, slug);
      assert.doesNotMatch(tagHtml, /name="robots" content="index, follow"/, slug);
      assert.equal(sitemap.includes(`<loc>${loc}</loc>`), false, loc);
    } else {
      assert.match(tagHtml, /name="robots" content="index, follow"/, slug);
      assert.equal(sitemap.includes(`<loc>${loc}</loc>`), true, loc);
    }
  }
  assert.ok(thinTags.length > 0);
  for (const desk of site.categories) {
    for (const prefix of ["topics", "category"]) {
      const deskHtml = read("_site", `${prefix}/${desk.slug}/index.html`);
      assert.match(deskHtml, /name="robots" content="index, follow"/, desk.slug);
      assert.equal(sitemap.includes(`<loc>${site.url}/${prefix}/${desk.slug}/</loc>`), true, desk.slug);
    }
  }
  assert.doesNotMatch(built, /joshuaofisrael@gmail\.com/);
  assert.doesNotMatch(built, /data-ad-slot|class="adsbygoogle"|fundingchoices|cookieconsent/i);
  assert.doesNotMatch(built, /AI-generated photograph/);
  assert.doesNotMatch(built, /noai|noimageai/i);
  assert.equal(fs.readFileSync(path.join(root, "CNAME"), "utf8").trim(), "evnewsdesk.com");
  assert.equal(read("_site", "CNAME").trim(), "evnewsdesk.com");
  assert.equal(new URL(site.url).hostname, "evnewsdesk.com");
  const revealJs = read("_site", "assets/js/reveal.js");
  assert.match(revealJs, /IntersectionObserver/);
  assert.match(revealJs, /prefers-reduced-motion/);
  assert.match(read("_site", "404.html"), /noindex/);

  const europeFile = fs.readFileSync(
    path.join(root, "src/content/posts/2026-10-23-europe-september-ev-shares.md"),
    "utf8",
  );
  const europeSummary = europeFile.match(/^summary:\s+"([^"]+)"/m)[1];
  const europeDescription = europeFile.match(/^description:\s+"([^"]+)"/m)[1];
  assert.ok(europeSummary.length > 155);
  assert.ok(europeDescription.length <= 155);
  assert.doesNotMatch(europeDescription, /…/);
  const europe = read("_site", "articles/2026-10-23-europe-september-ev-shares/index.html");
  assert.deepEqual(metaDescriptions(europe), [europeDescription, europeDescription, europeDescription]);
  assert.match(europe, /"description":"France's September electric-car share/);
  assert.match(europe, /it is not law\./);
  assert.doesNotMatch(europeDescription, /it is not law/);
  const homeMeta = metaDescription("", site.description);
  assert.deepEqual(metaDescriptions(home), [homeMeta, homeMeta, homeMeta]);
  assert.match(home, new RegExp(`"description":"${esc(site.description)}"`));
  const seenMeta = new Map();
  for (const file of walk(path.join(root, "_site")).filter((name) => name.endsWith(".html"))) {
    const html = fs.readFileSync(file, "utf8");
    const texts = metaDescriptions(html);
    assert.equal(texts.length, 3, file);
    for (const text of texts) assert.ok(text.length <= 155, `${file} description is ${text.length} characters`);
    const titleMatch = html.match(/<title>([^<]*)<\/title>/);
    assert.ok(titleMatch, file);
    const pageTitle = decodeAttr(titleMatch[1]);
    assert.ok(pageTitle.length <= 155, `${file} title is ${pageTitle.length} characters: ${pageTitle}`);
    assert.equal(texts[0], texts[1], file);
    assert.equal(texts[0], texts[2], file);
    const previous = seenMeta.get(texts[0]);
    assert.equal(previous, undefined, `${file} repeats the meta description of ${previous}: ${texts[0]}`);
    seenMeta.set(texts[0], file);
  }

  const dash = read("_site", "data/index.html");
  const dashTitle = decodeAttr(dash.match(/<title>([^<]*)<\/title>/)[1]);
  const dashSummary = matter(fs.readFileSync(path.join(root, "src/data.njk"), "utf8")).data.summary;
  assert.ok(dashTitle.length <= 60, dashTitle);
  assert.equal(dashTitle, "EV data dashboard — EV News Desk");
  assert.deepEqual(metaDescriptions(dash), [dashSummary, dashSummary, dashSummary]);
  assert.match(dash, /rel="canonical" href="https:\/\/evnewsdesk\.com\/data\/"/);
  assert.match(dash, /property="og:url" content="https:\/\/evnewsdesk\.com\/data\/"/);
  assert.match(dash, /property="og:title" content="EV data dashboard — EV News Desk"/);
  assert.match(dash, /property="og:site_name" content="EV News Desk"/);
  assert.match(dash, /"@type":"Dataset"/);
  assert.match(dash, /Last updated/);
  assert.match(dash, new RegExp(`datetime="${esc(dashboardData.updated)}"`));
  for (const slug of new Set(dashboardData.figures.map((figure) => figure.articleSlug))) {
    assert.match(dash, new RegExp(`/articles/${esc(slug)}/`), slug);
  }
  assert.match(dash, /They are not real-time, and they are not advice/);
  assert.match(dash, /Company statement/);
  assert.match(dash, /Independent source/);
  assert.match(dash, /Sum of company figures/);
  assert.match(dash, /486,532/);
  assert.match(dash, /23,029/);
  assert.match(dash, /98\.8/);
  assert.match(dash, /34\.5/);
  assert.match(dash, /https:\/\/www\.kba\.de\/DE\/Presse\/Pressemitteilungen\/Fahrzeugzulassungen\/2026\/pm41_2026_n_09_26_pm_komplett\.html/);
  assert.match(dash, /<table/);
  assert.match(dash, /aria-hidden="true"/);
  assert.doesNotMatch(dash, /\sstyle="/);
  const dashMain = dash.match(/<main\b[^>]*>([\s\S]*)<\/main>/)[1];
  assert.doesNotMatch(dashMain, /Joshua/);
  assert.match(dash, /<nav class="topics"[\s\S]*href="\/data\/" aria-current="page"/);
  assert.match(dash, /EV data<\/a>/);
  assert.match(dash, /2027 Mustang Mach-E starting price/);
  assert.doesNotMatch(dash, /with destination/);
  assert.match(dash, /The PDF prints no publication day\. October 23, 2026 is the day the story recorded the file\./);

  const room = read("_site", "dashboard/index.html");
  const roomTitle = decodeAttr(room.match(/<title>([^<]*)<\/title>/)[1]);
  const roomSummary =
    "Published stories, newest first: a lead photo, a dated list, each category's latest, and recent updates.";
  assert.ok(roomTitle.length <= 60, roomTitle);
  assert.equal(roomTitle, "Newsroom dashboard — EV News Desk");
  assert.deepEqual(metaDescriptions(room), [roomSummary, roomSummary, roomSummary]);
  assert.match(room, /rel="canonical" href="https:\/\/evnewsdesk\.com\/dashboard\/"/);
  assert.match(room, /property="og:url" content="https:\/\/evnewsdesk\.com\/dashboard\/"/);
  assert.match(room, /property="og:title" content="Newsroom dashboard — EV News Desk"/);
  assert.match(room, /property="og:site_name" content="EV News Desk"/);
  assert.match(room, /"@type":"CollectionPage"/);
  assert.match(room, /class="nav-dashboard" href="\/dashboard\/" aria-current="page"/);
  assert.doesNotMatch(room, /aria-label="View"/);
  const roomHeaderNav = room.match(/<header class="site-header">[\s\S]*?<\/header>/)[0];
  assert.equal((roomHeaderNav.match(/href="\/dashboard\/"/g) || []).length, 1);
  const stories = publishedPosts();
  const lead = stories[0];
  const leadHtml = room.match(/<article class="lead-story">[\s\S]*?<\/article>/)[0];
  const leadSources = `${lead.sources} source${lead.sources === 1 ? "" : "s"}`;
  assert.match(leadHtml, new RegExp(`/articles/${esc(lead.slug)}/`));
  assert.match(leadHtml, new RegExp(`${esc(lead.hero)}\\.webp`));
  assert.match(leadHtml, new RegExp(esc(leadSources)));
  assert.match(room, /width="1280" height="720"/);
  assert.match(room, /loading="eager"/);
  assert.match(room, /loading="lazy"/);
  for (const story of stories) {
    assert.match(room, new RegExp(`/articles/${esc(story.slug)}/`), story.slug);
  }
  const later = stories.filter((story) => story.date > "2026-10-24");
  assert.ok(later.length > 0);
  assert.ok(later.some((story) => story.slug === lead.slug));
  const newestUpdate = [...stories].sort((a, b) => {
    const delta = b.updatedAt.localeCompare(a.updatedAt);
    if (delta) return delta;
    const dated = b.date.localeCompare(a.date);
    if (dated) return dated;
    return b.inputPath.localeCompare(a.inputPath);
  })[0];
  assert.match(room, /Recently updated/);
  assert.match(room, new RegExp(`Updated ${esc(formatDisplayDate(newestUpdate.updatedAt))}`));
  assert.match(room, /41\.7/);
  assert.match(room, /href="\/data\/"/);
  assert.match(room, /href="\/sources-ethics\/"/);
  assert.match(room, /href="\/corrections\/"/);
  assert.match(room, /src="\/assets\/js\/newsroom\.js"/);
  assert.doesNotMatch(room, /Sample draft|sample-cars-hero/);
  assert.doesNotMatch(room, /\sstyle="/);
  const roomHeader = room.match(/<header class="site-header">[\s\S]*?<\/header>/)[0];
  const roomMain = room.match(/<main\b[^>]*>([\s\S]*)<\/main>/)[1];
  assert.doesNotMatch(`${roomHeader}\n${roomMain}`, /Joshua|Joshua Israel Ventures LLC/);
  assert.doesNotMatch(read("_site", "assets/js/newsroom.js"), /https?:\/\//);

  const preview = runEleventy(["--output=_site-preview"], { ELEVENTY_ENV: "development" });
  assert.equal(preview.status, 0, preview.stdout + preview.stderr);
  for (const post of markdownPosts()) {
    if (!isHoldReview(post.status) || isReleasedFile(post.inputPath)) continue;
    assert.equal(
      fs.existsSync(path.join(root, "_site-preview", "articles", post.slug, "index.html")),
      false,
      post.slug,
    );
  }
  const draft = read(
    "_site-preview",
    "articles/2026-10-22-sample-cars-template/index.html",
  );
  assert.match(draft, /EV News Desk/);
  assert.match(draft, /id="sources-heading"/);
  assert.match(draft, /https:\/\/www\.fueleconomy\.gov\/feg\/evtech\.shtml/);
  assert.match(draft, /Unpublished draft/);
  assert.match(draft, /noindex, nofollow/);
  assert.match(draft, /NewsArticle/);
  assert.doesNotMatch(draft, /Joshua|Ventures|PostalAddress/);
  assert.match(draft, /"name":"EV News Desk"/);
  assert.match(draft, />sample</);
  assert.match(draft, /Last updated/);
  assert.match(draft, /datetime="2026-10-22/);
  assert.match(draft, /"dateModified":"2026-10-22T00:00:00\.000Z"/);
  assert.match(draft, /class="image-slot"/);
  assert.match(draft, /src\/assets\/images\/sample-cars-hero\.webp/);
  assert.match(draft, /src\/assets\/images\/sample-cars-hero\.avif/);
  assert.match(draft, /src\/assets\/images\/sample-cars-port\.webp/);
  assert.match(draft, /src\/assets\/images\/sample-cars-cabin\.webp/);
  assert.doesNotMatch(draft, /<img /);
  assert.doesNotMatch(draft, /AI-generated photograph/);
  assert.doesNotMatch(draft, /AI-generated illustration|Original illustration/);
  const portAt = draft.indexOf("sample-cars-port.webp");
  const citationAt = draft.indexOf("How an inline citation is written");
  assert.ok(portAt > 0 && citationAt > portAt);
  const chargingDraft = read(
    "_site-preview",
    "articles/2026-10-21-sample-charging-template/index.html",
  );
  assert.match(chargingDraft, /class="image-slot"/);
  assert.match(chargingDraft, /src\/assets\/images\/sample-charging-hero\.webp/);
  assert.match(chargingDraft, /src\/assets\/images\/sample-charging-stall\.webp/);
  assert.match(chargingDraft, /src\/assets\/images\/sample-charging-plug\.webp/);
  assert.doesNotMatch(chargingDraft, /AI-generated photograph/);
  assert.doesNotMatch(chargingDraft, /<img /);

  const story = read("_site", "articles/2026-10-23-tesla-q3-results/index.html");
  assert.match(story, /href="\/topics\/industry\/" aria-current="page"/);
  const storyRelated = story.match(/<section class="related"[\s\S]*?<\/section>/)[0];
  assert.match(storyRelated, /Related stories/);
  assert.match(storyRelated, /href="\/articles\/2026-10-27-xpeng-vw-robotaxi-permits\/"/);
  assert.match(storyRelated, /href="\/articles\/2026-10-27-chinese-brands-overtake-japanese-europe\/"/);
  assert.match(storyRelated, /href="\/articles\/2026-10-26-rivian-q3-us-ev-sales\/"/);
  assert.match(storyRelated, /href="\/articles\/2026-10-26-foxconn-mitsubishi-electric-mobility\/"/);
  assert.match(storyRelated, /href="\/articles\/2026-10-26-cpca-october-nev-forecast\/"/);
  assert.equal((storyRelated.match(/href="\/articles\//g) || []).length, 5);
  assert.doesNotMatch(storyRelated, /volvo-q3-results|byd-camacari-capacity/);
  assert.doesNotMatch(storyRelated, /tesla-q3-results|Joshua|©/);
  const carsStory = read("_site", "articles/2026-10-23-ford-mach-e-trail/index.html");
  const carsRelated = carsStory.match(/<section class="related"[\s\S]*?<\/section>/)[0];
  const carsRelatedCount = (carsRelated.match(/href="\/articles\//g) || []).length;
  assert.ok(carsRelatedCount >= 3 && carsRelatedCount <= 5, String(carsRelatedCount));
  assert.doesNotMatch(carsRelated, /ford-mach-e-trail|chargepoint|catl-baic|europe-september/);
  const batteryStory = read("_site", "articles/2026-10-23-catl-baic-battery-swap/index.html");
  const batteryRelated = batteryStory.match(/<section class="related"[\s\S]*?<\/section>/)[0];
  assert.match(batteryRelated, /href="\/articles\/2026-10-25-nio-firefly-60-kwh\/"/);
  assert.match(batteryRelated, /href="\/articles\/2026-10-26-li-auto-i6-range-test\/"/);
  assert.equal((batteryRelated.match(/href="\/articles\//g) || []).length, 2);
  assert.match(batteryRelated, /href="\/topics\/batteries\/"/);
  for (const story of stories) {
    const html = read("_site", `articles/${story.slug}/index.html`);
    const main = html.match(/<main\b[^>]*>([\s\S]*)<\/main>/)[1];
    assert.match(main, /href="\/topics\/[a-z]+\/"/, story.slug);
    const articleLinks = new Set(main.match(/href="\/articles\/[^"]+"/g) || []);
    assert.ok(articleLinks.size >= 2, `${story.slug} has ${articleLinks.size} related article links`);
    assert.equal(articleLinks.has(`href="/articles/${story.slug}/"`), false, story.slug);
  }
  const explainer = read("_site", "articles/2026-10-25-ev-range-cold-weather/index.html");
  assert.match(explainer, /"@type":"Article"/);
  assert.doesNotMatch(explainer, /"@type":"NewsArticle"/);
  assert.match(explainer, /This is not financial, tax, or investment advice/);
  assert.match(explainer, /39\.0 percent/);
  assert.match(explainer, /https:\/\/www\.fueleconomy\.gov\/feg\/coldweather\.shtml/);
  assert.doesNotMatch(explainer, /AI-generated photograph/);
  const chargingCost = read("_site", "articles/2026-10-26-ev-charging-cost/index.html");
  assert.match(chargingCost, /"@type":"Article"/);
  assert.doesNotMatch(chargingCost, /"@type":"NewsArticle"/);
  assert.match(chargingCost, /This is not financial, tax, or investment advice/);
  assert.match(chargingCost, /18\.16 cents/);
  assert.match(chargingCost, /\$45\.50/);
  assert.match(chargingCost, /https:\/\/www\.fueleconomy\.gov\/feg\/charging\.shtml/);
  assert.match(chargingCost, /https:\/\/afdc\.energy\.gov\/fuels\/electricity-charging-home/);
  assert.match(chargingCost, /https:\/\/www\.eia\.gov\/electricity\/monthly\/update\/print-version\.php/);
  assert.match(chargingCost, /href="\/topics\/charging\/"/);
  assert.match(chargingCost, /href="\/articles\/2026-10-25-ev-range-cold-weather\/"/);
  assert.match(chargingCost, /"name":"EV News Desk"/);
  assert.doesNotMatch(chargingCost, /AI-generated photograph|Joshua|Ventures/);
  const chargingJson = JSON.parse(chargingCost.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(chargingJson["@graph"].some((node) => node["@type"] === "NewsArticle"), false);
  assert.equal(
    chargingJson["@graph"].find((node) => node["@type"] === "Article").headline,
    "What it costs to charge an electric car at home",
  );
  const chargingHub = read("_site", "topics/charging/index.html");
  assert.match(chargingHub, /EV charging news: home, workplace, and public charging/);
  assert.match(chargingHub, /<title>EV charging news — EV News Desk<\/title>/);
  assert.match(chargingHub, /aria-label="Other desks"/);
  assert.match(chargingHub, /href="\/topics\/cars\/"/);
  const chargingList = chargingHub.match(/<ul class="story-list"[\s\S]*?<\/ul>/)[0];
  assert.match(chargingList, /href="\/articles\/2026-10-26-bmw-ix5-460kw-charging\/"/);
  assert.match(chargingList, /href="\/articles\/2026-10-24-chargepoint-us-dc-fast-ports\/"/);
  assert.match(chargingList, /href="\/articles\/2026-10-24-chery-volt-dragon-charging\/"/);
  assert.match(chargingList, /href="\/articles\/2026-10-23-laz-evercharge-apartment-charging\/"/);
  assert.match(chargingList, /href="\/articles\/2026-10-26-ev-charging-cost\/"/);
  assert.equal((chargingList.match(/href="\/articles\//g) || []).length, 7);
  assert.match(chargingHub, /rel="canonical" href="https:\/\/evnewsdesk\.com\/topics\/charging\/"/);
  assert.match(chargingHub, /"name":"EV News Desk"/);
  assert.match(chargingHub, /"@type":"CollectionPage"/);
  assert.doesNotMatch(chargingHub, /Joshua|Ventures|©|Sample draft/);
  const carsHub = read("_site", "topics/cars/index.html");
  const carsList = carsHub.match(/<ul class="story-list"[\s\S]*?<\/ul>/)[0];
  assert.equal((carsList.match(/href="\/articles\//g) || []).length, 11);
  assert.match(carsList, /href="\/articles\/2026-10-26-jetta-m6-orders\/"/);
  assert.match(carsList, /href="\/articles\/2026-10-25-ev-range-cold-weather\/"/);
  assert.match(carsList, /href="\/articles\/2026-10-25-vw-id-cupra-battery-recall\/"/);
  assert.doesNotMatch(carsList, /tesla-giga-berlin-week/);
  const listedStories = (file) =>
    (read("_site", file).match(/<ul class="story-list"[\s\S]*?<\/ul>/)[0].match(/href="\/articles\//g) || []).length;
  assert.equal(listedStories("topics/batteries/index.html"), 3);
  assert.equal(listedStories("topics/policy/index.html"), 4);
  const policyList = read("_site", "topics/policy/index.html").match(/<ul class="story-list"[\s\S]*?<\/ul>/)[0];
  assert.match(policyList, /href="\/articles\/2026-10-27-eved-pay-per-mile-trend\/"/);
  assert.doesNotMatch(policyList, /kadena-air-base-byd-vehicle-ban/);
  assert.equal(listedStories("topics/industry/index.html"), 10);
  assert.match(
    read("_site", "topics/industry/index.html"),
    /href="\/articles\/2026-10-26-rivian-q3-us-ev-sales\/"/,
  );
  assert.doesNotMatch(carsHub, /sample-cars|Sample draft|Joshua/);
  for (const slug of ["cars", "batteries", "charging", "policy", "industry"]) {
    const hub = read("_site", `topics/${slug}/index.html`);
    assert.match(hub, new RegExp(`href="/topics/${slug}/" aria-current="page"`));
  }
  assert.match(
    story,
    /src="\/assets\/images\/tesla-q3-hero\.webp" alt="[^"]+" width="1280" height="720" loading="eager" decoding="async" fetchpriority="high"/,
  );
  assert.match(story, /\/assets\/images\/tesla-q3-hero\.avif/);
  assert.match(
    story,
    /src="\/assets\/images\/tesla-q3-storage\.webp" alt="[^"]+" width="1280" height="720" loading="lazy"/,
  );
  assert.doesNotMatch(story, /<figcaption>[^<]*AI-generated image/);
  assert.equal(fs.existsSync(path.join(root, "_site/assets/images/tesla-q3-hero.webp")), true);
  assert.equal(fs.existsSync(path.join(root, "_site/assets/images/tesla-q3-hero.avif")), true);
});
