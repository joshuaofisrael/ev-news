import { normalizeSiteUrl } from "../../lib/site-url.js";

const site = {
  name: "EV News Desk",
  tagline: "Sourced reporting on electric vehicles.",
  brandLine: "One sourced story a day on the electric-vehicle beat.",
  description:
    "EV News Desk is a daily electric-vehicle desk covering cars, batteries, charging, policy, and industry. It is owned and operated by Joshua Israel Ventures LLC, a Florida limited liability company.",
  // Public origin, no trailing slash. The CNAME file must use this hostname.
  url: normalizeSiteUrl("https://evnewsdesk.com"),
  locale: "en_US",
  language: "en",
  author: "EV News Desk",
  operator: "Joshua Israel Ventures LLC",
  jurisdiction: "Florida",
  entityDescription: "a Florida limited liability company",
  contactEmail: "desk@example.com",
  // Activated FormSubmit alias for evnewsdesk.com. This keeps the inbox address out of the built pages.
  contactFormEndpoint: "https://formsubmit.co/4497ee41a1200e746e967998473d21da",
  indexNowKey: "e636da750714fc9967b0f4946b707533",
  // Cookieless Cloudflare Web Analytics. The base layout prints the beacon.
  cloudflareAnalyticsToken: "72a6ea1974794ada98ce78efa935c214",
  // Google AdSense publisher id. The head prints the loader and account meta. No ad units.
  adsenseClient: "ca-pub-5681559774142917",
  year: new Date().getUTCFullYear(),
  buildTime: new Date().toISOString(),
  crawlers: [
    "Googlebot",
    "Bingbot",
    "OAI-SearchBot",
    "GPTBot",
    "PerplexityBot",
    "ClaudeBot",
    "CCBot",
    "Google-Extended",
    "Applebot-Extended",
    "Bytespider",
  ],
  categories: [
    {
      name: "Cars",
      slug: "cars",
      description: "Models and product reporting, published only with a public source list.",
    },
    {
      name: "Batteries",
      slug: "batteries",
      description: "Cells, packs, materials, and the supply chain behind them.",
    },
    {
      name: "Charging",
      slug: "charging",
      description: "Home, workplace, and public charging, and the power that feeds them.",
    },
    {
      name: "Policy",
      slug: "policy",
      description: "Laws, incentives, standards, and regulation.",
    },
    {
      name: "Industry/Business",
      slug: "industry",
      description: "Companies, factories, capital, and the market around electric vehicles.",
    },
  ],
};

export default site;
