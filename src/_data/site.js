import { normalizeSiteUrl } from "../../lib/site-url.js";

const site = {
  name: "EV News Desk",
  tagline: "Sourced reporting on electric vehicles.",
  brandLine: "One sourced story a day on the electric-vehicle beat.",
  description:
    "EV News Desk is a daily electric-vehicle desk covering cars, batteries, charging, policy, and industry.",
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
  homePhoto: {
    src: "home-hero",
    alt: "White electric crossover in a bright showroom, seen from the front three-quarter angle, with a charging cable at the front wheel and no people in view",
  },
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
      photo: "cat-cars",
      photoAlt: "White electric crossover on a wet city street at dusk, headlights on, with no people or readable badges",
      description: "Models and product reporting, published only with a public source list.",
    },
    {
      name: "Batteries",
      slug: "batteries",
      photo: "cat-batteries",
      photoAlt: "Rows of prismatic battery cells and modules on a dark workbench, with no people or brand names",
      description: "Cells, packs, materials, and the supply chain behind them.",
    },
    {
      name: "Charging",
      slug: "charging",
      photo: "cat-charging",
      photoAlt: "White electric crossover plugged into a curbside charger on a residential street, with no people in view",
      description: "Home, workplace, and public charging, and the power that feeds them.",
    },
    {
      name: "Policy",
      slug: "policy",
      photo: "cat-policy",
      photoAlt: "Close view of the United States Capitol dome against a clear blue sky",
      description: "Laws, incentives, standards, and regulation.",
    },
    {
      name: "Industry/Business",
      slug: "industry",
      photo: "cat-industry",
      photoAlt: "Robotic arms over a car chassis on an electric-vehicle assembly line, with no people in view",
      description: "Companies, factories, capital, and the market around electric vehicles.",
    },
  ],
};

export default site;
