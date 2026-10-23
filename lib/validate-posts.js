import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import site from "../src/_data/site.js";
import { coerceDate } from "./dates.js";

const REQUIRED_SOURCE_FIELDS = ["title", "url", "publisher", "date"];

export function isDraft(value) {
  return value === true || value === "true" || value === "yes";
}

export function validateSourceList(sources) {
  const messages = [];
  if (!Array.isArray(sources) || sources.length === 0) {
    messages.push(
      "sources must be a non-empty list. Each entry needs title, url, publisher, and date.",
    );
    return messages;
  }

  sources.forEach((source, index) => {
    const label = `sources[${index}]`;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      messages.push(`${label} must be an object with title, url, publisher, and date.`);
      return;
    }
    for (const field of REQUIRED_SOURCE_FIELDS) {
      const value = source[field];
      if (value === undefined || value === null || String(value).trim() === "") {
        messages.push(`${label}.${field} is required.`);
      }
    }
    if (source.url && !/^https?:\/\/\S+$/i.test(String(source.url).trim())) {
      messages.push(`${label}.url must be an absolute http or https URL.`);
    }
    if (
      source.date !== undefined &&
      source.date !== null &&
      String(source.date).trim() !== "" &&
      !coerceDate(source.date)
    ) {
      messages.push(`${label}.date must be a valid date (YYYY-MM-DD).`);
    }
  });

  return messages;
}

export function validatePublishedPost(data) {
  const messages = [];
  if (!data || typeof data !== "object") return ["Front matter is missing."];

  for (const field of ["title", "date", "category", "summary"]) {
    const value = data[field];
    if (value === undefined || value === null || String(value).trim() === "") {
      messages.push(`${field} is required before a story can be published.`);
    }
  }
  if (data.date && !coerceDate(data.date)) {
    messages.push("date must be a valid date (YYYY-MM-DD).");
  }

  const allowed = site.categories.map((category) => category.name);
  if (data.category && !allowed.includes(data.category)) {
    messages.push(`category must be one of: ${allowed.join(", ")}.`);
  }

  messages.push(...validateSourceList(data.sources));
  messages.push(...validateEditorial(data));
  messages.push(...validateImages(data));

  if (data.tags !== undefined && data.tags !== null) {
    if (!Array.isArray(data.tags) || data.tags.some((tag) => typeof tag !== "string" || !tag.trim())) {
      messages.push("tags must be a list of strings when present.");
    }
  }

  return messages;
}

const AI_CAPTION = "AI-generated image";
const PIECE_LABELS = new Set(["opinion", "analysis", "speculation"]);
const DISCLAIMERS = new Set(["health", "legal", "financial"]);
const STOCK_HOST = /shutterstock|gettyimages|istockphoto|adobestock|depositphotos|alamy|dreamstime/i;

function validateEditorial(data) {
  const messages = [];
  if (data.updatedAt === undefined || data.updatedAt === null || String(data.updatedAt).trim() === "") {
    messages.push("updatedAt is required so the article can show Last updated and dateModified.");
  } else if (!coerceDate(data.updatedAt)) {
    messages.push("updatedAt must be a valid date (YYYY-MM-DD).");
  }

  if (data.opinion !== undefined && data.opinion !== null && typeof data.opinion !== "boolean") {
    messages.push("opinion must be true or false when set.");
  }
  const label = String(data.label ?? "").trim();
  if (label && !PIECE_LABELS.has(label)) {
    messages.push("label must be opinion, analysis, or speculation.");
  }
  const disclaimer = String(data.disclaimer ?? "").trim();
  if (disclaimer && !DISCLAIMERS.has(disclaimer)) {
    messages.push("disclaimer must be health, legal, or financial.");
  }
  return messages;
}

function validateAlt(alt, field) {
  const text = String(alt ?? "").trim();
  if (!text) return [`${field} is required.`];
  if (text.length < 20 || !text.includes(" ")) {
    return [`${field} must describe the picture in a full phrase.`];
  }
  if (text === AI_CAPTION) return [`${field} must describe the picture. The caption carries the AI disclosure.`];
  return [];
}

function validateAiImage(entry, field) {
  const messages = [];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    messages.push(`${field} must be an object with src, alt, caption, width, and height.`);
    return messages;
  }
  const src = String(entry.src ?? "").trim();
  if (!/^[a-z0-9-]+$/.test(src)) {
    messages.push(`${field}.src must be a local basename, not an external URL.`);
  }
  messages.push(...validateAlt(entry.alt, `${field}.alt`));
  if (String(entry.caption ?? "").trim() !== AI_CAPTION) {
    messages.push(`${field}.caption must be "${AI_CAPTION}".`);
  }
  const width = Number(entry.width);
  const height = Number(entry.height);
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
    messages.push(`${field}.width and ${field}.height must be positive integers.`);
  }
  return messages;
}

export function validateImages(data) {
  const messages = [];
  if (data.hero !== undefined && data.hero !== null) {
    messages.push(...validateAiImage(data.hero, "hero"));
  }
  if (data.images !== undefined && data.images !== null) {
    if (!Array.isArray(data.images)) {
      messages.push("images must be a list of AI-generated pictures.");
    } else {
      data.images.forEach((entry, index) => {
        messages.push(...validateAiImage(entry, `images[${index}]`));
      });
    }
  }

  const image = String(data.image ?? "").trim();
  if (!image) return messages;
  if (!/^[a-z0-9-]+$/.test(image)) {
    messages.push("image must be a local basename, not an external URL.");
  }
  messages.push(...validateAlt(data.imageAlt, "imageAlt"));
  for (const field of ["imageCaption", "imageCredit"]) {
    const value = data[field];
    if (value === undefined || value === null || String(value).trim() === "") {
      messages.push(`${field} is required when image is set.`);
    }
  }
  if (String(data.imageLicense ?? "").trim() !== "Fair use") {
    messages.push("imageLicense must be Fair use for a third-party press image.");
  }
  const width = Number(data.imageWidth);
  const height = Number(data.imageHeight);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 640 || height > 480) {
    messages.push("A fair-use press image must stay small: imageWidth <= 640 and imageHeight <= 480.");
  }
  const source = String(data.imageSource ?? "").trim();
  if (!/^https?:\/\/\S+$/i.test(source)) {
    messages.push("imageSource must be an absolute http or https URL for a press image.");
  } else if (STOCK_HOST.test(source)) {
    messages.push("imageSource must not be a stock-agency URL.");
  }
  return messages;
}

export function inlineCitationWarning(body) {
  if (!/\]\(\s*https?:\/\//i.test(body || "")) {
    return "No inline http(s) citation link found in the body. Link the phrase you are citing. See the README section “Inline citations”.";
  }
  return null;
}

export function validatePostsDir(dir) {
  const errors = [];
  const warnings = [];
  if (!fs.existsSync(dir)) {
    return {
      ok: false,
      errors: [{ file: dir, messages: ["Posts directory does not exist."] }],
      warnings,
    };
  }

  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_"))
    .sort();

  for (const name of files) {
    const file = path.join(dir, name);
    let parsed;
    try {
      parsed = matter(fs.readFileSync(file, "utf8"));
    } catch (error) {
      errors.push({ file, messages: [`Could not parse front matter: ${error.message}`] });
      continue;
    }

    if (parsed.data.sample === true && !isDraft(parsed.data.draft)) {
      errors.push({
        file,
        messages: [
          "This is a sample post and must stay unpublished (draft: true). Create a new Markdown file for a real story.",
        ],
      });
      continue;
    }
    if (isDraft(parsed.data.draft)) continue;

    const messages = validatePublishedPost(parsed.data);
    if (messages.length) {
      errors.push({ file, messages });
      continue;
    }
    const warning = inlineCitationWarning(parsed.content);
    if (warning) warnings.push(`${file}: ${warning}`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function formatValidationErrors(result) {
  return result.errors
    .map((entry) => `${entry.file}\n  - ${entry.messages.join("\n  - ")}`)
    .join("\n");
}
