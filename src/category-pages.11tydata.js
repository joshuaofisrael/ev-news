export default {
  eleventyComputed: {
    title(data) {
      return data.desk?.name || "Topic";
    },
    summary(data) {
      return data.desk?.description || "";
    },
  },
};
