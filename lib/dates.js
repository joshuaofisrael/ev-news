export function coerceDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (value && typeof value === "object" && typeof value.toJSDate === "function") {
    const date = value.toJSDate();
    if (date instanceof Date && !Number.isNaN(date.getTime())) return date;
  }
  if (typeof value === "string" && value.trim()) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (match) {
      const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

export function toIso(value) {
  const date = coerceDate(value);
  return date ? date.toISOString() : "";
}

export function toW3cDate(value) {
  const iso = toIso(value);
  return iso ? iso.replace(/\.\d{3}Z$/, "Z") : "";
}

export function formatDisplayDate(value) {
  const date = coerceDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function toRfc822(value) {
  const date = coerceDate(value);
  return date ? date.toUTCString() : "";
}

export function isFreshNews(value, now = Date.now()) {
  const date = coerceDate(value);
  if (!date) return false;
  const age = now - date.getTime();
  return age >= 0 && age <= 2 * 24 * 60 * 60 * 1000;
}
