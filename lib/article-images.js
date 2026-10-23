const AI_CAPTION = "AI-generated illustration";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rootPath(pathPrefix, path) {
  if (!pathPrefix || pathPrefix === "/") return path;
  const base = pathPrefix.endsWith("/") ? pathPrefix.slice(0, -1) : pathPrefix;
  return `${base}${path}`;
}

export function renderAiFigure(image, pathPrefix = "/", { loading = "lazy", priority = false } = {}) {
  const name = escapeHtml(String(image?.src ?? "").trim());
  const alt = escapeHtml(image?.alt);
  const width = Number(image?.width) || 1200;
  const height = Number(image?.height) || 675;
  const caption = escapeHtml(String(image?.caption ?? AI_CAPTION).trim() || AI_CAPTION);
  const webp = rootPath(pathPrefix, `/assets/images/${name}.webp`);
  const avif = rootPath(pathPrefix, `/assets/images/${name}.avif`);
  const priorityAttr = priority ? ' fetchpriority="high"' : "";
  return `<figure class="story-figure story-figure-ai">
  <picture>
    <source srcset="${avif}" type="image/avif">
    <source srcset="${webp}" type="image/webp">
    <img src="${webp}" alt="${alt}" width="${width}" height="${height}" loading="${loading}" decoding="async"${priorityAttr}>
  </picture>
  <figcaption><span class="figure-caption">${caption}</span></figcaption>
</figure>`;
}

function paragraphCount(html) {
  return (String(html || "").match(/<\/p>/gi) || []).length;
}

function explicitAfter(image) {
  const raw = image?.after ?? image?.afterParagraph;
  if (raw === undefined || raw === null || String(raw).trim() === "") return null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : null;
}

export function placeBodyImages(images, paragraphTotal) {
  const placed = [];
  const automatic = [];
  (images || []).forEach((image, index) => {
    const after = explicitAfter(image);
    if (after) placed.push({ image, index, after });
    else automatic.push({ image, index });
  });
  if (!automatic.length || paragraphTotal < 1) {
    return placed.concat(automatic.map((item) => ({ ...item, after: null })));
  }
  const taken = new Set(placed.map((item) => item.after));
  const gap = Math.max(2, Math.floor(paragraphTotal / (automatic.length + 1)));
  let cursor = gap;
  for (const item of automatic) {
    while (taken.has(cursor) && cursor <= paragraphTotal) cursor += 1;
    if (cursor <= paragraphTotal) {
      placed.push({ ...item, after: cursor });
      taken.add(cursor);
      cursor += gap;
    } else {
      placed.push({ ...item, after: null });
    }
  }
  return placed;
}

export function insertBodyImages(html, images, pathPrefix = "/") {
  const list = Array.isArray(images) ? images : [];
  const source = String(html || "");
  if (!list.length) return source;
  const plan = placeBodyImages(list, paragraphCount(source));
  const chunks = source.split(/(<\/p>)/i);
  let paragraph = 0;
  let out = "";
  const used = new Set();
  for (const chunk of chunks) {
    out += chunk;
    if (!/^<\/p>$/i.test(chunk)) continue;
    paragraph += 1;
    for (const item of plan) {
      if (item.after !== paragraph) continue;
      out += renderAiFigure(item.image, pathPrefix);
      used.add(item.index);
    }
  }
  for (const item of plan) {
    if (used.has(item.index)) continue;
    out += renderAiFigure(item.image, pathPrefix);
  }
  return out;
}
