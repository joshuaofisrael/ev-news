import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import site from "../src/_data/site.js";

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
  const copyright = `© ${site.year} ${site.operator}. All rights reserved. ${site.name} is owned and operated by ${site.operator}.`;

  assert.match(home, new RegExp(copyright.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(home, /No story has been published yet/);
  assert.match(home, /lang="en"/);
  assert.match(home, /Skip to content/);
  assert.match(home, new RegExp(`rel="canonical" href="${esc(site.url)}/"`));
  assert.match(home, new RegExp(`<title>${esc(site.name)} —`));
  assert.match(home, new RegExp(`"name":"${esc(site.name)}"`));
  assert.doesNotMatch(home, /EV News(?! Desk)/);
  assert.match(home, /name="robots" content="index, follow"/);
  assert.match(home, /BreadcrumbList/);
  assert.match(home, /Joshua Israel Ventures LLC/);
  assert.doesNotMatch(home, /NewsArticle/);
  assert.doesNotMatch(home, /noindex|noai|noimageai/i);
  assert.doesNotMatch(home, /Sample draft/);

  for (const name of site.crawlers) assert.match(robots, new RegExp(`User-agent: ${name}`));
  assert.match(robots, /User-agent: \*\s+Allow: \//);
  assert.doesNotMatch(robots, /disallow|noai|noimageai|ads\.txt/i);
  assert.match(robots, new RegExp(`Sitemap: ${esc(site.url)}/sitemap\\.xml`));
  assert.doesNotMatch(robots, /news-sitemap/);
  assert.doesNotMatch(llms, /news-sitemap/);

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
    `${site.url}/category/cars/`,
    `${site.url}/category/batteries/`,
    `${site.url}/category/charging/`,
    `${site.url}/category/policy/`,
    `${site.url}/category/industry/`,
    `${site.url}/ads.txt`,
  ]) {
    assert.match(sitemap, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(sitemap, /Sample draft|404\.html/);
  assert.match(news, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(news, /xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/);
  assert.match(news, /xmlns:news="http:\/\/www.google.com\/schemas\/sitemap-news\/0.9"/);
  assert.match(news, /<!-- No articles were published in the last two days. -->/);
  assert.doesNotMatch(news, /<url>/);
  assert.doesNotMatch(news, /<news:title>/);
  assert.match(feed, /<rss version="2.0">/);
  assert.match(atom, /<feed xmlns="http:\/\/www.w3.org\/2005\/Atom">/);
  assert.doesNotMatch(feed + atom, /Sample draft/);
  assert.match(llms, new RegExp(`^# ${esc(site.name)}`, "m"));
  assert.match(llms, /Joshua Israel Ventures LLC/);
  assert.match(llms, /https:\/\/evnewsdesk\.com\//);
  assert.match(llms, /No article has been published yet/);
  assert.doesNotMatch(llms, /EV News(?! Desk)/);
  assert.equal(read("_site", `${site.indexNowKey}.txt`), site.indexNowKey);

  for (const page of [about, contact, terms, privacy, disclaimer]) {
    assert.match(page, /Joshua Israel Ventures LLC/);
    assert.match(page, /Florida/);
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
  assert.match(corrections, /Joshua Israel Ventures LLC/);
  assert.match(ethics, /Sources &amp; Ethics|Sources & Ethics/);
  assert.match(ethics, /AI-generated image/);
  assert.match(ethics, /according to/);
  assert.match(home, /href="\/sources-ethics\/"/);
  assert.match(home, /href="\/corrections\/"/);

  const beacon = `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${site.cloudflareAnalyticsToken}"}'></script>`;
  for (const page of [home, about, privacy, contact, thanks]) {
    assert.match(page, new RegExp(`${esc(beacon)}\\s*</body>`));
    assert.match(
      page,
      /script-src 'unsafe-inline' https:\/\/static\.cloudflareinsights\.com/,
    );
    assert.match(page, /connect-src https:\/\/cloudflareinsights\.com/);
  }
  assert.match(privacy, /cookieless Cloudflare Web Analytics/);
  assert.match(privacy, /https:\/\/policies\.google\.com\/technologies\/ads/);
  assert.match(privacy, /Visitors in the EU and the UK see a consent choice/);
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

  // Other advertising hosts and font CDNs stay banned. The AdSense loader above
  // is the only advertising script, and pages do not include ad units.
  const banned = [
    "googletagmanager",
    "google-analytics",
    "doubleclick",
    "facebook.net",
    "hotjar",
    "segment.com",
    "mixpanel",
    "fonts.googleapis",
    "fonts.gstatic",
    "cdn.jsdelivr",
    "unpkg.com",
  ];
  const built = walk(path.join(root, "_site"))
    .filter((file) => /\.(html|css|xml|txt|svg)$/.test(file))
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
  for (const host of banned) assert.equal(built.toLowerCase().includes(host), false, host);
  assert.doesNotMatch(built, /joshuaofisrael@gmail\.com/);
  assert.doesNotMatch(built, /data-ad-slot|class="adsbygoogle"|fundingchoices|cookieconsent/i);
  assert.doesNotMatch(built, /noai|noimageai/i);
  assert.equal(fs.readFileSync(path.join(root, "CNAME"), "utf8").trim(), "evnewsdesk.com");
  assert.equal(read("_site", "CNAME").trim(), "evnewsdesk.com");
  assert.equal(new URL(site.url).hostname, "evnewsdesk.com");

  const preview = runEleventy(["--output=_site-preview"], { ELEVENTY_ENV: "development" });
  assert.equal(preview.status, 0, preview.stdout + preview.stderr);
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
  assert.match(draft, /"name":"Joshua Israel Ventures LLC"/);
  assert.match(draft, />sample</);
  assert.match(draft, /Last updated/);
  assert.match(draft, /datetime="2026-10-22/);
  assert.match(draft, /"dateModified":"2026-10-22T00:00:00\.000Z"/);
});
