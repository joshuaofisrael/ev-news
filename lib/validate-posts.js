import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import site from "../src/_data/site.js";
import { coerceDate } from "./dates.js";

const REQUIRED_SOURCE_FIELDS = ["title", "url", "publisher", "date"];
const IMAGE_LICENSES = new Set(["Original", "CC0", "CC-BY", "CC-BY-SA", "Fair use"]);
const STOCK_HOST = /shutterstock|gettyimages|istockphoto|adobestock|depositphotos|alamy|dreamstime/i;

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
  messages.push(...validateImageCredit(data));

  if (data.tags !== undefined && data.tags !== null) {
    if (!Array.isArray(data.tags) || data.tags.some((tag) => typeof tag !== "string" || !tag.trim())) {
      messages.push("tags must be a list of strings when present.");
    }
  }

  return messages;
}

export function validateImageCredit(data) {
  const image = String(data?.image ?? "").trim();
  if (!image) return [];
  const messages = [];
  if (!/^[a-z0-9-]+$/.test(image)) {
    messages.push("image must be a local basename such as cars, not an external URL.");
  } else {
    for (const ext of ["webp", "avif"]) {
      const file = path.join("src/assets/images", `${image}.${ext}`);
      if (!fs.existsSync(file)) messages.push(`missing ${file}.`);
    }
  }
  for (const field of ["imageAlt", "imageCaption", "imageCredit", "imageLicense"]) {
    const value = data[field];
    if (value === undefined || value === null || String(value).trim() === "") {
      messages.push(`${field} is required when image is set.`);
    }
  }
  const license = String(data.imageLicense ?? "").trim();
  if (license && !IMAGE_LICENSES.has(license)) {
    messages.push("imageLicense must be Original, CC0, CC-BY, CC-BY-SA, or Fair use.");
  }
  const width = Number(data.imageWidth);
  const height = Number(data.imageHeight);
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
    messages.push("imageWidth and imageHeight must be positive integers.");
  }
  const source = String(data.imageSource ?? "").trim();
  if (license !== "Original" && !/^https?:\/\/\S+$/i.test(source)) {
    messages.push("imageSource must be an absolute http or https URL unless the licence is Original.");
  } else if (source && !/^https?:\/\/\S+$/i.test(source)) {
    messages.push("imageSource must be an absolute http or https URL.");
  }
  if (STOCK_HOST.test(source)) {
    messages.push("imageSource must not be a stock-agency URL.");
  }
  if (license === "Fair use" && !(width <= 640 && height <= 480)) {
    messages.push("Fair use images must stay small: imageWidth <= 640 and imageHeight <= 480.");
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
