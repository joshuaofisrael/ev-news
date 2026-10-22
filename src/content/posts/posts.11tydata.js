import site from "../../_data/site.js";
import { isDraft } from "../../../lib/validate-posts.js";

const includeDrafts = process.env.ELEVENTY_ENV === "development";

export default {
  layout: "layouts/article.njk",
  kind: "article",
  eleventyComputed: {
    author() {
      return site.author;
    },
    permalink(data) {
      if (isDraft(data.draft) && !includeDrafts) return false;
      const file = String(data.page.inputPath).split("/").pop().replace(/\.md$/, "");
      return `/articles/${file}/`;
    },
    eleventyExcludeFromCollections(data) {
      return isDraft(data.draft) && !includeDrafts;
    },
  },
};
