import site from "./_data/site.js";

export default class {
  data() {
    return {
      permalink: `/${site.indexNowKey}.txt`,
      eleventyExcludeFromCollections: true,
      sitemapIgnore: true,
    };
  }

  render() {
    return site.indexNowKey;
  }
}
