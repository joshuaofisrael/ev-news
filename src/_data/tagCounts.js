import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { isHoldReview, isReleasedFile } from "../../lib/legal-hold.js";

const dir = path.resolve("src/content/posts");
const counts = {};

for (const name of fs.readdirSync(dir)) {
  if (!name.endsWith(".md")) continue;
  const data = matter(fs.readFileSync(path.join(dir, name), "utf8")).data;
  if (data.draft === true || data.sample === true) continue;
  if (isHoldReview(data.status) && !isReleasedFile(path.join(dir, name))) continue;
  for (const tag of data.tags || []) {
    if (typeof tag !== "string") continue;
    const key = tag.trim();
    if (!key || key === "post") continue;
    counts[key] = (counts[key] || 0) + 1;
  }
}

export default counts;
