// Local tool. `npm install --no-save sharp`, then `node scripts/rasterize-images.js`.
// Sharp is not a site dependency and the site build does not run this file.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const names = ["hero", "cars", "batteries", "charging", "policy", "industry", "fallback"];
const directory = path.resolve("src/assets/images");

for (const name of names) {
  const svg = fs.readFileSync(path.join(directory, `${name}.svg`));
  const image = sharp(svg, { density: 144 }).resize(1200, 675);
  await image.clone().webp({ quality: 62 }).toFile(path.join(directory, `${name}.webp`));
  await image.clone().avif({ quality: 36 }).toFile(path.join(directory, `${name}.avif`));
  const webp = fs.statSync(path.join(directory, `${name}.webp`)).size;
  const avif = fs.statSync(path.join(directory, `${name}.avif`)).size;
  console.log(`${name}: webp ${webp} bytes, avif ${avif} bytes`);
}
