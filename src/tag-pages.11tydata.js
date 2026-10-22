export default {
  eleventyComputed: {
    title(data) {
      return data.tag || "Tag";
    },
    summary(data) {
      return data.tag ? `Published stories tagged ${data.tag}.` : "";
    },
  },
};
