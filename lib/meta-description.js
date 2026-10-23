export const META_DESCRIPTION_LIMIT = 155;
const ELLIPSIS = "…";

export function metaDescription(summary, fallback = "", limit = META_DESCRIPTION_LIMIT) {
  const normalize = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
  const text = normalize(summary) || normalize(fallback);
  if (text.length <= limit) return text;
  const room = Math.max(0, limit - ELLIPSIS.length);
  const slice = text.slice(0, room);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trimEnd();
  return `${cut}${ELLIPSIS}`;
}
