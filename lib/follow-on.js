import { coerceDate } from "./dates.js";

// Broad topic tags. A later story that shares only these is related coverage,
// not a sequel. A rarer tag outside this list (a model, a company, a programme)
// is what marks "what happened next".
const TOPIC_TAGS = new Set([
  "autonomous",
  "autonomous-driving",
  "autonomous-vehicles",
  "batteries",
  "battery",
  "charging",
  "china",
  "dc-fast-charging",
  "driver-assistance",
  "earnings",
  "europe",
  "ev-sales",
  "explainer",
  "germany",
  "level-2",
  "manufacturing",
  "nacs",
  "policy",
  "post",
  "pricing",
  "production",
  "range",
  "recall",
  "regulation",
  "robotaxi",
  "sales",
  "trucks",
  "uk",
]);

const SEQUEL_MAX_DOCS = 4;

// A shared carmaker name on its own is not a reason to link. Two Tesla stories
// still match when they also share a model, a programme, or a topic tag.
const MAKER_TAGS = new Set([
  "audi",
  "bmw",
  "byd",
  "ford",
  "geely",
  "gm",
  "honda",
  "hyundai",
  "kia",
  "nio",
  "nissan",
  "polestar",
  "porsche",
  "rivian",
  "tesla",
  "toyota",
  "volkswagen",
  "volvo",
  "xpeng",
]);

function publishMs(post) {
  const raw = post?.data?.publishAt || post?.data?.date || post?.date;
  const when = coerceDate(raw);
  return when ? when.getTime() : 0;
}

export function normaliseTag(tag) {
  return String(tag ?? "")
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function specificTags(post) {
  return [...new Set((post?.data?.tags || []).map(normaliseTag).filter((tag) => tag && tag !== "explainer" && tag !== "post"))];
}

export function isExplainer(post) {
  if (post?.data?.news === false) return true;
  return (post?.data?.tags || []).some((tag) => normaliseTag(tag) === "explainer");
}

function eligible(post) {
  return Boolean(post?.url) && post?.data?.draft !== true && post?.data?.sample !== true;
}

// Charging and battery explainers are the reference pages for those desks.
// Other desks only pick up an explainer when a specific tag overlaps.
function deskExplainer(current, candidate) {
  if (!isExplainer(candidate)) return false;
  const desk = current?.data?.category;
  if (desk !== "Charging" && desk !== "Batteries") return false;
  return candidate?.data?.category === desk;
}

export function selectFollowOn(posts, currentUrl, limit = 4) {
  const list = (posts || []).filter(eligible);
  const current = list.find((post) => post.url === currentUrl);
  const cap = Math.max(0, Number(limit) || 0);
  if (!current || cap < 1) return { items: [], heading: "" };

  const currentTags = new Set(specificTags(current));
  const currentMs = publishMs(current);
  const frequency = new Map();
  for (const post of list) {
    for (const tag of specificTags(post)) frequency.set(tag, (frequency.get(tag) || 0) + 1);
  }
  const weight = (tag) => 1 / (frequency.get(tag) || 1);

  const ranked = [];
  for (const post of list) {
    if (post.url === currentUrl) continue;
    const tags = specificTags(post);
    const shared = tags.filter((tag) => currentTags.has(tag));
    const reference = deskExplainer(current, post);
    const topical = shared.some((tag) => !MAKER_TAGS.has(tag));
    if (!topical && !reference) continue;
    const later = publishMs(post) > currentMs;
    const sequel = shared.some((tag) => !TOPIC_TAGS.has(tag) && (frequency.get(tag) || 0) <= SEQUEL_MAX_DOCS);
    const role = !isExplainer(post) && later && sequel ? "next" : "background";
    const score = shared.reduce((sum, tag) => sum + weight(tag), 0) + (reference ? 0.2 : 0);
    ranked.push({ post, role, score });
  }

  ranked.sort((a, b) => b.score - a.score || publishMs(b.post) - publishMs(a.post) || String(a.post.url).localeCompare(String(b.post.url)));

  const picked = [];
  const seen = new Set();
  function take(predicate, max) {
    let count = 0;
    for (const item of ranked) {
      if (picked.length >= cap || count >= max) return;
      if (seen.has(item.post.url) || !predicate(item)) continue;
      seen.add(item.post.url);
      picked.push({ post: item.post, role: item.role });
      count += 1;
    }
  }

  take((item) => item.role === "next", 2);
  take((item) => item.role === "background" && isExplainer(item.post), 2);
  take(() => true, cap);

  const items = picked.slice(0, cap);
  const hasNext = items.some((item) => item.role === "next");
  const hasBackground = items.some((item) => item.role === "background");
  let heading = "";
  if (hasNext && hasBackground) heading = "Background and what happened next";
  else if (hasNext) heading = "What happened next";
  else if (hasBackground) heading = "Background";

  return { items, heading };
}

// Drops a rendered follow-on block into the middle of the article, after a
// content paragraph, leaving at least one paragraph after it when the story
// is long enough to have a middle.
export function insertFollowOn(html, block) {
  const snippet = String(block ?? "").trim();
  const source = String(html ?? "");
  if (!snippet) return source;
  const matches = [...source.matchAll(/<\/p>/gi)];
  if (matches.length < 2) return source;
  const index =
    matches.length === 2
      ? 0
      : Math.min(matches.length - 2, Math.max(2, Math.floor(matches.length / 2) - 1));
  const target = matches[index];
  const at = target.index + target[0].length;
  return `${source.slice(0, at)}${snippet}${source.slice(at)}`;
}
