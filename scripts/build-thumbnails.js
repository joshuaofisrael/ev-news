// Regenerates the ~640x360 WebP homepage-card thumbnails derived from each
// article's hero photo. Run this after adding or replacing a hero image:
//
//   node scripts/build-thumbnails.js
//   node scripts/build-thumbnails.js --force   (rebuild existing thumbnails too)
//
// This is a maintenance script, not part of the automatic build. Thumbnail
// files are committed to the repository like the hero images they are
// derived from.
import { buildHeroThumbnails } from "../lib/thumbnails.js";

const force = process.argv.includes("--force");

const { built, skippedMissing } = await buildHeroThumbnails({ force });

if (built.length) {
  console.log(`Built ${built.length} thumbnail(s): ${built.join(", ")}`);
} else {
  console.log("No new thumbnails were needed.");
}
if (skippedMissing.length) {
  console.log(
    `Skipped ${skippedMissing.length} hero(es) with no source WebP file yet: ${skippedMissing.join(", ")}`,
  );
}
