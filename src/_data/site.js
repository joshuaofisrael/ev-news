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
  // Real public profiles only. Tech Beat Daily is the network news account.
  sameAs: ["https://x.com/TheCharismaCat1"],
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
  // Google Analytics 4. Consent defaults to denied; the tag loads only after Accept.
  gaMeasurementId: "G-RMVS2GZM1G",
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
      seoTitle: "Electric car news",
      listTitle: "Electric car stories",
      photo: "cat-cars",
      photoAlt: "White electric crossover on a wet city street at dusk, headlights on, with no people or readable badges",
      description: "Launches, prices, deliveries, and range for electric cars. Each story links the public source for its figures.",
      hubIntro:
        "Electric car news: launches, prices, deliveries, and range. Every story on this desk links the public source for its figures.",
    },
    {
      name: "Batteries",
      slug: "batteries",
      seoTitle: "EV battery news",
      listTitle: "EV battery stories",
      photo: "cat-batteries",
      photoAlt: "Rows of prismatic battery cells and modules on a dark workbench, with no people or brand names",
      description: "Cells, packs, materials, and swap networks. Each battery story links the public source for its figures.",
      hubIntro:
        "EV battery news: cells, packs, materials, and swap networks. Every story on this desk links the public source for its figures.",
    },
    {
      name: "Charging",
      slug: "charging",
      seoTitle: "EV charging news",
      listTitle: "EV charging stories",
      photo: "cat-charging",
      photoAlt: "White electric crossover plugged into a curbside charger on a residential street, with no people in view",
      description: "Home, workplace, and public charging, including cost and speed. Each story links the source for its figures.",
      hubIntro:
        "EV charging news: home, workplace, and public charging, and the power that feeds them. Each story links the source for its figures.",
    },
    {
      name: "Policy",
      slug: "policy",
      seoTitle: "EV policy news",
      listTitle: "EV policy stories",
      photo: "cat-policy",
      photoAlt: "Close view of the United States Capitol dome against a clear blue sky",
      description: "Laws, incentives, standards, and regulation for electric vehicles. Each story links the public document it cites.",
      hubIntro:
        "EV policy news: laws, incentives, standards, and regulation. Each story links the public document or dataset it cites.",
    },
    {
      name: "Industry/Business",
      slug: "industry",
      seoTitle: "EV industry news",
      listTitle: "EV industry stories",
      photo: "cat-industry",
      photoAlt: "Robotic arms over a car chassis on an electric-vehicle assembly line, with no people in view",
      description: "Companies, factories, capital, and the market around electric vehicles. Each story links the filing or dataset behind the number.",
      hubIntro:
        "EV industry news: companies, factories, capital, and markets. Each story links the filing, release, or dataset behind the number.",
    },
  ],
};

export default site;
