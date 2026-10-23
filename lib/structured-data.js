import { absoluteUrl, pathPrefixFromSiteUrl } from "./site-url.js";
import { toIso } from "./dates.js";
import dashboard from "../src/_data/dashboard.js";

function sitePath(siteUrl, pathname) {
  const prefix = pathPrefixFromSiteUrl(siteUrl);
  const clean = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (prefix === "/") return clean;
  if (clean === prefix.slice(0, -1) || clean.startsWith(prefix)) return clean;
  return `${prefix.slice(0, -1)}${clean}`;
}

function publisherId(site) {
  return absoluteUrl(site.url, "/#publisher");
}

function newsroomId(site) {
  return absoluteUrl(site.url, "/#newsroom");
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildCrumbs(data, site) {
  const home = sitePath(site.url, "/");
  const pageUrl = data.page?.url || home;
  const crumbs = [{ name: "Home", url: home }];
  if (pageUrl === home) return crumbs;

  if (data.desk?.name && data.desk?.slug) {
    crumbs.push({
      name: data.desk.name,
      url: sitePath(site.url, `/category/${data.desk.slug}/`),
    });
    return crumbs;
  }

  if (data.kind === "article") {
    const desk = site.categories.find((category) => category.name === data.category);
    if (desk) {
      crumbs.push({
        name: desk.name,
        url: sitePath(site.url, `/category/${desk.slug}/`),
      });
    }
    crumbs.push({ name: data.title || "Story", url: pageUrl });
    return crumbs;
  }

  if (data.tag) {
    crumbs.push({ name: String(data.tag), url: pageUrl });
    return crumbs;
  }

  if (data.title) crumbs.push({ name: data.title, url: pageUrl });
  return crumbs;
}

export function renderBreadcrumbNav(crumbs) {
  if (!crumbs || crumbs.length < 2) return "";
  const items = crumbs
    .map((crumb, index) => {
      const name = escapeHtml(crumb.name);
      const last = index === crumbs.length - 1;
      if (last) return `<li aria-current="page">${name}</li>`;
      return `<li><a href="${escapeHtml(crumb.url)}">${name}</a> <span aria-hidden="true">/</span></li>`;
    })
    .join("");
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>${items}</ol></nav>`;
}

function logo(site) {
  return {
    "@type": "ImageObject",
    url: absoluteUrl(site.url, "/assets/logo.png"),
    width: 192,
    height: 192,
  };
}

export function buildGraph(data, site) {
  const pageUrl = absoluteUrl(site.url, data.page?.url || "/");
  const publisher = {
    "@type": "Organization",
    "@id": publisherId(site),
    name: site.operator,
    description: `${site.operator} is ${site.entityDescription}.`,
    url: absoluteUrl(site.url, "/"),
    address: {
      "@type": "PostalAddress",
      addressRegion: "FL",
      addressCountry: "US",
    },
    logo: logo(site),
  };

  if (!String(site.contactEmail).toLowerCase().endsWith("@example.com")) {
    publisher.contactPoint = {
      "@type": "ContactPoint",
      contactType: "editorial",
      email: site.contactEmail,
      availableLanguage: "English",
    };
  }

  const newsroom = {
    "@type": "NewsMediaOrganization",
    "@id": newsroomId(site),
    name: site.name,
    url: absoluteUrl(site.url, "/"),
    description: site.description,
    publishingPrinciples: absoluteUrl(site.url, "/sources-ethics/"),
    publisher,
    logo: logo(site),
  };

  const crumbs = buildCrumbs(data, site);
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(site.url, crumb.url),
    })),
  };

  const graph = [newsroom, publisher, breadcrumb];

  if (data.kind === "article") {
    const tags = Array.isArray(data.tags) ? data.tags.filter((tag) => tag && tag !== "post") : [];
    const article = {
      "@type": "NewsArticle",
      "@id": `${pageUrl}#article`,
      mainEntityOfPage: pageUrl,
      headline: data.title,
      description: data.summary,
      datePublished: toIso(data.page?.date || data.date),
      dateModified: toIso(data.updatedAt || data.updated || data.page?.date || data.date),
      articleSection: data.category,
      inLanguage: "en",
      isAccessibleForFree: true,
      author: {
        "@type": "Organization",
        name: site.author,
        url: absoluteUrl(site.url, "/about/"),
      },
      publisher,
      copyrightHolder: {
        "@type": "Organization",
        name: site.operator,
      },
      isPartOf: { "@id": newsroomId(site) },
    };
    if (tags.length) article.keywords = tags.join(", ");
    if (data.draft === true) article.creativeWorkStatus = "Draft";
    graph.push(article);
  }

  if (data.kind === "newsroom") {
    graph.push({
      "@type": "CollectionPage",
      "@id": `${pageUrl}#page`,
      name: data.title || "Newsroom dashboard",
      description: data.summary,
      url: pageUrl,
      inLanguage: "en",
      isAccessibleForFree: true,
      isPartOf: { "@id": newsroomId(site) },
      publisher: {
        "@type": "NewsMediaOrganization",
        name: site.name,
        url: absoluteUrl(site.url, "/"),
      },
    });
  }

  if (data.kind === "dashboard") {
    const sources = [...new Set(dashboard.figures.map((figure) => figure.sourceUrl))];
    graph.push({
      "@type": "Dataset",
      "@id": `${pageUrl}#dataset`,
      name: data.title || "EV data dashboard",
      description: data.summary,
      url: pageUrl,
      dateModified: toIso(dashboard.updated),
      creator: {
        "@type": "NewsMediaOrganization",
        name: site.name,
        url: absoluteUrl(site.url, "/"),
      },
      publisher: { "@id": newsroomId(site) },
      isAccessibleForFree: true,
      isBasedOn: sources,
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

export function renderJsonLd(data, site) {
  const json = JSON.stringify(buildGraph(data, site)).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}
