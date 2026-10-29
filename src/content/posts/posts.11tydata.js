import site from "../../_data/site.js";
import { isFuturePublication } from "../../../lib/dates.js";
import { isHoldReview, isReleasedFile } from "../../../lib/legal-hold.js";
import { isDraft } from "../../../lib/validate-posts.js";

const includeDrafts = process.env.ELEVENTY_ENV === "development";

function withheld(data) {
  if (!isHoldReview(data.status)) return false;
  const input = data.page?.inputPath;
  if (!input || !isReleasedFile(input)) return true;
  return false;
}

function scheduledLater(data) {
  if (includeDrafts) return false;
  return isFuturePublication(data.publishAt);
}

export default {
  layout: "layouts/article.njk",
  kind: "article",
  eleventyComputed: {
    author() {
      return site.author;
    },
    permalink(data) {
      if ((isDraft(data.draft) && !includeDrafts) || scheduledLater(data) || withheld(data)) return false;
      const file = String(data.page.inputPath).split("/").pop().replace(/\.md$/, "");
      return `/articles/${file}/`;
    },
    eleventyExcludeFromCollections(data) {
      return (isDraft(data.draft) && !includeDrafts) || scheduledLater(data) || withheld(data);
    },
  },
};
