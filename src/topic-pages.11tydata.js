export default {
  eleventyComputed: {
    title(data) {
      return data.desk?.name || "Topic";
    },
    seoTitle(data) {
      return data.desk?.seoTitle || data.desk?.name || "Topic";
    },
    summary(data) {
      return data.desk?.hubIntro || "";
    },
    updatedAt() {
      return "2026-10-27";
    },
  },
};
