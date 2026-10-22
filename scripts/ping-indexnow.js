import fs from "node:fs";
import path from "node:path";
import site from "../src/_data/site.js";
import {
  buildIndexNowBody,
  indexNowRequests,
  isPlaceholderSiteUrl,
  urlsFromSitemap,
} from "../lib/indexnow.js";

const dryRun = process.argv.includes("--dry-run");
const sitemapPath = path.resolve(process.argv.find((arg) => arg.startsWith("--sitemap="))?.slice("--sitemap=".length) || "_site/sitemap.xml");

if (isPlaceholderSiteUrl(site.url)) {
  console.log(
    `IndexNow skipped: site url is still the placeholder (${site.url}). Set url in src/_data/site.js, deploy, then run npm run indexnow.`,
  );
  process.exit(0);
}

if (!fs.existsSync(sitemapPath)) {
  console.error(`Missing ${sitemapPath}. Run npm run build first.`);
  process.exit(1);
}

const urls = urlsFromSitemap(fs.readFileSync(sitemapPath, "utf8"));
if (!urls.length) {
  console.error("Sitemap has no URLs to submit.");
  process.exit(1);
}

const host = new URL(site.url).hostname;
const foreign = urls.filter((url) => {
  try {
    return new URL(url).hostname !== host;
  } catch {
    return true;
  }
});
if (foreign.length) {
  console.error(`Sitemap URLs must use ${host}:\n${foreign.join("\n")}`);
  process.exit(1);
}

const requests = indexNowRequests({ siteUrl: site.url, key: site.indexNowKey, urls });
if (dryRun) {
  console.log(JSON.stringify(requests, null, 2));
  process.exit(0);
}

let failed = false;
for (const request of requests) {
  const response = await fetch(request.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(request.body),
    signal: AbortSignal.timeout(20000),
  });
  const preview = buildIndexNowBody({
    siteUrl: site.url,
    key: site.indexNowKey,
    urls: request.body.urlList.slice(0, 3),
  });
  console.log(
    `IndexNow ${response.status} for ${request.body.urlList.length} URL(s). Key location: ${preview.keyLocation}`,
  );
  if (response.status >= 400) {
    failed = true;
    console.error(await response.text());
  }
}

process.exit(failed ? 1 : 0);
