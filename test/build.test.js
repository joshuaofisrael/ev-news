import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { metaDescription } from "../lib/meta-description.js";
import site from "../src/_data/site.js";
import { isFreshNews } from "../lib/dates.js";

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
  assert.match(home, new RegExp(`<a href="/terms/">© ${site.year} ${esc(site.name)}</a>`));
  assert.doesNotMatch(home, /Joshua|Ventures/);
  assert.match(home, /\/articles\/2026-10-23-tesla-q3-results\//);
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
  assert.match(home, /Tesla&#39;s third-quarter revenue stayed near/);
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
  assert.doesNotMatch(home, /NewsArticle/);
  assert.doesNotMatch(home, /noindex|noai|noimageai/i);
  assert.doesNotMatch(home, /Sample draft/);

  for (const name of site.crawlers) assert.match(robots, new RegExp(`User-agent: ${name}`));
  assert.match(robots, /User-agent: \*\s+Allow: \//);
  assert.doesNotMatch(robots, /disallow|noai|noimageai|ads\.txt/i);
  assert.match(robots, new RegExp(`Sitemap: ${esc(site.url)}/sitemap\\.xml`));
  if (isFreshNews("2026-10-23")) {
    assert.match(robots, /Sitemap: https:\/\/evnewsdesk\.com\/news-sitemap\.xml/);
    assert.match(llms, /news-sitemap\.xml/);
    assert.match(news, /<loc>https:\/\/evnewsdesk\.com\/articles\/2026-10-23-tesla-q3-results\/<\/loc>/);
    assert.match(news, /<news:publication_date>2026-10-23T00:00:00Z<\/news:publication_date>/);
    assert.doesNotMatch(news, /No articles were published in the last two days/);
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
    `${site.url}/ads.txt`,
  ]) {
    assert.match(sitemap, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(sitemap, /Sample draft|404\.html/);
  assert.match(news, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(news, /xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/);
  assert.match(news, /xmlns:news="http:\/\/www.google.com\/schemas\/sitemap-news\/0.9"/);
  assert.match(feed, /<rss version="2.0">/);
  assert.match(atom, /<feed xmlns="http:\/\/www.w3.org\/2005\/Atom">/);
  assert.doesNotMatch(feed + atom, /Sample draft/);
  assert.match(llms, new RegExp(`^# ${esc(site.name)}`, "m"));
  assert.doesNotMatch(llms, /Joshua|Ventures|Florida/);
  assert.match(llms, /https:\/\/evnewsdesk\.com\//);
  assert.match(llms, /\/articles\/2026-10-23-tesla-q3-results\//);
  assert.doesNotMatch(llms, /No article has been published yet/);
  assert.doesNotMatch(llms, /EV News(?! Desk)/);
  assert.equal(read("_site", `${site.indexNowKey}.txt`), site.indexNowKey);

  for (const page of [about, contact]) {
    assert.doesNotMatch(page, /Joshua|Ventures|Florida/);
  }
  for (const page of [terms, privacy, disclaimer]) {
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
    "/category/cars/",
    "/category/batteries/",
    "/category/charging/",
    "/category/policy/",
    "/category/industry/",
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
  assert.ok(coverage.indexOf("/category/industry/") < coverage.indexOf('href="/dashboard/"'));
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

  const europeSummary = fs
    .readFileSync(path.join(root, "src/content/posts/2026-10-23-europe-september-ev-shares.md"), "utf8")
    .match(/^summary:\s+"([^"]+)"/m)[1];
  assert.ok(europeSummary.length > 155);
  const europeMeta = metaDescription(europeSummary);
  assert.ok(europeMeta.length <= 155);
  assert.ok(europeMeta.endsWith("…"));
  assert.equal(europeSummary[europeMeta.length - 1], " ");
  const europe = read("_site", "articles/2026-10-23-europe-september-ev-shares/index.html");
  assert.deepEqual(metaDescriptions(europe), [europeMeta, europeMeta, europeMeta]);
  assert.match(europe, /"description":"France's September electric-car share/);
  assert.match(europe, /it is not law\./);
  assert.doesNotMatch(europeMeta, /it is not law/);
  const homeMeta = metaDescription("", site.description);
  assert.deepEqual(metaDescriptions(home), [homeMeta, homeMeta, homeMeta]);
  assert.match(home, new RegExp(`"description":"${esc(site.description)}"`));
  for (const file of walk(path.join(root, "_site")).filter((name) => name.endsWith(".html"))) {
    const texts = metaDescriptions(fs.readFileSync(file, "utf8"));
    assert.equal(texts.length, 3, file);
    for (const text of texts) assert.ok(text.length <= 155, `${file} description is ${text.length} characters`);
  }

  const dash = read("_site", "data/index.html");
  const dashTitle = decodeAttr(dash.match(/<title>([^<]*)<\/title>/)[1]);
  const dashSummary =
    "Sourced figures from the 23 and 24 October 2026 stories. Each number names its publisher and date. Not real-time, and not advice.";
  assert.ok(dashTitle.length <= 60, dashTitle);
  assert.equal(dashTitle, "EV data dashboard — EV News Desk");
  assert.deepEqual(metaDescriptions(dash), [dashSummary, dashSummary, dashSummary]);
  assert.match(dash, /rel="canonical" href="https:\/\/evnewsdesk\.com\/data\/"/);
  assert.match(dash, /property="og:url" content="https:\/\/evnewsdesk\.com\/data\/"/);
  assert.match(dash, /property="og:title" content="EV data dashboard — EV News Desk"/);
  assert.match(dash, /property="og:site_name" content="EV News Desk"/);
  assert.match(dash, /"@type":"Dataset"/);
  assert.match(dash, /Last updated/);
  assert.match(dash, /datetime="2026-10-24"/);
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
  assert.match(room, /volvo-q3-hero\.webp/);
  assert.match(room, /width="1280" height="720"/);
  assert.match(room, /loading="eager"/);
  assert.match(room, /loading="lazy"/);
  assert.match(room, /class="story-title"><a href="\/articles\/2026-10-24-volvo-q3-results\/">/);
  assert.match(room, /3 sources/);
  assert.match(room, /Recently updated/);
  assert.match(room, /Updated October 24, 2026/);
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
  assert.match(story, /href="\/category\/industry\/" aria-current="page"/);
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
