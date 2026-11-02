import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export const THUMB_WIDTH = 640;
export const THUMB_HEIGHT = 360;
const IMAGES_DIR = "src/assets/images";
const THUMB_DIR = path.join(IMAGES_DIR, "thumbs");
const NAME_RE = /^[a-z0-9-]+$/;

export function heroThumbSrc(src) {
  const name = String(src ?? "").trim();
  return NAME_RE.test(name) ? `${name}-640` : "";
}

export function heroThumbPath(src) {
  const thumb = heroThumbSrc(src);
  return thumb ? path.join(THUMB_DIR, `${thumb}.webp`) : "";
}

export function heroThumbReady(src) {
  const file = heroThumbPath(src);
  return Boolean(file) && fs.existsSync(file);
}

export function heroSourcePath(src) {
  const name = String(src ?? "").trim();
  return NAME_RE.test(name) ? path.join(IMAGES_DIR, `${name}.webp`) : "";
}

// Every unique hero image basename referenced by a post's front matter,
// regardless of draft or publish status, so a thumbnail is ready before
// a story goes live.
export function heroSlugs(postsDir = "src/content/posts") {
  const slugs = new Set();
  if (!fs.existsSync(postsDir)) return [];
  for (const file of fs.readdirSync(postsDir)) {
    if (!file.endsWith(".md")) continue;
    const { data } = matter(fs.readFileSync(path.join(postsDir, file), "utf8"));
    const src = data?.hero?.src;
    if (typeof src === "string" && NAME_RE.test(src.trim())) slugs.add(src.trim());
  }
  return [...slugs].sort((a, b) => a.localeCompare(b));
}

// Resizes each hero photo to a ~640x360 WebP thumbnail for card-style
// listings (the homepage, for instance). Source images are already WebP,
// so only a resize/recompress happens here, not a format conversion from
// an original master. Skips a slug whose source file is missing, and skips
// one whose thumbnail already exists unless `force` is set.
export async function buildHeroThumbnails({ postsDir = "src/content/posts", force = false } = {}) {
  const { default: sharp } = await import("sharp");
  fs.mkdirSync(THUMB_DIR, { recursive: true });
  const built = [];
  const skippedMissing = [];
  for (const src of heroSlugs(postsDir)) {
    const sourceFile = heroSourcePath(src);
    if (!fs.existsSync(sourceFile)) {
      skippedMissing.push(src);
      continue;
    }
    const outFile = heroThumbPath(src);
    if (!force && fs.existsSync(outFile)) continue;
    await sharp(sourceFile)
      .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: "cover", position: "centre" })
      .webp({ quality: 78 })
      .toFile(outFile);
    built.push(src);
  }
  return { built, skippedMissing };
}
