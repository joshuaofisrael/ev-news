import { isFreshNews, toW3cDate } from "./dates.js";
import { absoluteUrl } from "./site-url.js";

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function freshNewsPosts(posts, now = Date.now()) {
  return (posts || []).filter((post) => isFreshNews(post?.date, now));
}

export function renderNewsSitemap({ posts, site, now = Date.now() }) {
  const urls = freshNewsPosts(posts, now).map((post) => {
    const keywords = (post.data?.tags || []).filter(
      (tag) => typeof tag === "string" && tag.trim() && tag !== "post",
    );
    const keywordLine = keywords.length
      ? `\n      <news:keywords>${xmlEscape(keywords.join(", "))}</news:keywords>`
      : "";
    return `  <url>
    <loc>${xmlEscape(absoluteUrl(site.url, post.url))}</loc>
    <news:news>
      <news:publication>
        <news:name>${xmlEscape(site.name)}</news:name>
        <news:language>${xmlEscape(site.language || "en")}</news:language>
      </news:publication>
      <news:publication_date>${xmlEscape(toW3cDate(post.date))}</news:publication_date>
      <news:title>${xmlEscape(post.data?.title || "")}</news:title>${keywordLine}
    </news:news>
  </url>`;
  });
  const body = urls.length
    ? urls.join("\n")
    : "<!-- No articles were published in the last two days. -->";
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${body}
</urlset>
`;
}
