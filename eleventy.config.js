import fs from "node:fs";
import site from "./src/_data/site.js";
import { formatDisplayDate, isFreshNews, toIso, toRfc822 } from "./lib/dates.js";
import { freshNewsPosts, renderNewsSitemap } from "./lib/news-sitemap.js";
import { absoluteUrl, pathPrefixFromSiteUrl, prefixRootUrls } from "./lib/site-url.js";
import { buildCrumbs, renderBreadcrumbNav, renderJsonLd } from "./lib/structured-data.js";
import { formatValidationErrors, validatePostsDir } from "./lib/validate-posts.js";

const pathPrefix = pathPrefixFromSiteUrl(site.url);
const includeDrafts = process.env.ELEVENTY_ENV === "development";

function pageContext(bound) {
  const data = bound?.ctx ?? bound ?? {};
  return { ...data, page: bound?.page || data.page };
}

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy({ CNAME: "CNAME" });
  eleventyConfig.addWatchTarget("src/assets");

  eleventyConfig.addFilter("displayDate", formatDisplayDate);
  eleventyConfig.addFilter("isoDate", toIso);
  eleventyConfig.addFilter("rfc822", toRfc822);
  eleventyConfig.addFilter("isFreshNews", (value) => isFreshNews(value));
  eleventyConfig.addFilter("freshNewsPosts", (posts) => freshNewsPosts(posts));
  eleventyConfig.addShortcode("newsSitemap", function (posts) {
    return renderNewsSitemap({ posts, site });
  });
  eleventyConfig.addFilter("absoluteUrl", (pageUrl) => absoluteUrl(site.url, pageUrl || "/"));
  eleventyConfig.addFilter("limit", (items, count) => (items || []).slice(0, count));
  eleventyConfig.addFilter("whereCategory", (posts, name) =>
    (posts || []).filter((post) => post.data.category === name),
  );
  eleventyConfig.addFilter("whereTag", (posts, tag) =>
    (posts || []).filter((post) => (post.data.tags || []).includes(tag)),
  );
  eleventyConfig.addFilter("categorySlug", (name) => {
    const desk = site.categories.find((category) => category.name === name);
    return desk?.slug || "";
  });
  eleventyConfig.addFilter("safeHttpUrl", (value) => {
    const url = String(value ?? "").trim();
    return /^https?:\/\/\S+$/i.test(url) ? url : "";
  });
  eleventyConfig.addFilter("isPlaceholderEmail", (email) => {
    const value = String(email ?? "").toLowerCase();
    return value.endsWith("@example.com") || value.endsWith("@example.org");
  });
  eleventyConfig.addFilter("pageTitle", function (title) {
    const pageUrl = this.page?.url || "/";
    if (pageUrl === pathPrefix) return `${site.name} — ${site.tagline}`;
    return `${title || site.name} — ${site.name}`;
  });
  eleventyConfig.addFilter("metaDescription", (summary) =>
    String(summary || site.description).replace(/\s+/g, " ").trim(),
  );

  eleventyConfig.addShortcode("structuredData", function () {
    return renderJsonLd(pageContext(this), site);
  });
  eleventyConfig.addShortcode("breadcrumbNav", function () {
    return renderBreadcrumbNav(buildCrumbs(pageContext(this), site));
  });

  eleventyConfig.addCollection("posts", (api) =>
    api
      .getFilteredByGlob("src/content/posts/**/*.md")
      .filter((post) => includeDrafts || post.data.draft !== true)
      .sort((a, b) => b.date - a.date),
  );
  eleventyConfig.addCollection("publishedPosts", (api) =>
    api
      .getFilteredByGlob("src/content/posts/**/*.md")
      .filter((post) => post.data.draft !== true)
      .sort((a, b) => b.date - a.date),
  );
  eleventyConfig.addCollection("publicTagList", (api) => {
    const tags = new Set();
    for (const post of api.getFilteredByGlob("src/content/posts/**/*.md")) {
      if (post.data.draft === true) continue;
      for (const tag of post.data.tags || []) {
        if (typeof tag === "string" && tag.trim() && tag !== "post") tags.add(tag.trim());
      }
    }
    return [...tags].sort((a, b) => a.localeCompare(b, "en"));
  });

  eleventyConfig.addTransform("prefix-root-urls", (content, outputPath) => {
    if (!outputPath || !outputPath.endsWith(".html")) return content;
    return prefixRootUrls(content, pathPrefix);
  });

  eleventyConfig.on("eleventy.before", () => {
    const expectedHost = new URL(site.url).hostname;
    const cname = fs.readFileSync("CNAME", "utf8").trim();
    if (cname !== expectedHost) {
      throw new Error(`CNAME must contain ${expectedHost} so it matches site.url. Found: ${cname}`);
    }
    const dir = process.env.POSTS_DIR || "src/content/posts";
    const result = validatePostsDir(dir);
    if (!result.ok) {
      throw new Error(`Published articles failed the sources check:\n${formatValidationErrors(result)}`);
    }
    for (const warning of result.warnings) console.warn(`Source check warning: ${warning}`);
  });

  return {
    pathPrefix,
    markdownTemplateEngine: false,
    htmlTemplateEngine: "njk",
    templateFormats: ["md", "njk", "html", "11ty.js"],
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
  };
}
