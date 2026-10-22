import { absoluteUrl } from "./site-url.js";

const ENDPOINT = "https://api.indexnow.org/indexnow";

export function isPlaceholderSiteUrl(siteUrl) {
  const host = new URL(siteUrl).hostname.toLowerCase();
  return (
    host === "example.com" ||
    host.endsWith(".example.com") ||
    host === "example.org" ||
    host.endsWith(".example.org") ||
    host === "localhost" ||
    host.endsWith(".localhost")
  );
}

export function indexNowKeyLocation(siteUrl, key) {
  return absoluteUrl(siteUrl, `/${key}.txt`);
}

export function urlsFromSitemap(xml) {
  return [...String(xml).matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) =>
    match[1]
      .trim()
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'"),
  );
}

export function buildIndexNowBody({ siteUrl, key, urls }) {
  return {
    host: new URL(siteUrl).hostname,
    key,
    keyLocation: indexNowKeyLocation(siteUrl, key),
    urlList: urls,
  };
}

export function indexNowRequests({ siteUrl, key, urls }) {
  const chunks = [];
  for (let index = 0; index < urls.length; index += 10000) {
    chunks.push(buildIndexNowBody({ siteUrl, key, urls: urls.slice(index, index + 10000) }));
  }
  return chunks.map((body) => ({ endpoint: ENDPOINT, body }));
}
