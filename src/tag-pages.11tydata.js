import tagCounts from "./_data/tagCounts.js";

// Tag pages reuse one generated line of intro text. A page with one or two
// stories is thin: noindex,follow, and left out of the sitemap. Three or more
// stay indexable. Topic hubs are separate pages with their own introductions.
function isThinTag(data) {
  return (tagCounts[data.tag] || 0) < 3;
}

export default {
  eleventyComputed: {
    title(data) {
      return data.tag || "Tag";
    },
    summary(data) {
      return data.tag ? `Published stories tagged ${data.tag}.` : "";
    },
    thin: isThinTag,
    sitemapIgnore: isThinTag,
  },
};
