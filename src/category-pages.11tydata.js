export default {
  eleventyComputed: {
    title(data) {
      return data.desk?.name || "Topic";
    },
    seoTitle(data) {
      return data.desk?.listTitle || data.desk?.name || "Topic";
    },
    summary(data) {
      return data.desk?.description || "";
    },
    updatedAt() {
      return "2026-10-27";
    },
  },
};
